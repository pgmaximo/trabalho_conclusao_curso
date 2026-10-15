/**
 * Pares de interação medicamentosa curados manualmente — não vêm de uma API
 * ou dataset externo. Decisão registrada ao planejar esta funcionalidade: as
 * APIs gratuitas de interação (RxNav/NLM) foram descontinuadas, a alternativa
 * da DrugBank é paga, e o openFDA só expõe texto livre em inglês. Optou-se
 * por uma lista curta, offline e determinística, cobrindo combinações
 * farmacologicamente bem estabelecidas.
 *
 * Diferente de estudos-ia/05-vocabularios (LOINC), que usa um pipeline
 * CSV -> script gerador porque é um vocabulário externo licenciado e
 * versionado, este dataset é pequeno e de autoria própria — um módulo TS
 * escrito à mão é suficiente, sem necessidade de gerador.
 *
 * Lista não exaustiva. Não substitui avaliação médica ou farmacêutica.
 */

export type InteractionSeverity = 'warning' | 'danger';

export type DrugInteractionPair = {
  /** Slug estável, usado como key de lista na UI. */
  id: string;
  /** Chave canônica do princípio ativo (ver aliases.ts). */
  a: string;
  /** Chave canônica do outro princípio ativo. */
  b: string;
  severity: InteractionSeverity;
  /** Explicação do risco em linguagem simples, pt-BR. */
  riskPt: string;
  /** Razão farmacológica resumida, pt-BR. */
  mechanismPt: string;
};

function pair(
  a: string,
  b: string,
  severity: InteractionSeverity,
  riskPt: string,
  mechanismPt: string,
): DrugInteractionPair {
  return { id: `${a}__${b}`, a, b, severity, riskPt, mechanismPt };
}

export const DRUG_INTERACTION_PAIRS: DrugInteractionPair[] = [
  pair(
    'warfarina',
    'ibuprofeno',
    'danger',
    'Risco aumentado de sangramento grave (digestivo ou em outros locais).',
    'AINEs inibem a agregação plaquetária e irritam a mucosa gástrica, somando-se ao efeito anticoagulante da warfarina.',
  ),
  pair(
    'warfarina',
    'diclofenaco',
    'danger',
    'Risco aumentado de sangramento, semelhante à combinação com outros AINEs.',
    'Diclofenaco é um AINE com o mesmo efeito antiplaquetário e gástrico, somado ao anticoagulante.',
  ),
  pair(
    'warfarina',
    'aas',
    'danger',
    'Risco muito elevado de hemorragia.',
    'Dois agentes antitrombóticos com mecanismos diferentes — inibição plaquetária e anticoagulação — se somam.',
  ),
  pair(
    'warfarina',
    'claritromicina',
    'danger',
    'Pode aumentar perigosamente o efeito anticoagulante, elevando o risco de sangramento.',
    'Macrolídeos como a claritromicina inibem o metabolismo hepático da warfarina (CYP3A4), elevando seus níveis no sangue.',
  ),
  pair(
    'warfarina',
    'fluoxetina',
    'warning',
    'Pode potencializar o efeito anticoagulante e, isoladamente, já aumenta o risco de sangramento.',
    'ISRS como a fluoxetina reduzem a agregação plaquetária e podem interferir no metabolismo da warfarina.',
  ),
  pair(
    'aas',
    'ibuprofeno',
    'warning',
    'Aumenta risco de sangramento e de irritação gástrica.',
    'Dois antiagregantes/AINEs somam o efeito sobre as plaquetas e a mucosa gástrica; o ibuprofeno pode também reduzir o efeito cardioprotetor do AAS em baixa dose.',
  ),
  pair(
    'aas',
    'diclofenaco',
    'warning',
    'Aumenta risco de sangramento digestivo.',
    'Soma do efeito antiplaquetário do AAS com a irritação gástrica e o efeito antiplaquetário do diclofenaco.',
  ),
  pair(
    'fluoxetina',
    'sertralina',
    'danger',
    'Risco de síndrome serotoninérgica (agitação, febre, rigidez muscular, tremores).',
    'Dois inibidores seletivos de recaptação de serotonina juntos elevam demais os níveis de serotonina no sistema nervoso central.',
  ),
  pair(
    'fluoxetina',
    'tramadol',
    'danger',
    'Risco de síndrome serotoninérgica e de convulsões.',
    'O tramadol também tem ação serotoninérgica; combinado a um ISRS, o excesso de serotonina pode causar essa síndrome e reduzir o limiar convulsivo.',
  ),
  pair(
    'sertralina',
    'tramadol',
    'danger',
    'Mesmo risco de síndrome serotoninérgica da combinação com fluoxetina.',
    'Sertralina (ISRS) e tramadol (ação serotoninérgica) somam o efeito sobre a serotonina pelo mesmo mecanismo.',
  ),
  pair(
    'enalapril',
    'espironolactona',
    'danger',
    'Risco de hipercalemia grave (potássio alto no sangue), podendo causar arritmias cardíacas.',
    'O IECA reduz a excreção de potássio e a espironolactona é um diurético poupador de potássio — o efeito se soma.',
  ),
  pair(
    'losartana',
    'espironolactona',
    'danger',
    'Mesmo risco de hipercalemia grave da combinação com IECA.',
    'O BRA reduz a excreção de potássio pelo mesmo eixo hormonal, somando-se ao efeito poupador de potássio da espironolactona.',
  ),
  pair(
    'captopril',
    'espironolactona',
    'danger',
    'Mesmo risco de hipercalemia grave.',
    'Mesmo mecanismo do enalapril: IECA associado a diurético poupador de potássio.',
  ),
  pair(
    'sinvastatina',
    'claritromicina',
    'danger',
    'Risco aumentado de rabdomiólise (lesão muscular grave).',
    'A claritromicina inibe a enzima que metaboliza a sinvastatina (CYP3A4), elevando muito seus níveis no sangue.',
  ),
  pair(
    'sinvastatina',
    'eritromicina',
    'danger',
    'Mesmo risco de rabdomiólise da combinação com claritromicina.',
    'A eritromicina é outro macrolídeo que inibe a mesma enzima (CYP3A4), pelo mesmo mecanismo.',
  ),
  pair(
    'enalapril',
    'ibuprofeno',
    'warning',
    'Pode reduzir o efeito anti-hipertensivo do enalapril e piorar a função renal.',
    'AINEs reduzem a síntese de prostaglandinas renais, o que contraria o efeito do IECA e pode reduzir o fluxo sanguíneo renal.',
  ),
  pair(
    'losartana',
    'ibuprofeno',
    'warning',
    'Pode reduzir o efeito anti-hipertensivo da losartana e afetar os rins.',
    'Mesmo mecanismo do enalapril com ibuprofeno, com um BRA no lugar do IECA.',
  ),
  pair(
    'captopril',
    'ibuprofeno',
    'warning',
    'Pode reduzir o efeito anti-hipertensivo do captopril e afetar os rins.',
    'Mesmo mecanismo do enalapril com ibuprofeno.',
  ),
  pair(
    'diclofenaco',
    'enalapril',
    'warning',
    'Pode reduzir o efeito anti-hipertensivo do enalapril e afetar os rins.',
    'Mesmo mecanismo do AINE com IECA, com diclofenaco no lugar do ibuprofeno.',
  ),
];
