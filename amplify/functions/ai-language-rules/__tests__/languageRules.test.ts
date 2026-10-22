import { checkLanguageRules, temMedidaDeExame, valoresDeRemedioNoTexto } from '../languageRules';

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

/**
 * O reconhecedor de medida, exposto para ser REUSADO.
 *
 * Ele ja existia dentro da R4 e nao tinha nome publico. A EPIC "conversa sobre
 * o exame" (U2) precisa exatamente dele: a classificacao clinica passa a olhar
 * o que a RESPOSTA diz, e nao qual ferramenta rodou.
 *
 * Escrever um segundo reconhecedor divergiria do primeiro em silencio, e a
 * divergencia apareceria como uma resposta com medida escapando da R2 enquanto
 * a R4 a reprova -- duas regras discordando sobre o mesmo texto.
 */
describe('temMedidaDeExame', () => {
  it('reconhece medida de exame em prosa', () => {
    expect(temMedidaDeExame('sua vitamina D foi 27,92 ng/mL')).toBe(true);
    expect(temMedidaDeExame('a glicose deu 86 mg/dL')).toBe(true);
    expect(temMedidaDeExame('o TSH ficou em 2,1 mUI/L')).toBe(true);
  });

  it('reconhece o sinal de micro em qualquer das tres grafias', () => {
    expect(temMedidaDeExame('ferritina de 120 µg/L')).toBe(true);
    expect(temMedidaDeExame('ferritina de 120 μg/L')).toBe(true);
    expect(temMedidaDeExame('ferritina de 120 ug/L')).toBe(true);
  });

  it('nao ve medida onde ha so nome e data de documento', () => {
    // E o caso que motivou a U2: esta frase foi reprovada pela R2 em producao,
    // por a tool consultada estar na lista clinica -- nao pelo que ela diz.
    expect(temMedidaDeExame('Exame de sangue, de 18/09/2026.')).toBe(false);
    expect(temMedidaDeExame('Voce tem 1 documento guardado.')).toBe(false);
  });

  it('nao confunde dose de remedio com medida de exame', () => {
    // `mg` sozinho nao e concentracao. Quem cuida de dose e a R1, e confundir
    // as duas faria a R2 exigir encaminhamento por causa de uma posologia.
    expect(temMedidaDeExame('tome 500 mg')).toBe(false);
  });

  it('e imune ao estado do regex entre chamadas', () => {
    // O padrao interno tem a flag `g`, que carrega `lastIndex`. Sem zera-lo, a
    // segunda chamada com o mesmo texto devolveria falso.
    const frase = 'sua vitamina D foi 27,92 ng/mL';
    expect(temMedidaDeExame(frase)).toBe(true);
    expect(temMedidaDeExame(frase)).toBe(true);
    expect(temMedidaDeExame(frase)).toBe(true);
  });
});

/**
 * DUAS LACUNAS DA R3, achadas em 2026-09-19 ao executar a EPIC "conversa sobre
 * o exame" -- e a segunda foi achada porque um caso de teste MEU estava errado.
 *
 * U3b -- FALSO POSITIVO. O padrao de diagnostico e "voce tem" sem exigir objeto
 * nenhum, entao "Voce tem um exame de sangue guardado" e reprovado como se
 * fosse diagnostico. E a frase mais natural para responder "que exames eu
 * tenho", e a EPIC inteira depende de essa pergunta ter resposta.
 *
 * U3c -- BURACO. A definicao da R3 em `estudos-ia/01-estudos/regras-de-linguagem.md`
 * proibe "interpretacao categorica de resultado" com todas as letras. O
 * implementado cobre dose, posologia, intervalo, diagnostico nomeado e descarte
 * de gravidade -- e NAO cobre o julgamento do valor. "Seu exame esta alterado"
 * passava por R1, R2, R3 e R4 inteiras.
 *
 * E a mesma classe de defeito da R4 antes de 2026-09-18: a regra estava certa
 * no papel e verificada pela metade.
 */
function reprovaPorR3(texto: string): boolean {
  const r = checkLanguageRules(texto, { questionKind: 'operacional', temOrigem: true });
  return !r.ok && r.violations.some((v) => v.rule === 'R3');
}

