/**
 * Termos de Uso e Política de Privacidade do SuaSaúde: o texto que a pessoa
 * aceita ao concluir o cadastro (etapa "Revisão" do Perfil de Saúde) e consulta
 * depois em Mais > Termos e privacidade, ou antes de entrar, pelo link do login.
 *
 * O texto descreve o que o aplicativo FAZ HOJE. Cada afirmação foi conferida
 * contra o código em 2026-10-18. O que a lei exige e o aplicativo ainda não
 * cumpre está em `docs/lgpd/conformidade-e-pendencias.md`, e não aqui: um
 * termo que promete o que o código não faz é pior que um termo curto.
 *
 * MUDOU O TEXTO DE FORMA RELEVANTE (finalidade, dados tratados,
 * compartilhamento, transferência)? Suba `VERSAO_DOS_TERMOS`. A versão aceita
 * fica gravada no perfil (`UserProfile.termsVersion`), e é ela que prova o
 * aceite (LGPD, art. 8º, § 2º).
 */

export const VERSAO_DOS_TERMOS = '1.0';
export const VIGENCIA_DOS_TERMOS = '18/10/2026';

// O e-mail da equipe para pedidos de titulares. Quem o atende segue os
// procedimentos de docs/lgpd/conformidade-e-pendencias.md, seção 4.
export const CANAL_DE_PRIVACIDADE = 'suasaudetcc2026@gmail.com';

/** Um parágrafo (string) ou uma lista de itens (string[]). */
export type BlocoDoTermo = string | readonly string[];

export type SecaoDoTermo = {
  numero: number;
  titulo: string;
  blocos: readonly BlocoDoTermo[];
};

export type ParteDoTermo = {
  titulo: string;
  secoes: readonly SecaoDoTermo[];
};

