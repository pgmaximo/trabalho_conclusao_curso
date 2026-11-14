# Interações medicamentosas: fonte dos dados

A funcionalidade de alerta de interação medicamentosa (tela "Medicamentos") **não consulta nenhuma API externa em tempo real**. Essa decisão foi tomada após avaliar as alternativas disponíveis no momento da implementação.

## Por que não uma base de dados de interações

Fontes conferidas em 14/11/2026:

| Alternativa | Por que não serviu | Fonte |
|---|---|---|
| **RxNav** (National Library of Medicine, EUA): era a API gratuita de interação mais usada | **Descontinuada.** A NLM anunciou em 03/07/2023: "The Drug-Drug Interaction API will be discontinued on or about January 2, 2024. RxNav's Interactions tab will also be removed." O FAQ confirma: "RxNav's drug/drug interaction features were discontinued on January 2, 2024." O restante do RxNav (RxNorm) continua no ar, mas só identifica medicamentos; não traz interações | [RxNav (notícias)](https://lhncbc.nlm.nih.gov/RxNav/) · [RxNav FAQs](https://lhncbc.nlm.nih.gov/RxNav/information/FAQs.html) |
| **DrugBank** | A **API é comercial**, com preço sob consulta. A licença acadêmica é gratuita, mas não comercial (CC BY-NC 4.0), depende de pedido aprovado pela DrugBank e entrega o download do dataset, sem API. A página da versão 5.1.15 avisava que os downloads acadêmicos estavam temporariamente suspensos. Nenhuma das duas opções permite consulta em tempo real pelo app sem contrato pago | [Academic Research](https://go.drugbank.com/academic_research/) · [Termos de uso](https://trust.drugbank.com/drugbank-trust-center/drugbank-terms-of-service) · [Preços](https://go.drugbank.com/pricing) (a página bloqueia leitura automatizada; o detalhe "sem API no plano acadêmico" veio do resumo dela na busca e deve ser conferido no navegador) |
| **openFDA** (FDA, EUA) | A API de rótulos devolve as **seções do rótulo** dos medicamentos aprovados nos EUA (documentos SPL convertidos em JSON). O campo `drug_interactions` é o texto da seção de interações, e não uma lista estruturada de pares. Usá-lo exigiria extrair os pares de prosa em inglês e traduzi-los. O próprio openFDA avisa: "Do not rely on openFDA to make decisions regarding medical care." | [Drug Labeling Overview](https://open.fda.gov/apis/drug/label/) · [Searchable Fields](https://open.fda.gov/apis/drug/label/searchable-fields/) |

Observação: segundo o FAQ da NLM, os dados de interação do RxNav vinham de uma lista de interações de alta prioridade para prontuário eletrônico, do CredibleMeds e do próprio DrugBank. Com o fim da API gratuita, o caminho restante levava às condições de licença do DrugBank.

## O que foi feito no lugar

Optou-se, em vez disso, por um dataset curado manualmente e embutido no app (`src/data/drugInteractions/`), sem chamadas de rede:

- **`aliases.ts`** — mapeia nomes comerciais brasileiros e variantes em inglês/português para o princípio ativo canônico (ex.: "Aradois", "Losartan" → `losartana`), permitindo casar o texto livre digitado pelo usuário com o princípio ativo correto.
- **`pairs.ts`** — cerca de 19 pares de interação clinicamente bem estabelecidos, cada um com uma explicação de risco e de mecanismo farmacológico em português.

**Base de conhecimento:** cada um dos 19 pares em `pairs.ts` pertence a uma de seis classes farmacológicas bem documentadas. A tabela abaixo cita, para cada classe, a referência específica consultada para validar o mecanismo e o risco descritos — portanto cobre a totalidade do dataset, não apenas uma amostra:

| Pares cobertos | Mecanismo | Referência |
|---|---|---|
| warfarina+ibuprofeno, warfarina+diclofenaco, warfarina+aas, warfarina+claritromicina, warfarina+fluoxetina | Revisão sistemática de todas as interações medicamentosas da warfarina (AINEs, AAS, macrolídeos, ISRS) | HOLBROOK, A. M.; PEREIRA, J. A.; LABIRIS, R.; MCDONALD, H.; DOUKETIS, J. D.; CROWTHER, M.; WELLS, P. S. Systematic overview of warfarin and its drug and food interactions. *Archives of Internal Medicine*, v. 165, n. 10, p. 1095–1106, 2005. PMID: 15911722. |
| warfarina+ibuprofeno, warfarina+diclofenaco | Risco de sangramento com AINEs em uso de anticoagulante oral | KENT, A. P. Navigating NSAID Use in Patients Receiving Oral Anticoagulation: Is There a Safe Course? *Thrombosis and Haemostasis*, v. 120, n. 7, p. 1001–1003, 2020. DOI: 10.1055/s-0040-1713098. |
| aas+ibuprofeno, aas+diclofenaco | Ibuprofeno bloqueia o sítio de ligação do AAS na COX-1, reduzindo seu efeito antiplaquetário/cardioprotetor | CATELLA-LAWSON, F.; REILLY, M. P.; KAPOOR, S. C.; CUCCHIARA, A. J.; DEMARCO, S.; TOURNIER, B.; VYAS, S. N.; FITZGERALD, G. A. Cyclooxygenase inhibitors and the antiplatelet effects of aspirin. *New England Journal of Medicine*, v. 345, n. 25, p. 1809–1817, 2001. |
| fluoxetina+sertralina, fluoxetina+tramadol, sertralina+tramadol | Síndrome serotoninérgica por excesso de serotonina no SNC | BOYER, E. W.; SHANNON, M. The Serotonin Syndrome. *New England Journal of Medicine*, v. 352, n. 11, p. 1112–1120, 2005. |
| enalapril+espironolactona, losartana+espironolactona, captopril+espironolactona | Hipercalemia por IECA/BRA associado a diurético poupador de potássio | JUURLINK, D. N.; MAMDANI, M. M.; LEE, D. S.; KOPP, A.; AUSTIN, P. C.; LAUPACIS, A.; REDELMEIER, D. A. Rates of hyperkalemia after publication of the Randomized Aldactone Evaluation Study. *New England Journal of Medicine*, v. 351, n. 6, p. 543–551, 2004. |
| sinvastatina+claritromicina, sinvastatina+eritromicina | Inibição do CYP3A4 pelo macrolídeo, elevando os níveis da estatina e o risco de rabdomiólise | FALLAH, A.; DEEP, M.; SMALLWOOD, D.; HUGHES, P. Life-threatening rhabdomyolysis following the interaction of two commonly prescribed medications. *Australasian Medical Journal*, 2013; e MHRA (Medicines and Healthcare products Regulatory Agency, Reino Unido). [Simvastatin: updated advice on drug interactions](https://www.gov.uk/drug-safety-update/simvastatin-updated-advice-on-drug-interactions). *Drug Safety Update*. |
| enalapril+ibuprofeno, losartana+ibuprofeno, captopril+ibuprofeno, diclofenaco+enalapril | AINE reduz a síntese de prostaglandinas renais, contrariando o efeito do IECA/BRA e piorando a função renal | LAPI, F.; AZOULAY, L.; YIN, H.; NESSIM, S. J.; SUISSA, S. Concurrent use of diuretics, angiotensin converting enzyme inhibitors, and angiotensin receptor blockers with non-steroidal anti-inflammatory drugs and risk of acute kidney injury: nested case-control study. *BMJ*, v. 346, p. e8525, 2013. |

Além dessas referências por mecanismo, a tabela de nomes comerciais brasileiros (`aliases.ts`) foi conferida contra:

- ANVISA. [Bulário Eletrônico](https://consultas.anvisa.gov.br/#/bulario/) — correspondência entre nomes comerciais brasileiros e princípios ativos.

⚠️ **Importante:** a lista é propositalmente pequena e **não exaustiva** — cobre apenas combinações amplamente conhecidas (ex.: anticoagulante + AINE, IECA/BRA + diurético poupador de potássio, estatina + macrolídeo, combinações serotoninérgicas). Ela não substitui avaliação médica ou farmacêutica e deve ser tratada como apoio informativo, no mesmo espírito das demais funcionalidades de IA do app (nunca diagnóstico). Para uso além do escopo acadêmico deste TCC, o dataset precisaria ser revisado e expandido por um farmacêutico/profissional qualificado e, idealmente, substituído por uma base de dados clínica validada (ex.: DrugBank, Micromedex).
