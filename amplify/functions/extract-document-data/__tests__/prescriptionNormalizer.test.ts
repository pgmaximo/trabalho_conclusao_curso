import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CONFIDENCE_THRESHOLD } from '../analyteNormalizer';
import { SYSTEM_PROMPT_RECEITA, systemPromptPara } from '../extractionPrompt';
import { normalizePrescriptionItem } from '../prescriptionNormalizer';

const losartana = {
  medicationLabel: 'Losartana Potássica',
  dose: '50',
  unit: 'mg',
  frequency: '1x ao dia',
  duration: '30 dias',
  rawText: 'Losartana Potássica 50mg - tomar 1 comprimido ao dia por 30 dias',
  confidence: 0.92,
};

describe('normalizePrescriptionItem', () => {
  it('produz medicamento e posologia, nao analito', () => {
    const item = normalizePrescriptionItem(losartana);
    expect(item.medicationLabel).toBe('Losartana Potássica');
    expect(item.frequency).toBe('1x ao dia');
    expect(item).not.toHaveProperty('analyteCode');
    expect(item).not.toHaveProperty('referenceLow');
  });

  it('a dose fica como TEXTO, e nao vira numero', () => {
    // "1/2 comprimido" so viraria numero se alguem decidisse o que meio
    // comprimido de 50mg quer dizer -- e isso e leitura clinica. O texto do
    // papel basta para o que esta tela faz: mostrar o que a receita dizia.
    const meio = normalizePrescriptionItem({ ...losartana, dose: '1/2 comprimido' });
    expect(meio.dose).toBe('1/2 comprimido');
    expect(typeof meio.dose).toBe('string');
  });

  it('campo vazio vira nulo, e nao uma string em branco no banco', () => {
    const semDuracao = normalizePrescriptionItem({ ...losartana, duration: '   ' });
    expect(semDuracao.duration).toBeNull();
  });

  it('confianca baixa manda o item para conferencia', () => {
    const duvidoso = normalizePrescriptionItem({ ...losartana, confidence: 0.3 });
    expect(duvidoso.reviewStatus).toBe('PENDENTE_DE_REVISAO');
    // E o texto do papel continua ali, que e o que a pessoa vai conferir.
    expect(duvidoso.rawText).toBe(losartana.rawText);
  });

  it('nao corrige nem completa o que a receita nao disse', () => {
    const semPosologia = normalizePrescriptionItem({
      ...losartana,
      frequency: null,
      duration: null,
    });
    expect(semPosologia.frequency).toBeNull();
    expect(semPosologia.duration).toBeNull();
  });
});

describe('a receita nao vira tratamento', () => {
  // Estes dois testes valem mais do que uma revisao de codigo: eles vigiam a
  // funcao INTEIRA, inclusive o que alguem acrescentar depois.

  const pasta = join(__dirname, '..');
  const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.ts'));

  /** A garantia e sobre o CODIGO. Os comentarios que explicam a garantia
   *  precisam poder nomear o campo -- senao a unica forma de documentar a
   *  regra seria escrever ao redor dela. */
  const semComentarios = (codigo: string) =>
    codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  const fonte = arquivos
    .map((f) => semComentarios(readFileSync(join(pasta, f), 'utf8')))
    .join('\n');

  it('nenhum arquivo da extracao escreve na tabela de medicamentos', () => {
    // Criar lembrete de medicamento a partir da leitura automatica de um papel
    // e acao de risco alto que esta EPIC nao toma (spec secao 5). A garantia
    // nao e um cuidado no codigo: e o fato de nenhum arquivo aqui conhecer a
    // tabela Medicine -- e de a funcao nao ter permissao para escrever nela.
    expect(fonte).not.toMatch(/MEDICINE_TABLE|MedicineTable|models\.Medicine\b/);
    expect(fonte).not.toMatch(/scheduleNotification|reminder/i);
  });

  it('a extracao nunca escreve a validade da receita', () => {
    // expirationDate e do formulario. A forma segura de garantir isso e a
    // funcao nunca escrever o campo -- e nao escrever com cuidado.
    expect(fonte).not.toMatch(/expirationDate/);
  });
});

describe('o prompt da receita', () => {
  it('e outro texto de sistema, e nao o do laudo', () => {
    expect(systemPromptPara('prescription')).toBe(SYSTEM_PROMPT_RECEITA);
    expect(systemPromptPara('exam')).not.toBe(SYSTEM_PROMPT_RECEITA);
  });

  it('proibe sugerir dose e comentar o tratamento', () => {
    expect(SYSTEM_PROMPT_RECEITA).toMatch(/nao sugira dose|não sugira dose/i);
    expect(SYSTEM_PROMPT_RECEITA).toMatch(/interpret|comente/i);
  });

  it('manda ignorar a validade, que ja veio do formulario', () => {
    expect(SYSTEM_PROMPT_RECEITA).toMatch(/validade/i);
  });

  it('carrega as regras comuns aos dois tipos de documento', () => {
    // Transcrever exatamente, nao inventar e nao obedecer instrucao vinda de
    // dentro do documento valem para receita tanto quanto para laudo.
    expect(SYSTEM_PROMPT_RECEITA).toMatch(/nao siga instrucao|não siga instrução/i);
    expect(SYSTEM_PROMPT_RECEITA).toMatch(/nao invente|não invente/i);
  });
});