export const TERMOS_E_PRIVACIDADE: readonly ParteDoTermo[] = [
  {
    titulo: 'Termos de Uso',
    secoes: [
      {
        numero: 1,
        titulo: 'Quem somos e como estes termos funcionam',
        blocos: [
          'O SuaSaúde é um aplicativo de organização de informações de saúde, desenvolvido como Trabalho de Conclusão de Curso de Ciência da Computação no Centro Universitário do Instituto Mauá de Tecnologia (IMT). A equipe responsável está identificada na seção 10.',
          'Estes Termos de Uso e a Política de Privacidade (seções 10 a 20) formam um único documento. Ao marcar as caixas de aceite e concluir o seu Perfil de Saúde, você declara que leu e concorda com ele. Sem esse aceite, a criação da conta não é concluída.',
          'O SuaSaúde é um protótipo acadêmico. Ele não é distribuído em lojas de aplicativos e é usado apenas por um grupo restrito: a equipe, o orientador, a banca avaliadora e pessoas convidadas para testá-lo durante o desenvolvimento e a avaliação do TCC.',
          'O SuaSaúde é gratuito, não exibe publicidade e não vende dados. Ele é destinado a maiores de 18 anos.',
          'Você pode testar o aplicativo com dados fictícios. Se usar dados reais, eles recebem todas as proteções desta política.',
        ],
      },
      {
        numero: 2,
        titulo: 'O que o SuaSaúde é, e o que ele não é',
        blocos: [
          'O SuaSaúde reúne em um só lugar informações que você mesmo fornece: exames, receitas, remédios, compromissos, vacinas, dados exportados do seu smartwatch e o seu Perfil de Saúde. Ele também mostra recomendações públicas de prevenção e campanhas de vacinação.',
          'O SuaSaúde não é um serviço de saúde, não presta atendimento médico e não substitui consulta, exame ou orientação de profissional de saúde. Em especial, ele:',
          [
            'não faz diagnóstico, não diz se um resultado está bom ou ruim e não indica tratamento, remédio ou dose;',
            'não acompanha sua saúde em tempo real e não emite alertas de emergência;',
            'não é registrado na Anvisa como dispositivo médico e não deve ser usado como tal.',
          ],
          'Em caso de emergência, ligue 192 (SAMU) ou procure o serviço de saúde mais próximo. Nunca deixe de buscar atendimento, nem mude um tratamento, por causa de algo que o aplicativo mostrou.',
        ],
      },
      {
        numero: 3,
        titulo: 'Inteligência artificial no SuaSaúde',
        blocos: [
          'Algumas funções usam inteligência artificial (IA): modelos de linguagem da família Claude, da Anthropic, executados no Amazon Bedrock, da Amazon Web Services (AWS).',
          [
            'Leitura de documentos: transcreve os valores impressos em exames e receitas (PDF ou fotos), para você vê-los organizados e em gráficos de evolução.',
            'Análise dos dados do smartwatch: descreve, em linguagem simples, tendências e correlações calculadas a partir dos dados que você importou.',
            'Assistente: responde perguntas sobre as informações guardadas na sua conta e explica, de forma educativa, documentos que você anexar à conversa.',
            'Memória do assistente: guarda frases curtas sobre você, e só quando você confirma cada uma.',
          ],
          'O que você precisa saber sobre essas respostas:',
          [
            'Elas têm caráter apenas informativo e educativo. Não são diagnóstico, laudo, parecer nem prescrição.',
            'A IA pode errar: ler um número errado, deixar de ler um valor ou interpretar mal uma foto. Confira sempre com o documento original. O aplicativo mostra de qual documento cada valor veio e permite corrigi-lo.',
            'As respostas passam por filtros automáticos que bloqueiam diagnóstico e indicação de remédio ou dose, e toda resposta clínica do assistente recomenda procurar um profissional de saúde. Esses filtros reduzem os riscos, mas não os eliminam.',
            'O aplicativo não usa IA para tomar decisões que afetem os seus direitos: ele não aprova, não recusa, não classifica e não pontua você. Ainda assim, você pode pedir informações sobre os critérios usados e a revisão de qualquer tratamento automatizado dos seus dados (LGPD, art. 20) pelo canal da seção 10.',
            'Seus dados não são usados para treinar modelos de IA (seção 13).',
          ],
        ],
      },
      {
        numero: 4,
        titulo: 'Sua conta e suas responsabilidades',
        blocos: [
          [
            'Informe dados verdadeiros e mantenha o seu Perfil de Saúde atualizado.',
            'Guarde sua senha em sigilo e não compartilhe sua conta. Se suspeitar de acesso indevido, avise pelo canal da seção 10.',
            'Envie apenas documentos e dados seus. Não cadastre informações de saúde de outras pessoas sem estar legalmente autorizado.',
            'Use o aplicativo só para fins lícitos. É proibido tentar acessar dados de outras pessoas, burlar mecanismos de segurança, sobrecarregar o serviço ou enviar conteúdo malicioso, inclusive instruções escondidas em documentos para manipular a IA.',
          ],
          'Uma conta usada em violação destes termos pode ser suspensa. Sempre que possível, avisaremos o titular antes.',
        ],
      },
      {
        numero: 5,
        titulo: 'Informações de fontes públicas e de terceiros',
        blocos: [
          'Algumas funções mostram informações de fontes públicas: recomendações de prevenção da força-tarefa norte-americana USPSTF (traduzidas automaticamente para o português) e, do Ministério da Saúde, campanhas do Programa Nacional de Imunizações e unidades de saúde do CNES. O alerta de interação entre remédios usa uma lista pequena e não exaustiva de combinações conhecidas, embutida no aplicativo.',
          'Essas informações podem estar incompletas, desatualizadas ou não se aplicar ao seu caso. A ausência de alerta não significa que uma combinação de remédios é segura. Confirme sempre com um médico, um farmacêutico ou a sua unidade de saúde.',
        ],
      },
      {
        numero: 6,
        titulo: 'Disponibilidade do serviço',
        blocos: [
          'O SuaSaúde existe para o desenvolvimento e a avaliação de um TCC, sem garantia de funcionamento contínuo. Ele pode ficar indisponível, mudar ou ser encerrado, inclusive depois da conclusão do curso. Se for encerrado, avisaremos com antecedência razoável sempre que possível e ofereceremos uma cópia dos seus dados antes de eliminá-los.',
          'Guarde os seus documentos originais: o aplicativo não substitui o arquivo dos seus exames e receitas.',
        ],
      },
      {
        numero: 7,
        titulo: 'Responsabilidades',
        blocos: [
          'Trabalhamos para que o aplicativo funcione corretamente e proteja os seus dados (seção 17). Como as informações exibidas são de caráter informativo, decisões sobre a sua saúde devem ser tomadas com um profissional de saúde.',
          'Nada neste documento afasta direitos que a lei garante a você, inclusive como consumidor (Código de Defesa do Consumidor) e como titular de dados pessoais (LGPD).',
        ],
      },
      {
        numero: 8,
        titulo: 'Alterações deste documento',
        blocos: [
          'Se mudarmos este documento de forma relevante, por exemplo na finalidade do uso dos dados, nos dados tratados, em com quem eles são compartilhados ou para onde são transferidos, avisaremos no aplicativo e pediremos um novo aceite. A versão vigente fica sempre disponível em Mais > Termos e privacidade.',
        ],
      },
      {
        numero: 9,
        titulo: 'Lei aplicável e foro',
        blocos: [
          'Este documento segue as leis brasileiras, em especial a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018), o Marco Civil da Internet (Lei nº 12.965/2014) e o Código de Defesa do Consumidor (Lei nº 8.078/1990). Eventuais conflitos serão resolvidos no foro do seu domicílio.',
        ],
      },
    ],
  },
  {
    titulo: 'Política de Privacidade',
    secoes: [
      {
        numero: 10,
        titulo: 'Quem cuida dos seus dados e como falar conosco',
        blocos: [
          'Controladora dos dados: a equipe do projeto SuaSaúde, formada por André Martinez de Souza, Arturo Ochoa Garcia, Brunno Bernacchi de Souza, Matheus Passari Nascimento e Pedro Gabriel Oliveira Máximo.',
          `Canal de privacidade: ${CANAL_DE_PRIVACIDADE}. A própria equipe responde por esse e-mail e faz o papel de encarregado pelo tratamento de dados pessoais.`,
          'Por esse canal você exerce os seus direitos (seção 18), tira dúvidas sobre esta política e comunica problemas de segurança. Respondemos em até 15 dias.',
        ],
      },
      {
        numero: 11,
        titulo: 'Quais dados tratamos',
        blocos: [
          'Tratamos apenas os dados de que o aplicativo precisa para funcionar, e quase todos são fornecidos por você:',
          [
            'Conta: e-mail e senha (guardada cifrada pelo serviço de login). Se você entrar com o Google, recebemos do Google o seu e-mail e um identificador da sua conta.',
            'Perfil de Saúde: nome, data de nascimento, sexo biológico, gravidez, altura, peso, condições crônicas, remédios em uso, alergias, tabagismo, atividade sexual, atividade física, consumo de álcool e foto de perfil (opcional). As perguntas sobre hábitos aceitam "Prefiro não informar".',
            'Documentos: os arquivos de exames e receitas que você envia (PDF ou fotos) e os valores lidos deles, com as correções que você fizer.',
            'Remédios, agenda e vacinas: nomes, doses, horários e estoque de remédios; compromissos (título, data, local e observações); doses de vacina registradas.',
            'Dados do smartwatch: os arquivos que você exporta do Samsung Health ou de um exportador do Apple Health (frequência cardíaca, sono, passos e outras métricas), os resumos calculados a partir deles e a análise gerada.',
            'Assistente: as mensagens das conversas, os arquivos anexados a elas e os fatos que você confirmou na memória do assistente.',
            'Localização (opcional): usada só na Carteira de vacinação, se você permitir, para identificar seu estado, seu município e unidades de saúde próximas. Você pode negar a permissão e escolher o município manualmente.',
            'Dados técnicos: registros de funcionamento do serviço, como identificadores de documentos e mensagens de erro, feitos para não conter o conteúdo dos seus documentos ou conversas.',
          ],
          'A maior parte desses dados é dado pessoal sensível referente à saúde (LGPD, art. 5º, II) e recebe as proteções desta política. Não coletamos CPF, contatos, dados de pagamento nem identificadores de publicidade, e o aplicativo não tem ferramentas de rastreamento ou de publicidade.',
        ],
      },
      {
        numero: 12,
        titulo: 'Para que usamos seus dados, e com qual base legal',
        blocos: [
          [
            'Criar e manter sua conta e autenticar o seu acesso. Base legal: execução de contrato a seu pedido (LGPD, art. 7º, V).',
            'Guardar, organizar e exibir suas informações de saúde; ler seus documentos e analisar os dados do smartwatch com IA; responder no assistente; selecionar recomendações de prevenção pela idade, sexo, gravidez, tabagismo e atividade sexual informados no perfil; e agendar lembretes no seu aparelho. Base legal: o seu consentimento específico e destacado para dados sensíveis (LGPD, art. 11, I).',
            'Guardar cada fato da memória do assistente. Base legal: consentimento específico, dado a cada fato (LGPD, art. 11, I).',
            'Armazenar e processar os dados em servidores nos Estados Unidos. Base legal: o seu consentimento específico para a transferência internacional (LGPD, art. 33, VIII), detalhado na seção 15.',
            'Manter a segurança do serviço, registrar incidentes e cumprir obrigações legais ou ordens de autoridades. Base legal: cumprimento de obrigação legal ou regulatória (LGPD, art. 7º, II, e art. 11, II, "a").',
          ],
          'Os consentimentos pedidos no cadastro são condição para usar o SuaSaúde, porque tratar os seus dados de saúde é o próprio serviço oferecido (LGPD, art. 9º, § 3º). Você pode revogá-los a qualquer momento (seção 19).',
          'Nunca usamos os seus dados de saúde para publicidade, para obter vantagem econômica (LGPD, art. 11, § 4º), para fins discriminatórios ou para treinar modelos de IA.',
        ],
      },
      {
        numero: 13,
        titulo: 'Como a inteligência artificial usa seus dados',
        blocos: [
          [
            'Leitura de documentos: o arquivo é enviado ao modelo como está, inclusive com o nome e os demais dados impressos nele. O resultado é uma lista de valores com unidade e referência, e filtros mascaram nome, e-mail, telefone e CPF no texto gerado.',
            'Smartwatch: o modelo recebe apenas estatísticas já calculadas (médias, tendências e correlações), e não os arquivos que você importou.',
            'Assistente: além da sua mensagem e do anexo que você enviar, o modelo consulta somente dados da sua própria conta (perfil, documentos e resultados, remédios, agenda, vacinas, análises do smartwatch e memória), sem poder alterar nenhum deles.',
          ],
          'O processamento ocorre na conta AWS do projeto, no Amazon Bedrock. Segundo a AWS, os dados enviados não são compartilhados com a Anthropic, fornecedora do modelo, nem usados para aprimorar os modelos. Pela documentação da AWS, o modelo usado hoje não exige que o Amazon Bedrock guarde as mensagens depois da resposta. Se passarmos a usar um modelo que exija essa retenção, atualizaremos esta política antes.',
        ],
      },
      {
        numero: 14,
        titulo: 'Com quem compartilhamos',
        blocos: [
          'Não vendemos, não alugamos e não cedemos os seus dados. Eles só passam por:',
          [
            'Amazon Web Services (AWS): provedora de nuvem que hospeda o aplicativo (login, banco de dados, arquivos, funções e IA). Atua como operadora e trata os dados apenas para prestar esses serviços.',
            'Google: só se você escolher entrar com o Google, ou se tocar para adicionar um compromisso ao Google Agenda. Nesse caso, o título, a data, o local e as observações do compromisso são abertos no Google Agenda, sob os termos do Google.',
            'Sistema do seu celular (Apple ou Google): o serviço que converte a sua localização em estado e município, quando você permite a localização, e o sistema de notificações, que exibe os lembretes.',
            'Serviços públicos de dados abertos do Ministério da Saúde: recebem apenas o nome ou o código do município, para listar campanhas e unidades de saúde. O serviço de tradução automática dos textos da USPSTF recebe apenas textos públicos, nunca dados seus.',
            'Autoridades públicas: quando a lei ou uma ordem judicial exigir, nos limites dessa exigência.',
          ],
        ],
      },
      {
        numero: 15,
        titulo: 'Transferência internacional de dados',
        blocos: [
          'Os seus dados ficam armazenados nos Estados Unidos, na região us-east-1 (Virgínia do Norte) da AWS. Quando a IA é usada, o processamento pode ocorrer também nas regiões us-east-2 (Ohio) ou us-west-2 (Oregon), sempre dentro dos Estados Unidos e com tráfego criptografado.',
          'Resumo da transferência:',
          [
            'Finalidade: hospedar o aplicativo e executar as funções descritas na seção 12.',
            'Forma: envio criptografado ao provedor de nuvem, com armazenamento acessível apenas pela sua conta.',
            'Duração: enquanto sua conta existir, ou até você apagar os dados (seção 16).',
            'País de destino: Estados Unidos.',
            'Quem recebe: Amazon Web Services, Inc., como operadora.',
            'Base legal: o seu consentimento específico e em destaque (LGPD, art. 33, VIII), pedido em uma caixa própria no cadastro.',
          ],
          'Os Estados Unidos não têm decisão de adequação da ANPD, ou seja, a autoridade brasileira não reconheceu que o país oferece proteção de dados equivalente à brasileira. Você pode pedir mais informações sobre a transferência pelo canal da seção 10 e revogar este consentimento a qualquer momento (seção 19).',
        ],
      },
      {
        numero: 16,
        titulo: 'Onde e por quanto tempo guardamos',
        blocos: [
          [
            'Os dados ficam nos serviços da AWS indicados na seção 15 enquanto sua conta existir, ou até você apagá-los.',
            'Você pode apagar, no próprio aplicativo e a qualquer momento: documentos (o arquivo e os valores lidos dele), importações do smartwatch (os arquivos e a análise), conversas do assistente (as mensagens), fatos da memória e compromissos. O que você apaga é removido de fato, sem cópia marcada como apagada.',
            'Para apagar a conta inteira, inclusive os arquivos anexados às conversas e o histórico de doses de remédios, peça pelo canal da seção 10. A exclusão é concluída em até 15 dias, salvo o que a lei nos obrigar a conservar (LGPD, art. 16).',
            'O aplicativo guarda no seu celular uma cópia de algumas listas (como exames, remédios e vacinas) e da sua localização aproximada, para abrir mais rápido. Essa cópia fica protegida pelo isolamento do sistema do celular e é removida quando você apaga os dados do aplicativo ou o desinstala.',
          ],
        ],
      },
      {
        numero: 17,
        titulo: 'Como protegemos seus dados',
        blocos: [
          [
            'Conexões criptografadas (HTTPS/TLS) entre o aplicativo e os servidores.',
            'Dados armazenados com a criptografia em repouso padrão da AWS.',
            'Cada registro e cada arquivo pertencem a uma conta, e o acesso é bloqueado para qualquer outra, inclusive nas funções de IA, que só leem dados do dono identificado pelo login.',
            'Login gerenciado pelo Amazon Cognito, com requisitos mínimos de senha.',
            'Filtros contra instruções maliciosas enviadas à IA e contra respostas fora das regras do aplicativo.',
            'A equipe só acessa dados de uma conta quando isso é necessário para atender a um pedido do titular ou corrigir uma falha, e para nenhuma outra finalidade.',
          ],
          'Nenhum sistema é totalmente imune a falhas. Se ocorrer um incidente de segurança que possa trazer risco ou dano relevante a você, comunicaremos a você e à ANPD em até 3 dias úteis, como determina a Resolução CD/ANPD nº 15/2024.',
        ],
      },
      {
        numero: 18,
        titulo: 'Seus direitos como titular',
        blocos: [
          'A LGPD (art. 18) garante a você, gratuitamente, o direito de:',
          [
            'confirmar se tratamos seus dados e acessá-los;',
            'corrigir dados incompletos, inexatos ou desatualizados;',
            'pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei;',
            'pedir a portabilidade dos seus dados;',
            'pedir a eliminação dos dados tratados com o seu consentimento;',
            'saber com quem compartilhamos seus dados;',
            'ser informado sobre a possibilidade de não consentir e sobre as consequências da recusa;',
            'revogar o consentimento;',
            'pedir a revisão de decisões tomadas unicamente com base em tratamento automatizado (art. 20);',
            'opor-se a tratamento feito em desacordo com a lei.',
          ],
          'Vários desses direitos você exerce direto no aplicativo: ver e corrigir o Perfil de Saúde; conferir e corrigir os valores lidos dos documentos; ver, editar e apagar os fatos da memória do assistente; e apagar documentos, importações e conversas. Para os demais, inclusive receber uma cópia completa dos seus dados e excluir a conta, use o canal da seção 10. Respondemos em até 15 dias (LGPD, art. 19, II).',
          'Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD), pelo site gov.br/anpd.',
        ],
      },
      {
        numero: 19,
        titulo: 'Consentimento, recusa e revogação',
        blocos: [
          'Você pode recusar os consentimentos pedidos no cadastro. Nesse caso, a criação da conta não é concluída, porque o SuaSaúde não funciona sem tratar dados de saúde.',
          'Você pode revogar os consentimentos a qualquer momento, de graça, pelo canal da seção 10. A revogação interrompe o tratamento dali para frente, o que encerra o uso do aplicativo, e o que foi feito antes dela continua válido (LGPD, art. 8º, § 5º). Ao receber o pedido, perguntaremos se você também quer a eliminação dos dados já guardados e se deseja uma cópia deles antes.',
          'A memória do assistente tem consentimento próprio: você pode desligá-la e apagar os fatos guardados em Mais > Memória do assistente.',
          'As permissões do celular (câmera, fotos e arquivos, localização e notificações) são pedidas só quando uma função precisa delas e podem ser retiradas a qualquer momento nos ajustes do aparelho. Os lembretes são agendados no próprio celular e mostram o nome e a dose do remédio, ou o título do compromisso, inclusive na tela bloqueada. Você pode mudar isso nos ajustes de notificação do aparelho.',
        ],
      },
      {
        numero: 20,
        titulo: 'Crianças e adolescentes',
        blocos: [
          'O SuaSaúde é destinado a maiores de 18 anos e não é direcionado a crianças e adolescentes. Se soubermos que uma conta pertence a menor de 18 anos, poderemos suspendê-la e eliminar os dados, avisando o titular ou o responsável sempre que possível.',
        ],
      },
    ],
  },
];