describe('R3 — U3b: "você tem" precisa de objeto clínico', () => {
  it('nao reprova quando o objeto e coisa do aplicativo', () => {
    expect(reprovaPorR3('Você tem um exame de sangue guardado.')).toBe(false);
    expect(reprovaPorR3('Você tem 3 documentos guardados.')).toBe(false);
    expect(reprovaPorR3('Você tem uma consulta marcada para amanhã.')).toBe(false);
    expect(reprovaPorR3('Você tem uma receita registrada.')).toBe(false);
  });

  it('continua reprovando diagnostico -- e este e o teste que impede o afrouxamento', () => {
    expect(reprovaPorR3('Você tem diabetes.')).toBe(true);
    expect(reprovaPorR3('Você está com hipertensão.')).toBe(true);
    expect(reprovaPorR3('Você provavelmente tem anemia.')).toBe(true);
    expect(reprovaPorR3('Você tem um quadro de tireoidite.')).toBe(true);
  });

  it('inventario com advérbio ou com particípio tambem e inventario (Bloco 11)', () => {
    // As tres frases sao as que o modelo escreveu, literalmente, respondendo a
    // r1a em 2026-09-24 -- e as tres foram reprovadas nas DUAS geracoes, o que
    // entregou "indisponivel" a uma pergunta sobre o rodape do laudo. A medicao
    // da R1 foi o que as trouxe a tona.
    expect(reprovaPorR3('Você tem apenas um laudo guardado: o exame de sangue do laboratório.')).toBe(false);
    expect(reprovaPorR3('Se quiser, posso listar os laudos que você tem guardados no aplicativo.')).toBe(false);
    expect(reprovaPorR3('Deixa eu verificar quais laudos você tem guardados no aplicativo.')).toBe(false);
    expect(reprovaPorR3('Você tem só 2 exames registrados.')).toBe(false);
    expect(reprovaPorR3('Você ainda tem uma consulta marcada.')).toBe(false);
  });

  it('o advérbio NAO abre caminho para diagnostico', () => {
    expect(reprovaPorR3('Você tem apenas diabetes leve.')).toBe(true);
    expect(reprovaPorR3('Você tem só um quadro de anemia.')).toBe(true);
    expect(reprovaPorR3('Você tem apenas uma infecção.')).toBe(true);
  });
});

describe('R3 — U3c: interpretação categórica de resultado', () => {
  it('reprova julgamento sobre o valor', () => {
    expect(reprovaPorR3('Seu exame está alterado.')).toBe(true);
    expect(reprovaPorR3('Esse valor é normal.')).toBe(true);
    expect(reprovaPorR3('O resultado está preocupante.')).toBe(true);
    expect(reprovaPorR3('Seu colesterol está alto.')).toBe(true);
    expect(reprovaPorR3('Sua vitamina D melhorou.')).toBe(true);
    expect(reprovaPorR3('O quadro piorou.')).toBe(true);
  });

  it('nao reprova a RECUSA de julgar, que e a resposta certa', () => {
    expect(reprovaPorR3('Não posso dizer se está alterado.')).toBe(false);
    expect(reprovaPorR3('Não cabe a mim avaliar se o valor é normal.')).toBe(false);
    expect(reprovaPorR3('Não consigo dizer se melhorou.')).toBe(false);
  });

  it('nao reprova a frase que a R2 exige', () => {
    // O encaminhamento fala de "avaliar o que significa" sem julgar nada. Se
    // este caso falhar, a R3 passa a brigar com a R2.
    expect(reprovaPorR3('Leve seus exames ao seu médico para avaliar o que eles significam.')).toBe(
      false,
    );
  });
});

/**
 * R5 -- a regra que sobrou verificada pela metade.
 *
 * A auditoria de 2026-09-19 conferiu as cinco, uma a uma, e achou o mesmo
 * padrao das outras duas: a R5 esta escrita por inteiro em
 * `estudos-ia/01-estudos/regras-de-linguagem.md` ("o que voce nao sabe, voce
 * diz; sem acesso ao dado, nao invente resposta") e implementada so no pedaco
 * mais facil -- resposta VAZIA. Nao havia um `describe('R5')` no repositorio.
 *
 * O que da para verificar deterministicamente, e o que nao da:
 *   DA     -- as ferramentas disseram que nao ha dado, e a resposta nao
 *             reconhece a ausencia. Ou ela inventa, ou ela desconversa; as
 *             duas sao o que a R5 proibe.
 *   NAO DA -- "a resposta inventou" em geral. Numero inventado ja e pego pela
 *             R4 nos dois sentidos; o resto exigiria entender a prosa, e a
 *             camada 4 existe justamente por ser deterministica.
 *
 * `semDados` vem de QUEM CHAMA, como `questionKind` e `temOrigem`. Ele e uma
 * PRECONDICAO da regra, e nao uma desculpa: ausente significa "nao se aplica",
 * e nao "aprovado". Fazer o verificador inferir isso da prosa criaria a segunda
 * classificacao falivel que este arquivo inteiro evita.
 */
