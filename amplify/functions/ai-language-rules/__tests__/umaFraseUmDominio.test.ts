/**
 * "Uma frase, um dominio" (E10, D10.6 = 1). O lexico de causa (D10.3) pega perto
 * de metade das frases de causa nunca vistas: cada sonda cega acha uma familia
 * nova ("veio do", "trouxe", "tem relacao com"). Nos turnos que CRUZAM dominios
 * -- a comparacao, ou wearable junto com valor de exame --, a regra deixa de
 * depender de palavra: cada dado de saude vai na sua propria frase, e a frase
 * que junta dois dominios e reescrita. Causa entre dados precisa dos dois na
 * mesma frase; separados, so sobra o lado a lado.
 *
 * Fora desses turnos a regra nao vale: "voce tem 2 remedios e 1 exame" (o
 * panorama) junta dominios sem comparar nada.
 */
import { checkLanguageRules, type QuestionKind } from '../languageRules';

const TIPOS: QuestionKind[] = ['clinica', 'operacional'];

const umaFrase = (texto: string, questionKind: QuestionKind, cruzaDominios: boolean) => {
  const r = checkLanguageRules(texto, { questionKind, temOrigem: true, cruzaDominios });
  return r.ok ? [] : r.violations.filter((v) => /sua própria frase/.test(v.reason));
};

describe.each(TIPOS)('uma frase, um dominio (pergunta %s)', (questionKind) => {
  it.each([
    'Seu colesterol de 20/03/2026 foi 210 mg/dL, e em março seu sono teve média de 6 h por dia.',
    'O exame de glicose e o sono de março estão lado a lado acima.',
    // as que escaparam do lexico na sonda cega 2 (E10, estudo dos riscos)
    'A glicose alta veio do sono ruim.',
    'O aumento dos passos trouxe a queda do colesterol.',
    'O sono curto pesou no resultado do seu exame.',
    'A caminhada é a explicação para a glicose mais baixa.',
    'Quem dorme pouco tem colesterol mais alto, e foi o seu caso.',
    'A falta de exercício tem relação com a sua glicose alta.',
    'Por ter dormido pouco, seu colesterol subiu.',
    'Sua pressão subiu; seus batimentos também.',
    // a explicação de falta de dado não absolve a causa da oração ao lado (revisão do E6)
    'Não há dados de passos naquele mês, mas o sono causou o colesterol alto.',
  ])('turno que cruza: reescrita "%s"', (texto) => {
    expect(umaFrase(texto, questionKind, true)).toHaveLength(1);
  });

  // Sonda cega 3: "noites" e sono; e a ANAFORA -- o outro dado esta na frase
  // anterior. No turno que cruza, conector de causa junto de QUALQUER dado de
  // saude e reescrito: os dois assuntos ja estao na conversa, e "isso explica o
  // colesterol" aponta para o outro.
  it.each([
    'Noites curtas costumam elevar a glicemia, como no seu exame.',
    'Você dormiu em média 5 h em março. Isso explica o colesterol alto.',
    'Seus passos caíram em fevereiro. É por isso que a glicose subiu.',
    // sonda cega 4
    'Você caminhou bastante. Isso ajudou o exame.',
    'Seu sono foi curto em abril. Por causa disso, a pressão ficou alta.',
    'O seu estresse se reflete na pressão.',
    // o remedio tambem cruza desde a revisao do E6: a anafora vale para ele
    'Você começou a losartana em março. Isso explica o colesterol mais baixo.',
    'Você marcou todas as doses da sinvastatina. Por isso o colesterol caiu.',
  ])('turno que cruza: causa barrada "%s"', (texto) => {
    const r = checkLanguageRules(texto, { questionKind, temOrigem: true, cruzaDominios: true });
    expect((r.ok ? [] : r.violations.filter((v) => v.rule === 'R3')).length).toBeGreaterThan(0);
  });

  it.each([
    'Não há dado de passos em dezembro, por isso só o exame aparece.',
    'Por isso, a média de passos aparece sem o exame ao lado: não há exame de março registrado.',
    'Como a importação termina em fevereiro, não há dado de sono do mês do exame.',
    'Não consigo dizer se uma coisa influenciou a outra.',
    'Seu exame de glicose foi coletado em 18/03/2026. Em março de 2026, seus passos tiveram média de 6.100 por dia.',
    // a conjuncao que apresenta o que o assistente mostra (revisao do E6)
    'Seu sono teve média de 6 h em março. Por isso, mostro o exame de colesterol logo abaixo.',
    // a resposta de doses que o prompt manda dizer nos turnos que cruzam: o fato, sem conector
    'A dose das 20h da losartana ainda está pendente: esse horário ainda não chegou.',
    'A losartana está cadastrada desde janeiro. O exame de colesterol é de março.',
  ])('turno que cruza: honesta com conector passa "%s"', (texto) => {
    const r = checkLanguageRules(texto, { questionKind, temOrigem: true, cruzaDominios: true });
    expect(r.ok ? [] : r.violations.filter((v) => v.rule === 'R3')).toEqual([]);
  });

  it('fora do turno que cruza, a anafora continua com o lexico (que nao a pega)', () => {
    const r = checkLanguageRules('Você dormiu em média 5 h em março. Isso explica o colesterol alto.', {
      questionKind,
      temOrigem: true,
    });
    expect(r.ok ? [] : r.violations.filter((v) => v.rule === 'R3')).toEqual([]);
  });

  it.each([
    'Seu colesterol de 20/03/2026 foi 210 mg/dL. Em março, seu sono teve média de 6 h por dia.',
    'Não há dado de sono em janeiro, por isso o exame de janeiro aparece sozinho.',
    'A média de passos é de fevereiro, porque é o mês com mais dias nas 4 semanas antes do exame.',
    'Não consigo dizer se o sono influenciou o colesterol.',
    'Para avaliar o que o sono e o colesterol significam para você, procure um profissional de saúde.',
    'Os dados aparecem lado a lado, e isso não mostra se um influenciou o outro.',
    'Seu sono teve média de 7 h por dia em março.',
  ])('turno que cruza: passa "%s"', (texto) => {
    expect(umaFrase(texto, questionKind, true)).toEqual([]);
  });

  it.each([
    'Você tem 2 remédios em uso e 1 exame guardado.',
    'Seu colesterol de 20/03/2026 foi 210 mg/dL, e em março seu sono teve média de 6 h por dia.',
  ])('turno que NAO cruza: a regra nao vale "%s"', (texto) => {
    expect(umaFrase(texto, questionKind, false)).toEqual([]);
  });

  it('ausente significa que a regra nao vale', () => {
    const r = checkLanguageRules('Você tem 2 remédios em uso e 1 exame guardado.', { questionKind, temOrigem: true });
    expect(r.ok ? [] : r.violations.filter((v) => /sua própria frase/.test(v.reason))).toEqual([]);
  });
});