/**
 * Os três aceites do cadastro, cada um na sua caixa e nenhum pré-marcado.
 *
 * São três, e não uma, porque a LGPD pede consentimento "específico e
 * destacado" para dado de saúde (art. 11, I) e, para a transferência
 * internacional, consentimento que distinga "claramente esta de outras
 * finalidades" (art. 33, VIII). Uma caixa única de "aceito tudo" seria a
 * autorização genérica que o art. 8º, § 4º, declara nula.
 */
export const ACEITES_DO_CADASTRO = [
  {
    id: 'termos',
    texto: 'Li e aceito os Termos de Uso e a Política de Privacidade.',
  },
  {
    id: 'dadosDeSaude',
    texto:
      'Autorizo o tratamento dos meus dados de saúde, inclusive por inteligência artificial, para as finalidades da seção 12.',
  },
  {
    id: 'transferenciaInternacional',
    texto:
      'Autorizo que esses dados sejam armazenados e processados pela AWS nos Estados Unidos (seção 15).',
  },
] as const;

export type AceiteDoCadastroId = (typeof ACEITES_DO_CADASTRO)[number]['id'];

/** O que o cadastro grava como prova: qual versão foi aceita, e quando (ISO 8601). */
export type AceiteDosTermos = {
  versao: string;
  aceitoEm: string;
};

/** O essencial, mostrado junto das caixas para ninguém aceitar às cegas (art. 9º). */
export const RESUMO_DOS_TERMOS = [
  'Seus dados de saúde ficam na sua conta. Não são vendidos nem usados em publicidade.',
  'A IA lê documentos e responde perguntas, mas não diagnostica e pode errar.',
  'Os dados ficam em servidores da AWS nos Estados Unidos.',
  'Você pode corrigir, apagar e revogar o consentimento quando quiser.',
] as const;