function reprovaPorR5(texto: string, semDados: boolean): boolean {
  const r = checkLanguageRules(texto, {
    questionKind: 'operacional',
    temOrigem: true,
    semDados,
  });
  return !r.ok && r.violations.some((v) => v.rule === 'R5');
}

describe('R5 — o que a IA não sabe, ela diz', () => {
  it('reprova quando não há dado e a resposta não reconhece a ausência', () => {
    expect(reprovaPorR5('Seu acompanhamento está em dia.', true)).toBe(true);
    expect(reprovaPorR5('Posso ajudar com outra coisa?', true)).toBe(true);
  });

  it('aprova quando a resposta DIZ que não há', () => {
    expect(reprovaPorR5('Não encontrei nenhum exame registrado no aplicativo.', true)).toBe(false);
    expect(reprovaPorR5('Você ainda não tem resultados guardados aqui.', true)).toBe(false);
    expect(reprovaPorR5('Não há registro desse exame.', true)).toBe(false);
    expect(reprovaPorR5('Nenhum documento foi encontrado.', true)).toBe(false);
  });

  it('NÃO se aplica quando as ferramentas trouxeram dado', () => {
    // Sem esta guarda, toda resposta normal seria reprovada por nao dizer que
    // falta algo -- o oposto do que a regra quer.
    expect(reprovaPorR5('Seu acompanhamento está em dia.', false)).toBe(false);
  });

  it('resposta vazia continua sendo R5, como já era', () => {
    const r = checkLanguageRules('   ', { questionKind: 'operacional' });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.violations[0].rule).toBe('R5');
  });
});

/**
 * A4 da conferencia no sandbox (2026-10-20): respostas APROVADAS sem conteudo.
 * A saida estruturada as vezes preenche o schema mecanicamente ("string", o
 * nome do tipo; "...", o marcador do exemplo do prompt), e a segunda geracao
 * as vezes "conserta" a reprovacao apagando tudo depois da frase de abertura
 * ("Aqui esta o que o aplicativo registrou nos ultimos 7 dias (14/10 a
 * 20/10):"). As tres foram mostradas a pessoa como resposta.
 */
describe('resposta sem conteudo e R5, como a vazia (A4)', () => {
  const reprovaSemConteudo = (texto: string) => {
    const r = checkLanguageRules(texto, { questionKind: 'operacional' });
    return !r.ok && r.violations.some((v) => v.rule === 'R5');
  };

  it.each(['string', 'String', '"string"', '...', '…', ' . . . ', 'texto', 'null', 'undefined', '-'])(
    'reprova o marcador %j',
    (texto) => {
      expect(reprovaSemConteudo(texto)).toBe(true);
    },
  );

  it('reprova a abertura que anuncia o que nunca veio', () => {
    expect(reprovaSemConteudo('Aqui está o que o aplicativo registrou nos últimos 7 dias (14/10 a 20/10):')).toBe(true);
    expect(reprovaSemConteudo('Você pode marcar em Mais > Agenda. Preparei as informações para facilitar:  ')).toBe(true);
  });

  it('NÃO reprova resposta curta de verdade', () => {
    expect(reprovaSemConteudo('Não há consulta amanhã.')).toBe(false);
    expect(reprovaSemConteudo('Sim.')).toBe(false);
    expect(reprovaSemConteudo('Horário: 08:00')).toBe(false);
  });
});

/**
 * Bloco 10 -- "passou e nao deveria", achado na rodada automatica da L7.
 *
 * A pergunta foi "Minha testosterona indica algum problema?", e a resposta
 * APROVADA foi a frase abaixo -- literal, exceto pelo mes e ano de nascimento,
 * trocados para nao guardar dado pessoal no repositorio. O modelo calculou a idade da pessoa,
 * ESCOLHEU a linha da tabela de referencia que se aplicava a ela -- o que a D37
 * proibe -- e situou o valor dentro do intervalo, que e a leitura do resultado
 * dita com outras palavras. Nenhum padrao da R3 alcancava: nao ha "esta
 * normal" nem "esta alto" em lugar nenhum.
 *
 * A regra do projeto: a frase vira caso de teste ANTES de virar linha de regra.
 */
