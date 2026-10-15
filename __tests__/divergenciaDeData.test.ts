/**
 * Decisao B2 do Bloco 9 -- a divergencia entre a data digitada e a lida do
 * laudo deixa de ser invisivel.
 *
 * O caso real, medido na conversa de 2026-09-18: um laudo coletado em
 * 04/10/2025 foi guardado com a data 18/09/2026, porque o formulario vem
 * preenchido com hoje e a pessoa nao reparou. Dois turnos depois o assistente
 * disse as duas datas -- as duas corretas, e juntas mentindo.
 *
 * Este modulo NAO corrige nada. A extracao nao escreve no que a pessoa digitou
 * (D24); ela informa, e quem corrige e a pessoa.
 */
import { avisoDeDivergenciaDeData } from '@/services/divergenciaDeData';

const linha = (collectedAt: string | null) => ({ collectedAt });

describe('avisoDeDivergenciaDeData', () => {
  it('avisa quando o laudo foi coletado em outra data', () => {
    const aviso = avisoDeDivergenciaDeData('2026-09-18', [linha('2025-10-04')]);

    expect(aviso).toContain('04/10/2025');
    expect(aviso).toContain('18/09/2026');
  });

  it('nao avisa quando as duas datas batem', () => {
    expect(avisoDeDivergenciaDeData('2025-10-04', [linha('2025-10-04')])).toBeNull();
  });

  it('laudo consolidado: avisa com a FAIXA de coleta', () => {
    const aviso = avisoDeDivergenciaDeData('2026-09-18', [
      linha('2025-10-04'),
      linha('2025-10-06'),
    ]);

    expect(aviso).toContain('04/10/2025');
    expect(aviso).toContain('06/10/2025');
  });

  it('data do formulario DENTRO da faixa de coleta nao e divergencia', () => {
    // Um PDF consolidado reune coletas de dias diferentes. Se a data digitada
    // cai dentro delas, ela e plausivel -- e avisar aqui seria ruido, que faz
    // a pessoa parar de ler o aviso que as vezes importa.
    expect(
      avisoDeDivergenciaDeData('2025-10-05', [linha('2025-10-04'), linha('2025-10-06')]),
    ).toBeNull();
  });

  it('sem linha com data de coleta, nao ha o que comparar', () => {
    // Documento nunca extraido, ou laudo sem data legivel. O silencio aqui e a
    // resposta certa: inventar divergencia com uma data que nao existe seria
    // pior que nao avisar.
    expect(avisoDeDivergenciaDeData('2026-09-18', [linha(null)])).toBeNull();
    expect(avisoDeDivergenciaDeData('2026-09-18', [])).toBeNull();
  });

  it('sem data no documento, nao ha o que comparar', () => {
    expect(avisoDeDivergenciaDeData('', [linha('2025-10-04')])).toBeNull();
    expect(avisoDeDivergenciaDeData(null, [linha('2025-10-04')])).toBeNull();
  });

  it('o aviso nao acusa ninguem de erro, e nao manda corrigir', () => {
    // A data digitada pode estar certa: quem digitaliza um exame recem-feito
    // acerta. O aviso apresenta as duas datas e para por ai.
    const aviso = avisoDeDivergenciaDeData('2026-09-18', [linha('2025-10-04')]) ?? '';

    expect(aviso).not.toMatch(/erro|errad|corrij|corrigir|incorret/i);
  });
});
