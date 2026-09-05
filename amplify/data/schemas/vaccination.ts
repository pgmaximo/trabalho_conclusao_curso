import { a } from '@aws-amplify/backend';
import { getVaccinationCampaigns } from '../../functions/get-vaccination-campaigns/resource.js';
import { getVaccinationSites } from '../../functions/get-vaccination-sites/resource.js';

export const vaccinationSchema = {
  VaccineDose: a
    .model({
      name: a.string().required(), // "Influenza (gripe)", "Dupla adulto (dT)", "Hepatite B"
      doseNumber: a.integer(), // opcional — "3ª dose"; ausente = vacina sem numeração
      appliedDate: a.date(), // NULLABLE — nulo = ainda não aplicada ("Próximas recomendadas")
      location: a.string(), // só preenchido quando appliedDate existe
      dueDate: a.date(), // data/janela recomendada (quando appliedDate é nulo)
      recommendedIntervalYears: a.integer(), // reforços recorrentes (ex. dT = 10)
      isCampaign: a.boolean().default(false), // vinculada a uma campanha sazonal (ex. gripe)
      notes: a.string(),
      // Campos aditivos (feat_vacina) — mantidos opcionais para não quebrar
      // registros já persistidos (regra 5 da constituição: não corromper dados
      // existentes). Ver src/data/calendarioNacionalVacinacao.ts.
      catalogId: a.string(), // id em VacinaCatalogo — ausente = registro legado de texto livre
      seriesTotal: a.integer(), // total de doses da série no momento do cadastro (ex. 3 p/ Hepatite B)
      lot: a.string(), // lote do imunobiológico
      manufacturer: a.string(), // fabricante
    })
    .authorization((allow) => [allow.owner()]),

  // Cache do resultado de getVaccinationCampaigns, gravado/lido diretamente
  // pela Lambda via SDK do DynamoDB (mesmo padrao de acesso direto usado por
  // get-prevention-recommendations/handler.ts para UserProfile) — nunca
  // consultado pelo client Amplify Data diretamente, por isso a autorizacao
  // aqui é apenas o piso exigido pelo schema (nunca exercida na prática).
  VaccinationCampaignCache: a
    .model({
      uf: a.string().required(), // 'NACIONAL' quando sem recorte regional
      payload: a.json().required(),
      expiresAt: a.integer().required(), // epoch seconds
    })
    .identifier(['uf'])
    .authorization((allow) => [allow.authenticated().to(['read'])]),

  VaccinationCampaignResult: a.customType({
    catalogId: a.string().required(),
    nome: a.string().required(),
    ativa: a.boolean().required(),
    janelaInicio: a.string(), // YYYY-MM-DD
    janelaFim: a.string(), // YYYY-MM-DD
    dosesNoPeriodo: a.integer(), // contagem real (amostral) de doses do PNI no período/UF — null quando não apurável
    ufReferencia: a.string(), // UF usada para o recorte regional (ou null = nacional)
    dataAsOf: a.string(), // data mais recente vista na amostra do PNI (YYYY-MM-DD) — nunca omitir na UI
    fonteUrl: a.string().required(),
  }),

  getVaccinationCampaigns: a
    .query()
    .arguments({ uf: a.string(), codigoMunicipio: a.string() })
    .returns(
      a.customType({
        campanhas: a.ref('VaccinationCampaignResult').array(),
        amostragem: a.string(), // aviso explícito de que a contagem é amostral, não censo
      }),
    )
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(getVaccinationCampaigns)),

  // Cache próprio (TTL mais longo — ~7 dias, unidades de saúde mudam pouco)
  // do resultado de getVaccinationSites, mesmo padrão de acesso direto via
  // SDK que VaccinationCampaignCache acima.
  VaccinationSiteCache: a
    .model({
      codigoMunicipio: a.string().required(),
      payload: a.json().required(),
      expiresAt: a.integer().required(),
    })
    .identifier(['codigoMunicipio'])
    .authorization((allow) => [allow.authenticated().to(['read'])]),

  VaccinationSiteResult: a.customType({
    cnes: a.string().required(),
    nome: a.string().required(),
    bairro: a.string(),
    logradouro: a.string(),
    latitude: a.float(),
    longitude: a.float(),
    distanciaKm: a.float(),
  }),

  getVaccinationSites: a
    .query()
    .arguments({ codigoMunicipio: a.string().required(), latitude: a.float(), longitude: a.float() })
    .returns(
      a.customType({
        unidades: a.ref('VaccinationSiteResult').array(),
      }),
    )
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(getVaccinationSites)),
};