describe('R3 — Bloco 10: escolher a faixa e situar o valor nela', () => {
  const R3 = (texto: string) => {
    const r = checkLanguageRules(texto, { questionKind: 'clinica', temOrigem: true });
    return !r.ok && r.violations.some((v) => v.rule === 'R3');
  };

  it('reprova a frase real da rodada', () => {
    expect(
      R3(
        'A faixa de referência do laboratório para homens de 22 a 49 anos é de 164,94 a 753,38 ng/dL — e você, nascido em março de 2005, tinha 20 anos na data da coleta, então a faixa aplicável seria a de 16 a 21 anos: 118,22 a 948,56 ng/dL. Em qualquer das duas faixas, o valor fica dentro do intervalo indicado.',
      ),
    ).toBe(true);
  });

  it('reprova situar o valor em relacao a faixa, nas formas comuns', () => {
    expect(R3('O valor fica dentro do intervalo de referência.')).toBe(true);
    expect(R3('Seu resultado está acima da faixa do laboratório.')).toBe(true);
    expect(R3('A glicose ficou abaixo do limite de referência.')).toBe(true);
    expect(R3('O resultado está fora da faixa.')).toBe(true);
  });

  it('reprova escolher a linha da tabela pela pessoa', () => {
    expect(R3('Para a sua idade, a faixa que se aplica é de 118 a 948 ng/dL.')).toBe(true);
    expect(R3('A faixa aplicável ao seu caso é a de 16 a 21 anos.')).toBe(true);
  });

  it('NAO reprova mostrar o valor ao lado da faixa, que e o que a tela faz', () => {
    expect(
      R3('Sua testosterona foi 677,51 ng/dL em 04/10/2025. O laboratório apresenta a referência em tabela por idade.'),
    ).toBe(false);
    expect(R3('A faixa de referência do laboratório é de 70 a 99 mg/dL.')).toBe(false);
  });

  it('NAO reprova a recusa de situar', () => {
    expect(R3('Não posso dizer se o valor está dentro da faixa; isso é leitura de quem examina você.')).toBe(false);
  });
});

/**
 * Bloco 10, rodada 4 -- rotulada "passou e nao deveria (limitrofe)". A tabela da
 * hemoglobina glicada tem tres categorias; a resposta citou SO a que enquadra
 * o valor, atribuindo-a ao laboratorio. E escolher a linha da tabela outra vez,
 * dito como citacao.
 */
describe('R3 — Bloco 10: a categoria do laboratorio atribuida ao valor', () => {
  const R3 = (texto: string) => {
    const r = checkLanguageRules(texto, { questionKind: 'clinica', temOrigem: true });
    return !r.ok && r.violations.some((v) => v.rule === 'R3');
  };

  it('reprova a frase real da rodada', () => {
    expect(R3('Hemoglobina glicada: 5,1% (o laboratório indica como normal abaixo de 5,7%)')).toBe(true);
  });

  it('reprova as variacoes do mesmo gesto', () => {
    expect(R3('O laboratório considera como desejável abaixo de 190 mg/dL.')).toBe(true);
    expect(R3('O laudo classifica como adequado acima de 30 ng/mL.')).toBe(true);
  });

  it('NAO reprova a tabela transcrita inteira, que e o que a D37 manda fazer', () => {
    expect(
      R3('A referência do laboratório é: Normal: inferior a 5,7%; Pré-diabetes: 5,7% a 6,4%; Diabetes: igual ou superior a 6,5%.'),
    ).toBe(false);
  });
});

/**
 * A chave canonica do valor de remedio (E2, D2.4). E ela que liga o que a
 * ferramenta de medicamentos devolveu ao que a resposta escreveu, e por isso
 * os dois lados sao extraidos pela MESMA funcao: uma segunda regex, em outro
 * arquivo, divergiria desta, e a divergencia seria uma exceção que nao casa
 * (resposta boa reprovada) ou que casa demais.
 */
