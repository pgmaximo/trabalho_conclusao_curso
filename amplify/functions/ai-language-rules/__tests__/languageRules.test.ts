import { checkLanguageRules } from '../languageRules';

const clinica = { questionKind: 'clinica' as const };

/**
 * `temOrigem` diz que a resposta trouxe de onde os numeros dela sairam. Ele
 * aparece em todo texto abaixo que reporta valor de exame, porque em producao
 * uma resposta assim vem com citacao -- deixa-lo de fora aqui pediria a R4 que
 * aprovasse valor sem origem, que e o defeito que ela existe para barrar.
 */
const clinicaComOrigem = { questionKind: 'clinica' as const, temOrigem: true };

describe('checkLanguageRules -- esqueleto', () => {
  it('aprova um texto que respeita as cinco regras', () => {
    const texto =
      'Seu registro de março mostra 32,5 ng/mL, e o de setembro mostra 41 ng/mL. Vale levar os dois exames ao seu médico para ele avaliar o quadro.';
    expect(checkLanguageRules(texto, clinicaComOrigem)).toEqual({ ok: true });
  });

  it('NUNCA altera o texto recebido', () => {
    // Consertar o texto do modelo por cima produziria uma frase que nenhum
    // humano escreveu e nenhum modelo escreveu, sobre a saude de alguem.
    const texto = 'Tome 500 mg de paracetamol.';
    const copia = texto;
    checkLanguageRules(texto, clinica);
    expect(texto).toBe(copia);
  });

  it('cada violacao identifica regra, motivo em portugues e o trecho', () => {
    const resultado = checkLanguageRules('Tome 500 mg de paracetamol.', clinica);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    const v = resultado.violations[0];
    expect(v.rule).toMatch(/^R[1-5]$/);
    expect(v.reason.length).toBeGreaterThan(10);
    expect('Tome 500 mg de paracetamol.').toContain(v.excerpt);
  });

  it('nunca lanca, nem com entrada degenerada', () => {
    expect(() => checkLanguageRules('', clinica)).not.toThrow();
    expect(() => checkLanguageRules(null as never, clinica)).not.toThrow();
    expect(() => checkLanguageRules('a'.repeat(200_000), clinica)).not.toThrow();
  });

  it('texto vazio e reprovado pela R5, e nao de raspao por outra regra', () => {
    // Resposta vazia e uma falha de geracao, nao uma resposta limpa.
    //
    // A assercao nomeia a R5 de proposito. So `ok: false` nao pinava nada: com o
    // ramo de texto vazio removido, a R2 reprovava o vazio por falta de
    // encaminhamento e o teste continuava verde -- passava pelo motivo errado.
    const r = checkLanguageRules('', clinica);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.violations.map((v) => v.rule)).toEqual(['R5']);
  });
});

// A raiz e montada, nunca escrita: este projeto nao escreve o termo vetado
// nem para testa-lo. Mesma tecnica do arquivo de producao, e pelo mesmo
// motivo -- um repositorio que proibe uma palavra e a repete em vinte
// arquivos nao esta proibindo coisa nenhuma.
const RAIZ = ['fi', 'na', 'l'].join('');

describe('R1 -- o termo vetado', () => {
  it.each([
    `Essa e a conclusao ${RAIZ}.`,
    `Os resultados ${RAIZ}es chegaram.`,
    `Vamos ${RAIZ}izar a analise.`,
    `A ${RAIZ}idade do exame e acompanhar.`,
  ])('reprova a derivacao em %s', (texto) => {
    const r = checkLanguageRules(texto, clinica);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.violations.some((v) => v.rule === 'R1')).toBe(true);
  });

  it('reprova independente de caixa e de acento', () => {
    expect(checkLanguageRules(RAIZ.toUpperCase() + 'IZAR', clinica).ok).toBe(false);
  });

  it('NAO reprova palavra que so contem a raiz por acaso', () => {
    // Falso positivo conhecido e fixado por teste: sem esta linha, a regra
    // cresceria para pegar qualquer coisa e ninguem saberia onde ela para.
    const r = checkLanguageRules('O exame foi feito na clínica do bairro.', clinica);
    if (!r.ok) expect(r.violations.every((v) => v.rule !== 'R1')).toBe(true);
  });

  it('o trecho devolvido e uma substring literal do texto', () => {
    const texto = `Uma leitura ${RAIZ} do quadro.`;
    const r = checkLanguageRules(texto, clinica);
    if (!r.ok) expect(texto).toContain(r.violations.find((v) => v.rule === 'R1')?.excerpt);
  });
});

