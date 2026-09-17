import { checkLanguageRules } from '../languageRules';

const clinica = { questionKind: 'clinica' as const };

describe('checkLanguageRules -- esqueleto', () => {
  it('aprova um texto que respeita as cinco regras', () => {
    const texto =
      'Seu registro de março mostra 32,5 ng/mL, e o de setembro mostra 41 ng/mL. Vale levar os dois exames ao seu médico para ele avaliar o quadro.';
    expect(checkLanguageRules(texto, clinica)).toEqual({ ok: true });
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

  it('texto vazio nao e aprovado como se fosse uma resposta boa', () => {
    // Resposta vazia e uma falha de geracao, nao uma resposta limpa.
    expect(checkLanguageRules('', clinica).ok).toBe(false);
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
      clinica,
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
      clinica,
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
    expect(checkLanguageRules(`Seu resultado de março foi 32,5 ng/mL. ${frase}`, clinica).ok).toBe(
      true,
    );
  });
});