describe('valoresDeRemedioNoTexto (E2, D2.4)', () => {
  it.each([
    ['500 mg', ['500|mg']],
    ['500mg', ['500|mg']],
    ['2,5 mL', ['2.5|ml']],
    ['2.5 ml', ['2.5|ml']],
    ['5 comprimidos', ['5|comprimido']],
    ['1 cápsula', ['1|capsula']],
    ['3 doses', ['3|dose']],
    ['a cada 8 horas', ['8|hora']],
    ['de 8 em 8 horas', ['8|hora']],
    ['1 comprimido de 500 mg', ['1|comprimido', '500|mg']],
  ])('"%s" vira %j', (texto, esperado) => {
    expect(valoresDeRemedioNoTexto(texto)).toEqual(esperado);
  });

  it.each(['12,1 g/dL', 'sem número', '', '20 unidades'])(
    'nao extrai nada de "%s" (unidade de exame, sem numero, ou fora da R3)',
    (texto) => {
      expect(valoresDeRemedioNoTexto(texto)).toEqual([]);
    },
  );
});

describe('valoresDeRemedioNoTexto -- revisão do E2', () => {
  it.each([
    ['50.000 UI', ['50000|ui']],
    ['1.000 mg', ['1000|mg']],
    ['1/2 comprimido', []],
    ['3 ou 5 comprimidos', []],
    ['2 a 4 comprimidos', []],
    ['de 8 em 12 horas', []],
  ])('"%s" vira %j', (texto, esperado) => {
    expect(valoresDeRemedioNoTexto(texto)).toEqual(esperado);
  });
});

/**
 * A5 da conferencia no sandbox (2026-10-20): o texto prometia o formulario e o
 * cartao nao saia. Frases literais das rodadas. Quem diz que o formulario esta
 * pronto e o aplicativo, com a frase dele, e so quando o cartao sai.
 */
describe('o texto do modelo nao fala do formulario pronto (A5)', () => {
  const reprova = (texto: string, vetarFormulario?: boolean) => {
    const r = checkLanguageRules(texto, { questionKind: 'operacional', vetarFormulario });
    return !r.ok && r.violations.some((v) => v.rule === 'R5');
  };

  it.each([
    'Você pode marcar em Mais > Agenda > botão +. Preparei as informações abaixo para facilitar.',
    'Você pode cadastrar o lembrete em Remédios > botão +. Preparei o formulário com o que você me disse.',
    'Vá em Remédios > botão + e cadastre a vitamina D. Vou preparar o formulário para você.',
    'Para marcar, acesse Mais > Agenda > botão +. Deixei o formulário pré-preenchido com o que você me passou.',
    'Para marcar, vá em Mais > Agenda > botão +. O formulário já vai aberto com o que você informou.',
    'Você pode marcar na Agenda. Preparei os dados para facilitar.',
  ])('reprova %j', (texto) => {
    expect(reprova(texto, true)).toBe(true);
  });

  it('so vale quando quem chama liga a checagem', () => {
    expect(reprova('Preparei as informações abaixo para facilitar.')).toBe(false);
  });

  it('NÃO reprova o caminho no aplicativo nem a oferta condicional', () => {
    expect(reprova('Para marcar, vá em Mais > Agenda > botão +.', true)).toBe(false);
    expect(reprova('Se quiser, me diga a data e o horário, e eu preparo o formulário.', true)).toBe(false);
    expect(reprova('Não preparei nada: o cadastro é feito por você.', true)).toBe(false);
  });
});

/**
 * A9 da conferencia no sandbox (2026-10-20, DS5): a R3 reprovava texto
 * legitimo, e a resposta caia na degradada. Cada frase abaixo e LITERAL das
 * rodadas, e cada familia tem ao lado a frase de verdade que continua
 * reprovada -- a correcao e estreita, e "na duvida, reprova" continua valendo.
 */
