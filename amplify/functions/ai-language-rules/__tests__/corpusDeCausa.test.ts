/**
 * O corpus da guarda de causa entre dados (E10, D10.3 = A1). Medido em
 * 2026-10-19 contra a primeira guarda (lista fechada de conectores): 44 das 46
 * frases de causa da primeira leva PASSAVAM. A segunda leva veio de uma sonda
 * CEGA (frases escritas sem olhar a regra): 9 de 15 barradas antes de ajustar,
 * e as lacunas estruturais que ela mostrou entraram na regra. Elas estao por familia gramatical, porque e
 * por familia que o portugues diz causa -- verbo, substantivo, locucao,
 * conjuncao, correlacao dita como explicacao, eficacia de tratamento.
 *
 * Os dois lados, sempre: as honestas sao as que o prompt manda dizer (os dois
 * blocos lado a lado, a falta de dado explicada, o alerta de interacao). Uma
 * guarda testada so de um lado vira resposta boa barrada.
 */
import { checkLanguageRules, type QuestionKind } from '../languageRules';

const CAUSA: Record<string, string[]> = {
  verbo: [
    'O pouco sono provocou o aumento do colesterol.',
    // a falta de dado explicada na oração ao lado não absolve a causa (revisão do E6)
    'Não há dados de passos naquele mês, mas o sono causou o colesterol alto.',
    'Dormir mal gerou a alta da glicose.',
    'O sedentarismo resultou no aumento do peso.',
    'A falta de sono acarretou a alta da pressão.',
    'O sono ruim desencadeou o aumento da glicose.',
    'Dormir pouco fez seu colesterol subir.',
    'O sono curto deixou sua glicose mais alta.',
    'O pouco sono afetou seu colesterol.',
    'O sono interferiu no resultado do exame.',
    'Os passos impactaram sua pressão.',
    'O sono ruim prejudicou seu exame.',
    'Caminhar ajudou a baixar sua glicose.',
    'O exercício favoreceu a queda do colesterol.',
    'O sono ocasionou a alta da glicose.',
    'O estresse elevou sua pressão.',
  ],
  substantivo: [
    'A causa do colesterol alto é o pouco sono.',
    'O motivo da glicose alta é o sono curto.',
    'O colesterol alto é consequência do sono ruim.',
    'A glicose alta é reflexo das noites mal dormidas.',
    'O peso é fruto do sedentarismo.',
    'O sono é o responsável pelo colesterol alto.',
    'O sono é um fator para o colesterol alto.',
    'A culpa da glicose alta é do sono.',
    'A razão do colesterol alto é o sono.',
    'Seu colesterol aumentou por culpa das noites mal dormidas.',
    'O sono curto pode ser o motivo da glicose alta.',
  ],
  locucao: [
    'O colesterol subiu em função do sono ruim.',
    'A glicose aumentou em decorrência do sono curto.',
    'O peso aumentou em consequência do sedentarismo.',
    'A glicose subiu pelo sono ruim.',
    'A pressão subiu como resultado do pouco sono.',
    'Seu colesterol está alto por conta da falta de exercícios.',
    'Seus exames melhoraram graças às caminhadas.',
    'Com mais passos, sua pressão melhorou.',
  ],
  conjuncao: [
    'Seu colesterol subiu porque você dormiu pouco.',
    'A glicose está alta, pois o sono foi curto.',
    'Como você dormiu pouco, o colesterol subiu.',
    'Você dormiu pouco, então a glicose subiu.',
    'Você caminhou mais e, com isso, a glicose caiu.',
    'O sono foi curto; consequentemente, o colesterol subiu.',
    'Já que você dormiu pouco, a glicose subiu.',
    'Você dormiu pouco, e assim o colesterol subiu.',
    'Faz sentido o colesterol estar alto, já que você anda pouco.',
    'Seu peso aumentou porque você parou de se exercitar.',
    // a acao do assistente so absolve quando NAO introduz uma afirmacao (revisao do E6)
    'Você dormiu pouco; por isso, mostro que seu colesterol subiu.',
    'Por isso mostro: o sono causou o colesterol alto.',
  ],
  correlacao: [
    'O colesterol tem a ver com o seu sono.',
    'O colesterol está ligado ao sono curto.',
    'O sono está por trás da glicose alta.',
    'A glicose alta se deve ao sono curto.',
    'O sono justifica o colesterol alto.',
    'Dá para ver que o sono influencia o seu colesterol.',
    'O seu sono está diretamente ligado à sua glicemia.',
    'A queda da glicose se explica pelo aumento dos passos.',
  ],
  eficacia: [
    'O remédio resolveu sua pressão.',
    'O remédio controlou sua glicose.',
    'O remédio baixou seu colesterol.',
    'A losartana está controlando sua pressão.',
    'O medicamento normalizou sua glicose.',
    'Com o remédio, seu colesterol caiu.',
    'A losartana fez sua pressão cair.',
  ],
};