describe('R3 -- sugestao pequena, nunca determinada', () => {
  it.each([
    'Tome 500 mg de paracetamol antes de dormir.',
    'Use 2 comprimidos ao dia.',
    'Tomar 1 cápsula de 8 em 8 horas.',
    'Você deveria aumentar a dose do seu remédio para pressão.',
    'Pare de tomar esse medicamento.',
    'Suspenda o anticoagulante por três dias.',
  ])('reprova posologia em %s', (texto) => {
    const r = checkLanguageRules(texto, clinica);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.violations.some((v) => v.rule === 'R3')).toBe(true);
  });

  it.each([
    'Você tem anemia.',
    'Isso é um sinal claro de diabetes.',
    'Seus dados mostram que você está com arritmia.',
    'Você provavelmente tem hipotireoidismo.',
  ])('reprova diagnostico fechado em %s', (texto) => {
    expect(checkLanguageRules(texto, clinica).ok).toBe(false);
  });

  it.each([
    'Não é nada grave.',
    'Pode ficar tranquilo, não é preocupante.',
    'Não precisa procurar médico por causa disso.',
  ])('reprova o descarte de gravidade em %s', (texto) => {
    // Descartar urgencia e tao categorico quanto afirma-la, e e mais
    // perigoso: quem ouve "nao e nada" nao procura ninguem.
    expect(checkLanguageRules(texto, clinica).ok).toBe(false);
  });

  it.each([
    'Beber água ao longo do dia costuma ajudar no geral.',
    'Anotar quando o sintoma aparece ajuda o médico a entender o padrão.',
    'Vale levar este exame na próxima consulta.',
    'Dormir em horários mais regulares costuma fazer diferença para muita gente.',
  ])('APROVA a sugestao pequena em %s', (texto) => {
    // Este bloco e tao importante quanto os de cima: sem ele, a verificacao
    // poderia barrar tudo e ninguem notaria que ela ficou inutil.
    const r = checkLanguageRules(`${texto} Converse com seu médico sobre isso.`, clinica);
    expect(r.ok).toBe(true);
  });

  it('numero com unidade de exame nao e posologia', () => {
    const r = checkLanguageRules(
      'Seu resultado de março foi 32,5 ng/mL. Leve ao seu médico.',
      clinicaComOrigem,
    );
    expect(r.ok).toBe(true);
  });
});

const operacional = { questionKind: 'operacional' as const };

describe('R2 -- encaminhamento a um profissional de saude', () => {
  it('reprova pergunta CLINICA sem encaminhamento', () => {
    const r = checkLanguageRules(
      'Seu registro de março mostra 32,5 ng/mL e o de setembro, 41 ng/mL.',
      clinica,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.violations.some((v) => v.rule === 'R2')).toBe(true);
  });

  it('aprova pergunta CLINICA com encaminhamento no corpo', () => {
    const r = checkLanguageRules(
      'Seu registro de março mostra 32,5 ng/mL. Vale levar os dois exames ao endocrinologista na próxima consulta.',
      clinicaComOrigem,
    );
    expect(r.ok).toBe(true);
  });

  it('APROVA pergunta OPERACIONAL sem encaminhamento', () => {
    // O aviso permanente da tela ja cumpre o papel. Forcar a frase aqui vira
    // ruido, e ruido ensina a pessoa a nao ler o aviso quando ele importa.
    const r = checkLanguageRules(
      'Sua próxima consulta está marcada para 24 de outubro, às 14h.',
      operacional,
    );
    expect(r.ok).toBe(true);
  });

  it.each([
    'Converse com seu médico sobre isso.',
    'Vale levar este exame ao seu clínico geral.',
    'Procure um profissional de saúde para avaliar o quadro.',
    'Leve essas perguntas ao endocrinologista.',
  ])('reconhece o encaminhamento em %s', (frase) => {
    expect(
      checkLanguageRules(`Seu resultado de março foi 32,5 ng/mL. ${frase}`, clinicaComOrigem).ok,
    ).toBe(true);
  });
});

/**
 * A R4 no sentido da OMISSAO: a resposta traz um valor de exame e NAO traz
 * citacao nenhuma.
 *
 * O outro sentido -- citacao que aponta para uma linha que nenhuma tool
 * devolveu -- e conferido em `verificacao.ts`, e continua la: depende de saber
 * o que as tools devolveram, e este modulo nao sabe. O que e verificavel so
 * com o texto mora aqui.
 */
const semOrigem = { questionKind: 'clinica' as const, temOrigem: false };
const comOrigem = { questionKind: 'clinica' as const, temOrigem: true };

const MEDIDAS_DE_EXAME = [
  'Sua vitamina D está em 41 ng/mL. Leve o exame ao seu médico.',
  'Sua hemoglobina foi 12,1 g/dL. Converse com seu médico.',
  'Sua glicose de março foi 105 mg/dL. Vale levar ao seu clínico geral.',
  'Seu TSH está em 2,3 mUI/L. Leve ao endocrinologista.',
  'Sua hemoglobina glicada foi 5,4%. Converse com seu médico.',
  'Seu VHS foi 12 mm/h. Leve ao seu médico.',
  'Seu TSH está em 3,1 µUI/mL. Leve ao seu médico.',
  'Seus leucócitos estão em 5.400/mm3. Converse com seu médico.',
  // O expoente sai do papel como "3" e como "³", e a unidade escrita por
  // extenso traz acento no meio -- as duas formas precisam ser alcancadas.
  'Seus leucócitos estão em 5.400/mm³. Converse com seu médico.',
  'Suas hemácias estão em 4,8 milhões/mm³. Converse com seu médico.',
  'Sua creatinina foi 0,9 mg/dL. Vale levar ao seu clínico geral.',
  'Sua TGO está em 28 U/L. Leve ao seu médico.',
];