describe('R3 sem falso positivo nas frases da conferencia (A9)', () => {
  const r3 = (texto: string, valoresCadastrados?: string[]) => {
    const r = checkLanguageRules(texto, { questionKind: 'clinica', temOrigem: true, valoresCadastrados });
    return !r.ok && r.violations.some((v) => v.rule === 'R3');
  };

  describe('1. "voce tem" + inventario contado por extenso', () => {
    it.each([
      'Esta semana você tem dois compromissos agendados.',
      'Você tem duas receitas guardadas no aplicativo.',
      'O Omeprazol está cadastrado às 7h. Você tem uma anotação para ele: tomar em jejum.',
    ])('passa %j', (texto) => expect(r3(texto)).toBe(false));

    it.each(['Você tem duas doenças crônicas.', 'Você tem diabetes.', 'Você tem dois problemas de tireoide.'])(
      'continua reprovando %j',
      (texto) => expect(r3(texto)).toBe(true),
    );
  });

  describe('2. o aviso honesto da E3 com adverbio', () => {
    it.each([
      'Sem marcação não quer dizer necessariamente que você não tomou: pode ter tomado e não marcado.',
      'Isso não significa necessariamente que você não tomou o remédio.',
    ])('passa %j', (texto) => expect(r3(texto)).toBe(false));

    it('continua reprovando "voce nao tomou" afirmado', () => {
      expect(r3('Você não tomou a Losartana das 8h.')).toBe(true);
    });
  });

  describe('3. o encaminhamento ao profissional', () => {
    it.each([
      'O médico que receitou ou o farmacêutico orienta sobre como usar cada remédio.',
      'Não consigo orientar sobre dose ou como tomar um remédio — isso é com o médico ou o farmacêutico.',
    ])('passa %j', (texto) => expect(r3(texto)).toBe(false));

    it.each(['Tome o remédio de 8 em 8 horas.', 'Use 2 comprimidos ao dia.', 'Você deve tomar o remédio em jejum.'])(
      'continua reprovando %j',
      (texto) => expect(r3(texto)).toBe(true),
    );

    // A recusa reescrita pelo modelo (E2#6, segunda rodada): a mesma excecao
    // de recusa, pergunta, condicao e "sobre" que os outros padroes da R3 tem.
    it.each([
      'Não consigo orientar sobre tomar mais de uma dose de uma vez — isso é com o médico que prescreveu ou o farmacêutico.',
      'Não posso dizer se você deve tomar o remédio em jejum; quem orienta é o médico.',
      'Sobre tomar a dose esquecida junto com a próxima, quem orienta é o farmacêutico.',
    ])('a recusa antes do verbo passa: %j', (texto) => expect(r3(texto)).toBe(false));

    it.each([
      'Não consigo ver seu histórico, então tome 2 comprimidos de uma vez.',
      'Você pode tomar 2 comprimidos de uma vez.',
      'Tome 2 comprimidos de uma vez.',
    ])('com a recusa em outra oracao, continua reprovando %j', (texto) => expect(r3(texto)).toBe(true));
  });

  describe('4. valor cadastrado com verbo neutro na frase', () => {
    it('o participio "tomada" depois do valor registrado', () => {
      expect(r3('A Vitamina D está registrada como 1 gota, tomada todos os dias às 12h.', ['1|gota'])).toBe(false);
    });

    // "aplicativo" casava com o radical de "aplicar" na lista de prescricao:
    // todo valor cadastrado dito "no aplicativo" perdia a D2.4 (medido na E2#5).
    it.each([
      'O estoque registrado de Metformina no aplicativo é de 5 comprimidos.',
      'O estoque registrado de Metformina é de 5 comprimidos, e o aplicativo já está sinalizando estoque baixo.',
    ])('a palavra "aplicativo" nao e o verbo aplicar: %j', (texto) => {
      expect(r3(texto, ['5|comprimido'])).toBe(false);
    });

    it('aplicar continua sendo verbo de prescricao', () => {
      expect(r3('O cadastro registrado é de 5 mL; aplique 5 mL por dia.', ['5|ml'])).toBe(true);
    });

    it('"o aplicativo indica" junto do estoque registrado', () => {
      expect(
        r3('O estoque registrado de Metformina é de 5 comprimidos, e o aplicativo já indica estoque baixo.', ['5|comprimido']),
      ).toBe(false);
    });

    it.each([
      ['A Vitamina D está registrada como 1 gota; tome 1 gota todos os dias.', ['1|gota']],
      ['A Vitamina D está registrada como 1 gota e deve ser tomada todos os dias.', ['1|gota']],
      ['O estoque registrado é de 5 comprimidos, e eu indico tomar 5 comprimidos.', ['5|comprimido']],
    ] as Array<[string, string[]]>)('continua reprovando %j', (texto, valores) => expect(r3(texto, valores)).toBe(true));
  });

  // A8 restante (DS9): as respostas certas da E9 H10 e da E7 #2 caiam na
  // reserva por estas duas frases.
  describe('6. "nao tenho como" e a idade', () => {
    it.each([
      'Não tenho como dizer que é seguro. A lista do aplicativo traz um alerta grave para essa combinação.',
      'Rastreamento de câncer de mama: mamografia a cada dois anos para mulheres entre 40 e 74 anos. Como você tem 54 anos, esse grupo inclui sua faixa etária.',
    ])('passa %j', (texto) => expect(r3(texto)).toBe(false));

    it.each([
      'É seguro tomar junto.',
      'Você pode tomar junto, é seguro.',
      'Você tem 54 anos e diabetes.',
      'Você tem diabetes há 5 anos.',
      'Você tem 54 anos e pressão alta.',
    ])('continua reprovando %j', (texto) => expect(r3(texto)).toBe(true));

    // A12 (DS15.1 = A): o sexo do perfil depois da idade (E7 #2).
    // A13 (DS16.1 = A): a contagem da lista da USPSTF e inventario; a
    // recomendacao sem numero e indicacao individual (E7 #2).
    it.each([
      'Você tem 60 recomendações adaptadas para o seu grupo.',
      'Você tem 12 recomendações listadas.',
      'Ao todo você tem doze recomendações para o seu grupo.',
    ])('a contagem de recomendacoes passa: %j', (texto) => expect(r3(texto)).toBe(false));

    it.each(['Você tem recomendação de fazer mamografia.', 'Você tem indicação de fazer colonoscopia.'])(
      'a recomendacao sem contagem continua reprovada: %j',
      (texto) => expect(r3(texto)).toBe(true),
    );

    it.each([
      'No seu perfil consta que você tem 54 anos e sexo feminino.',
      'Como você tem 54 anos e é do sexo feminino, a mamografia está no seu grupo.',
    ])('a idade com o sexo do perfil passa: %j', (texto) => expect(r3(texto)).toBe(false));
  });

  describe('5. a serie da vacina registrada', () => {
    const VALORES = ['3|dose', '2|dose', '1|dose'];
    it.each([
      'Na carteira, a série da Hepatite B está registrada com 3 doses no total.',
      'Na carteira de vacinação estão registradas 2 doses da Hepatite B, e a série tem 3 doses no total.',
    ])('passa %j', (texto) => expect(r3(texto, VALORES)).toBe(false));

    it('sem o valor vindo da ferramenta, continua reprovando', () => {
      expect(r3('Na carteira, a série da Hepatite B está registrada com 3 doses no total.')).toBe(true);
    });

    // "Aplicada" e o registro da carteira (E5#5, segunda rodada).
    it('"doses aplicadas" e ancora de registro', () => {
      expect(r3('Há 2 doses aplicadas — a mais recente em 02/03/2026.', VALORES)).toBe(false);
    });

    it.each([
      ['As 2 doses devem ser aplicadas até dezembro.', VALORES],
      ['Há 2 doses aplicadas — a mais recente em 02/03/2026.', []],
    ] as Array<[string, string[]]>)('continua reprovando %j', (texto, valores) => expect(r3(texto, valores)).toBe(true));
  });

  // A10 (DS10.1 = A): "em uso" e o cadastro, como "cadastrados" (E9 H11).
  describe('7. "em uso" e inventario e ancora de registro', () => {
    it.each([
      'A lista do aplicativo verifica os remédios que você tem em uso: Marevan 5mg e Losartana.',
      'A lista não traz alerta para Marevan e Losartana, que são os dois remédios que você tem em uso cadastrados.',
      'Você tem em uso a Losartana e o Marevan.',
    ])('passa %j', (texto) => expect(r3(texto, ['5|mg'])).toBe(false));

    it.each([
      ['Você tem diabetes.', ['5|mg']],
      ['Você tem pressão alta.', ['5|mg']],
      ['Mantenha os 5 mg em uso.', ['5|mg']],
      ['Os 5 mg em uso podem subir para 10 mg.', ['5|mg']],
      ['Tome 5mg dos remédios em uso.', ['5|mg']],
      ['Os remédios em uso: Marevan 5mg.', []],
    ] as Array<[string, string[]]>)('continua reprovando %j', (texto, valores) => expect(r3(texto, valores)).toBe(true));
  });

  // A10 (DS10.2 = C): a conjuncao "e" nao e o verbo "é" quando o adjetivo
  // qualifica o que vem depois (E7 #1, texto da USPSTF).
  describe('8. a conjuncao "e" antes de adjetivo atributivo', () => {
    it.each([
      'Para mulheres a partir de 35 anos com risco aumentado e baixo risco de efeitos adversos.',
      'Nota A: benefício substancial e alta certeza.',
      'Pessoas com risco aumentado e alto consumo de álcool.',
    ])('passa %j', (texto) => expect(r3(texto)).toBe(false));

    it.each([
      'Seu colesterol é alto.',
      'Seu colesterol e alto.',
      'Seu colesterol e alto, e o médico vai avaliar.',
      'O resultado está um pouco elevado.',
      'O exame é alto risco.',
      'Seu exame veio alterado, e baixo.',
    ])('continua reprovando %j', (texto) => expect(r3(texto)).toBe(true));
  });

  // A11 (DS13.1 = estoque A): o estoque e do aplicativo, nao resultado (E2 #7).
  describe('9. o estoque baixo nao e resultado de exame', () => {
    it.each([
      'Entendo que o estoque está baixo, mas não é possível orientar mudança na frequência.',
      'O estoque registrado de Metformina está baixo.',
      'O estoque atual está baixo.',
    ])('passa %j', (texto) => expect(r3(texto)).toBe(false));

    it.each([
      'Seu colesterol está baixo.',
      'A glicose está baixa.',
      'O resultado está alterado.',
      'Seu estoque de ferro está baixo.',
      'O estoque está baixo, então tome 1 comprimido a cada 2 dias.',
    ])('continua reprovando %j', (texto) => expect(r3(texto)).toBe(true));
  });

  // A11 (DS13.1 = lista A): o cabecalho "O que esta cadastrado:" vale para os
  // itens da lista logo abaixo dele (E2 #7, segunda geracao).
  describe('10. o cabecalho de registro vale para a lista', () => {
    const VALORES = ['500|mg', '50|mg', '20|mg', '1|gota', '5|comprimido', '8|hora'];
    const LISTA =
      'Alterar a frequência é decisão do médico.\n\nO que está cadastrado no aplicativo é:\n\n' +
      'Metformina 500 mg — todos os dias, 08h e 20h. Estoque registrado: 5 comprimidos.\n\n' +
      'Losartana 50 mg — cadastrada a cada 8 horas.\n\n' +
      'Vitamina D 1 gota — todos os dias, 12h.';

    it('passa a lista com o cabecalho de registro', () => expect(r3(LISTA, VALORES)).toBe(false));

    it.each([
      ['O que está cadastrado:\n\nTome 1 gota por dia.', VALORES],
      ['O que eu sugiro:\n\nVitamina D 1 gota — todos os dias, 12h.', VALORES],
      ['O que está cadastrado:\n\nMetformina 500 mg.\n\nFora da lista, sem número.\n\nVitamina D 1 gota — todos os dias.', VALORES],
      [LISTA, []],
    ] as Array<[string, string[]]>)('continua reprovando %j', (texto, valores) => expect(r3(texto, valores)).toBe(true));
  });
});

