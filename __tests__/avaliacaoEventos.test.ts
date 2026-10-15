/**
 * G7 (Bloco 10) -- a pipeline de avaliacao le as metricas do MESMO rastro que
 * a producao deixa no CloudWatch. Nada de instrumentacao paralela: se a
 * pipeline contasse de outro jeito, o numero dela e o da producao divergiriam
 * em silencio.
 */
import { lerEventos } from '../scripts/avaliacao/eventos';

const json = (o: unknown) => JSON.stringify(o);

describe('lerEventos', () => {
  it('turno aprovado de primeira: uma geracao, sem reprovacao, custo dela', () => {
    const r = lerEventos([
      json({ evento: 'geracao-concluida', etapa: 'primeira', entrada: 4200, saida: 310 }),
      json({ evento: 'encaminhamento-costurado' }),
    ]);
    expect(r).toEqual({
      geracoes: 1,
      reprovacoes: [],
      encaminhamento: 'costurado',
      entrada: 4200,
      saida: 310,
      falhas: [],
    });
  });

  it('turno reprovado e salvo na segunda: soma o custo e guarda a regra', () => {
    const r = lerEventos([
      json({ evento: 'geracao-concluida', etapa: 'primeira', entrada: 4000, saida: 300 }),
      json({ evento: 'resposta-reprovada', etapa: 'primeira', regras: ['R1'], citacoes: 'conferem' }),
      json({ evento: 'geracao-concluida', etapa: 'segunda', entrada: 4500, saida: 280 }),
      json({ evento: 'encaminhamento-do-modelo' }),
    ]);
    expect(r.geracoes).toBe(2);
    expect(r.reprovacoes).toEqual([{ etapa: 'primeira', regras: ['R1'], citacoesConferem: true }]);
    expect(r.encaminhamento).toBe('do-modelo');
    expect(r.entrada).toBe(8500);
    expect(r.saida).toBe(580);
  });

  it('citacao que nao confere e reprovacao mesmo sem regra', () => {
    const r = lerEventos([
      json({ evento: 'resposta-reprovada', etapa: 'primeira', regras: [], citacoes: 'nao-conferem' }),
    ]);
    expect(r.reprovacoes).toEqual([{ etapa: 'primeira', regras: [], citacoesConferem: false }]);
  });

  it('ignora linha que nao e evento -- o console tem de tudo', () => {
    const r = lerEventos(['texto solto', '{"quebrado":', json({ outro: 1 }), json({ evento: 'desconhecido' })]);
    expect(r).toEqual({ geracoes: 0, reprovacoes: [], encaminhamento: null, entrada: 0, saida: 0, falhas: [] });
  });

  it('le a falha de geracao que o Bloco 10 passou a registrar', () => {
    // A primeira rodada achou cinco turnos degradados com 0 token e sem rastro.
    const r = lerEventos([
      json({ evento: 'geracao-falhou', etapa: 'primeira', motivo: 'max_tokens' }),
      json({ evento: 'geracao-falhou', etapa: 'segunda', motivo: 'formato', campos: ['texto'] }),
    ]);
    expect(r.falhas).toEqual([
      { etapa: 'primeira', motivo: 'max_tokens' },
      { etapa: 'segunda', motivo: 'formato' },
    ]);
  });
});
