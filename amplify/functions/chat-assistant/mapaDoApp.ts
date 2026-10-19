/**
 * Resumo do arquivo:
 * O mapa do app que o assistente usa para orientar a pessoa ("onde importo os
 * dados do meu relogio?") (E1, D1.3). Sem ele, o modelo INVENTA o caminho --
 * e uma tela que nao existe deixa perdida justamente quem mais pergunta.
 *
 * O mapa e DADO, e nao texto solto, para o teste conferir cada campo contra o
 * app: a rota contra `src/app`, os rotulos contra `src/constants/navigation.ts`
 * e cada botao contra o codigo da tela (`__tests__/mapaDoApp.test.ts`). Tela
 * nova sem entrada aqui reprova o teste. A rota existe SO para isso: ela
 * nunca vai ao prompt, porque o assistente fala em toques, nao em endereco.
 *
 * Os rotulos estao copiados do app de proposito: a Lambda nao importa de
 * `src/`, e o teste e o que impede as duas copias de divergirem.
 */

export type TelaDoMapa = {
  /** Nome do arquivo em `src/app` ou `src/app/(app)`, sem extensao. So para o teste. */
  rota: string;
  /** Como o app mostra a tela. */
  nome: string;
  /** Nomes que os textos do chat ja usam para a tela ("tela de Medicamentos"). */
  apelidos?: string[];
  /** Os toques: aba da barra, item do menu Mais, botao com texto, botao de icone
   *  ("botão + (nome)": a tela mostra so o "+", e o nome so existe para o leitor
   *  de tela) ou gesto ("tocar ..."). */
  caminho: string[];
  /** Uma linha, em linguagem simples. */
  oQueFaz: string;
};

export const MAPA_DO_APP: readonly TelaDoMapa[] = [
  {
    rota: 'dashboard',
    nome: 'Início',
    caminho: ['Início'],
    oQueFaz: 'Resumo do dia e atalhos.',
  },
  {
    rota: 'exams',
    nome: 'Exames',
    caminho: ['Exames'],
    oQueFaz: 'Exames e receitas guardados.',
  },
  {
    rota: 'add-exam',
    nome: 'Adicionar documento',
    caminho: ['Exames', 'botão + (Adicionar documento)'],
    oQueFaz: 'Guardar exame ou receita, por foto ou PDF.',
  },
  {
    rota: 'document-detail',
    nome: 'Documento',
    caminho: ['Exames', 'tocar no documento'],
    oQueFaz: 'Os resultados lidos de um exame.',
  },
  {
    rota: 'analyte-series',
    nome: 'Evolução',
    caminho: ['Exames', 'Evolução'],
    oQueFaz: 'Como um resultado mudou ao longo do tempo.',
  },
  {
    rota: 'ai',
    nome: 'Assistente',
    caminho: ['Assistente'],
    oQueFaz: 'Esta conversa; o clipe anexa um documento; o relógio no alto abre as conversas antigas.',
  },
  {
    rota: 'medicines',
    nome: 'Remédios',
    apelidos: ['Medicamentos'],
    caminho: ['Remédios'],
    oQueFaz: 'Remédios cadastrados, doses, estoque e alertas de interação.',
  },
  {
    rota: 'add-medicine',
    nome: 'Adicionar medicamento',
    caminho: ['Remédios', 'botão + (Adicionar medicamento)'],
    oQueFaz: 'Cadastrar remédio, horários e estoque.',
  },
  {
    rota: 'edit-medicine',
    nome: 'Editar medicamento',
    caminho: ['Remédios', 'tocar no remédio na lista'],
    oQueFaz: 'Mudar o cadastro de um remédio.',
  },
  {
    rota: 'more',
    nome: 'Mais',
    caminho: ['Mais'],
    oQueFaz: 'Menu com as outras telas.',
  },
  {
    rota: 'appointments',
    nome: 'Agenda',
    caminho: ['Mais', 'Agenda'],
    oQueFaz: 'Consultas, exames e cirurgias marcados.',
  },
  {
    rota: 'add-appointment',
    nome: 'Novo compromisso',
    caminho: ['Mais', 'Agenda', 'botão + (Novo compromisso)'],
    oQueFaz: 'Marcar consulta, exame ou cirurgia.',
  },
  {
    rota: 'edit-appointment',
    nome: 'Editar compromisso',
    caminho: ['Mais', 'Agenda', 'tocar no compromisso'],
    oQueFaz: 'Mudar um compromisso marcado.',
  },
  {
    rota: 'prevention',
    nome: 'Prevenção & Alertas',
    apelidos: ['Prevenção'],
    caminho: ['Mais', 'Prevenção & Alertas'],
    oQueFaz: 'Exames de prevenção recomendados para o perfil.',
  },
  {
    rota: 'vaccination',
    nome: 'Carteira de vacinação',
    apelidos: ['Vacinação'],
    caminho: ['Mais', 'Carteira de vacinação'],
    oQueFaz: 'Vacinas registradas, campanhas e postos.',
  },
  {
    rota: 'add-vaccine',
    nome: 'Adicionar vacina',
    caminho: ['Mais', 'Carteira de vacinação', 'botão + (Adicionar vacina)'],
    oQueFaz: 'Registrar uma dose de vacina.',
  },
  {
    rota: 'health-data',
    nome: 'Dados do smartwatch',
    caminho: ['Mais', 'Dados do smartwatch'],
    oQueFaz: 'Sono, passos e batimentos do relógio.',
  },
  {
    rota: 'import-health-data',
    nome: 'Importar',
    caminho: ['Mais', 'Dados do smartwatch', 'Importar'],
    oQueFaz: 'Trazer dados do relógio ou do celular.',
  },
  {
    rota: 'assistant-memory',
    nome: 'Memória do assistente',
    caminho: ['Mais', 'Memória do assistente'],
    oQueFaz: 'O que o assistente lembra da pessoa.',
  },
  {
    rota: 'profile',
    nome: 'Perfil',
    caminho: ['Mais', 'Perfil'],
    oQueFaz: 'Dados pessoais e preferências.',
  },
  {
    rota: 'edit-profile',
    nome: 'Editar perfil',
    caminho: ['Mais', 'Perfil', 'Editar perfil'],
    oQueFaz: 'Mudar os dados do perfil.',
  },
];

function linhaDaTela({ nome, apelidos, caminho, oQueFaz }: TelaDoMapa): string {
  const tambem = apelidos?.length ? ` (ou tela de ${apelidos.join(' ou ')})` : '';
  return `${nome}${tambem}: ${caminho.join(' > ')}. ${oQueFaz}`;
}

/** Uma linha por tela, sem rota. Entra no prompt fixo, em todo turno. */
export const MAPA_DO_APP_PROMPT = MAPA_DO_APP.map(linhaDaTela).join('\n');