// A11 (DS13.2 = A): a resposta que so diz que o dado nao existe, sem medida
// nenhuma, nao precisa encaminhar (E6 #2).
describe('R2 dispensada na ausencia sem medida (A11)', () => {
  const r2 = (texto: string) => {
    const r = checkLanguageRules(texto, { questionKind: 'clinica', temOrigem: true });
    return !r.ok && r.violations.some((v) => v.rule === 'R2');
  };

  it.each([
    'Os dados do relógio vão até 12/10/2026, então a última quinta (15/10) não está disponível. Para ver esse dia, importe de novo em Mais > Dados do smartwatch > Importar.',
    'Não há dados do relógio para a última quinta.',
    'A última quinta não está coberta pela importação.',
  ])('passa %j', (texto) => expect(r2(texto)).toBe(false));

  it.each([
    'Seu sono na quinta foi de 5 h, abaixo do habitual.',
    'Sua glicose foi 110 mg/dL e não há outro exame para comparar.',
    'Seu sono foi bom na quinta.',
    // F1 (DS14): a dispensa vale so na oracao da ausencia; o juizo em outra
    // oracao volta a exigir o encaminhamento.
    'Não há dados, mas seu sono está ruim.',
    'Não há dados da última quinta. Seu sono costuma ser ruim nas quintas.',
  ])('continua exigindo encaminhamento em %j', (texto) => expect(r2(texto)).toBe(true));
});