describe('R4 -- nenhum numero sem origem', () => {
  it.each(MEDIDAS_DE_EXAME)('reprova o valor de exame sem citacao nenhuma em %s', (texto) => {
    const r = checkLanguageRules(texto, semOrigem);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.violations.some((v) => v.rule === 'R4')).toBe(true);
  });

  it.each(MEDIDAS_DE_EXAME)('APROVA exatamente o mesmo texto quando ha origem: %s', (texto) => {
    // Este bloco e tao importante quanto o de cima: sem ele, a R4 poderia
    // barrar todo numero e tornar a pergunta sobre exame irrespondivel, que e
    // o oposto do que a regra existe para garantir.
    expect(checkLanguageRules(texto, comOrigem)).toEqual({ ok: true });
  });

  it.each([
    'Sua consulta é dia 12 de março, às 14h.',
    'Você tem 3 vacinas pendentes.',
    'Tomo 2 comprimidos, segundo o seu registro.',
    'Há 4 exames registrados desde 2025.',
    'Sua próxima consulta está marcada para 24 de outubro, às 14h.',
    'Você tem 2 medicamentos com horário às 8h.',
  ])('NAO reprova por R4 o numero comum em %s', (texto) => {
    // Digito nao e medida. Estes textos tem numero e nenhum deles e valor de
    // exame -- reprovar aqui seria o falso positivo que quebraria a conversa
    // inteira. Alguns disparam outras regras, e isso nao esta em julgamento:
    // a assercao e so sobre a R4.
    const r = checkLanguageRules(texto, semOrigem);
    if (!r.ok) expect(r.violations.some((v) => v.rule === 'R4')).toBe(false);
  });

  it('a ausencia do sinalizador e tratada como ausencia de origem', () => {
    // Na duvida, reprova -- o contrato do arquivo. Um chamador que esquecer de
    // ligar a origem recebe reprovacao, nunca aprovacao silenciosa, que era
    // exatamente o defeito que esta regra tinha.
    expect(checkLanguageRules('Sua vitamina D está em 41 ng/mL. Leve ao médico.', clinica).ok).toBe(
      false,
    );
  });

  it('a violacao identifica a regra, o motivo e o trecho literal', () => {
    const texto = 'Sua vitamina D está em 41 ng/mL. Leve ao médico.';
    const r = checkLanguageRules(texto, semOrigem);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const v = r.violations.find((x) => x.rule === 'R4');
    expect(v).toBeDefined();
    expect(v!.reason.length).toBeGreaterThan(10);
    expect(texto).toContain(v!.excerpt);
  });

  it('o motivo fala da REGRA, nunca do numero que apareceu', () => {
    // O bilhete da segunda geracao sai deste campo. "Nao escreva 41 ng/mL"
    // ensinaria o modelo a escrever "quarenta e um".
    const r = checkLanguageRules('Sua vitamina D está em 41 ng/mL. Leve ao médico.', semOrigem);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const v = r.violations.find((x) => x.rule === 'R4')!;
    expect(v.reason).not.toMatch(/41/);
    expect(v.reason).not.toMatch(/ng\/mL/i);
    expect(v.reason).toMatch(/origem|ferramenta/i);
  });

  it('uma violacao de R4 por resposta, e nao um inventario', () => {
    const r = checkLanguageRules(
      'Foram 41 ng/mL em março, 12,1 g/dL em junho e 105 mg/dL em setembro. Leve ao médico.',
      semOrigem,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.violations.filter((v) => v.rule === 'R4')).toHaveLength(1);
  });

  it('APROXIMACAO DECLARADA: a porcentagem sem origem reprova, mesmo nao sendo exame', () => {
    // O alcance da `%` e o mais largo da lista, e este teste registra o custo em
    // vez de deixa-lo ser descoberto em producao. Deixar a `%` fora abriria a
    // maior lacuna -- hemoglobina glicada, hematocrito e saturacao sao todos `%`.
    // Este e o lado certo do erro: a reprovacao custa uma nova geracao, e uma
    // porcentagem que o modelo calculou e o numero que a R4 descreve.
    const r = checkLanguageRules('Estão 100% das vacinas em dia.', {
      questionKind: 'operacional',
      temOrigem: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.violations.map((v) => v.rule)).toEqual(['R4']);
  });

  it('a R4 vale tambem na pergunta operacional', () => {
    // Um valor de exame sem origem e inventado em qualquer tipo de pergunta. A
    // dispensa da pergunta operacional e da R2, e nao desta.
    const r = checkLanguageRules('Seu último exame deu 41 ng/mL.', {
      questionKind: 'operacional',
      temOrigem: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.violations.some((v) => v.rule === 'R4')).toBe(true);
  });
});