const HONESTAS = [
  'Seu colesterol total coletado em 12/03/2026 foi 210 mg/dL, e em março de 2026 seu sono teve média de 6 h 10 min por dia.',
  'Não consigo comparar porque o exame é de 2025 e os dados de sono começam em 2026.',
  'O exame ficou de fora porque não há dado de sono naquele mês.',
  'Como o exame é de 2025, não há dado de sono do mesmo mês para mostrar ao lado.',
  'A média de sono não aparece porque a importação cobre poucos dias de março.',
  'Para avaliar o que o sono e o colesterol significam para você, procure um profissional de saúde.',
  'O remédio está cadastrado desde janeiro, e o exame de colesterol é de março.',
  'A combinação desses dois remédios pode causar sangramento.',
  'Então, seu exame de colesterol mais recente é de março, e seus dados de sono vão até abril.',
  'Os passos de março aparecem ao lado do exame de glicose, e isso não mostra se um influenciou o outro.',
  'A média de sono é de fevereiro, o mês com mais dias nas 4 semanas antes do exame.',
  'O remédio da pressão está cadastrado a cada 12 horas, e o exame de glicose é de abril.',
  'Seu exame de glicose é de março; para ver ao lado dos passos, a importação precisa cobrir esse mês.',
  'Não encontrei glicemia entre os seus exames registrados, então não há o que mostrar ao lado dos passos.',
  'A média de passos é de fevereiro, porque é o mês com mais dias nas 4 semanas antes do exame.',
  'Seu exame de colesterol foi coletado em 12/03/2026 e deu 210 mg/dL; em fevereiro de 2026, seus passos tiveram média de 7.430 por dia.',
  'Você tem 2 remédios em uso e 1 exame guardado.',
  'A tela de Wearable mostra o seu sono, e a tela de Exames mostra o colesterol.',
  'Então, para comparar com os passos, escolha qual exame quer ver.',
  // a conjuncao que apresenta o que o assistente MOSTRA nao liga dado a dado (revisao do E6)
  'Por isso, mostro o exame de colesterol e o remédio cadastrado lado a lado.',
  'Com isso, listo o sono de março e o exame de glicose separados.',
  'Assim, vou mostrar os passos e a glicose cada um com a sua data.',
];

const TIPOS: QuestionKind[] = ['clinica', 'operacional'];

const violacaoDeCausa = (frase: string, questionKind: QuestionKind) => {
  const r = checkLanguageRules(frase, { questionKind, temOrigem: true });
  return r.ok ? [] : r.violations.filter((v) => v.rule === 'R3' && /origem no outro/.test(v.reason));
};

describe.each(TIPOS)('corpus de causa (E10, D10.3), pergunta %s', (questionKind) => {
  describe.each(Object.entries(CAUSA))('%s', (_familia, frases) => {
    it.each(frases)('barrada: "%s"', (frase) => {
      expect(violacaoDeCausa(frase, questionKind)).toHaveLength(1);
    });
  });

  it.each(HONESTAS)('honesta passa: "%s"', (frase) => {
    expect(violacaoDeCausa(frase, questionKind)).toEqual([]);
  });
});
