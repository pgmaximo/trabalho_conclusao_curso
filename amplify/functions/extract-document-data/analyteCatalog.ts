// ARQUIVO GERADO -- nao editar a mao.
// Fonte: estudos-ia/05-vocabularios/loinc/loinc-analitos-suasaude.csv (LOINC 2.83)
// Gerador: scripts/gerar-catalogo-analitos.mjs
//
// Nenhum codigo LOINC deste arquivo foi digitado por uma pessoa (D27). Para
// mudar qualquer coisa aqui, mude o gerador ou o extrato e rode de novo.
//
// This material contains content from LOINC (http://loinc.org). LOINC is
// copyright (c) 1995-2024, Regenstrief Institute, Inc. and the Logical
// Observation Identifiers Names and Codes (LOINC) Committee and is available
// at no cost under the license at http://loinc.org/license. LOINC(R) is a
// registered United States trademark of Regenstrief Institute, Inc.

export type CanonicalAnalyte = {
  /** Codigo LOINC, lido do arquivo oficial. */
  code: string;
  /** Nome oficial do LOINC. Exigido pela clausula 10.3 da licenca: todo dado
   *  extraido anda junto do codigo E de um nome oficial. Nunca substituir por
   *  rotulo nosso. */
  label: string;
  /** O rotulo em portugues que a tela mostra. Nosso, campo acrescentado. */
  projectLabel: string;
  /** Painel do laudo (Hemograma, Lipidico, ...). Nosso. */
  panel: string;
  /** Unidade convencional brasileira (D17). Nossa -- acrescentada ao lado da
   *  do LOINC, nunca por cima dela (clausula 2). */
  canonicalUnit: string;
  /** EXAMPLE_UCUM_UNITS, preservada exatamente como o LOINC a escreveu. */
  loincExampleUnit: string;
  /** g/mol. null quando nao ha conversao molar para este analito. */
  molarMass: number | null;
  /** Nomes relacionados em portugues, do proprio LOINC (variante pt-BR).
   *  Nao sao traducao nossa -- ver D26 e a clausula 12 da licenca. */
  synonyms: string[];
  convertsToMolar: boolean;
};

export const ANALYTE_CATALOG: CanonicalAnalyte[] = [
  {
    "code": "718-7",
    "label": "Hemoglobin [Mass/volume] in Blood",
    "projectLabel": "Hemoglobina",
    "panel": "Hemograma",
    "canonicalUnit": "g/dL",
    "loincExampleUnit": "g/dL",
    "molarMass": null,
    "synonyms": [
      "Hemoglobina",
      "Hgb Sg-mCnc",
      "Hgb",
      "Hb",
      "Haemoglobin"
    ],
    "convertsToMolar": false
  },
  {
    "code": "4544-3",
    "label": "Hematocrit [Volume Fraction] of Blood by Automated count",
    "projectLabel": "Hematocrito",
    "panel": "Hemograma",
    "canonicalUnit": "%",
    "loincExampleUnit": "%",
    "molarMass": null,
    "synonyms": [
      "Hematócrito",
      "Hct Fr Sg Auto",
      "Hct",
      "PCV",
      "Fr",
      "Volfr",
      "Percent"
    ],
    "convertsToMolar": false
  },
  {
    "code": "26453-1",
    "label": "Erythrocytes [#/volume] in Blood",
    "projectLabel": "Eritrocitos",
    "panel": "Hemograma",
    "canonicalUnit": "10*6/uL",
    "loincExampleUnit": "10*6/uL",
    "molarMass": null,
    "synonyms": [
      "Eritrócitos",
      "RBC # Sg",
      "RBC",
      "Red blood corpusles",
      "Red blood corpuscle",
      "Erthrocyte",
      "Erythrocyte",
      "Red blood cell"
    ],
    "convertsToMolar": false
  },
  {
    "code": "26464-8",
    "label": "Leukocytes [#/volume] in Blood",
    "projectLabel": "Leucocitos",
    "panel": "Hemograma",
    "canonicalUnit": "10*3/uL",
    "loincExampleUnit": "10*3/uL",
    "molarMass": null,
    "synonyms": [
      "Leucócitos",
      "Leucoc # Sg",
      "Leucoc",
      "White blood cell",
      "Leuc",
      "Leuk",
      "Leukocyte",
      "Lkcs"
    ],
    "convertsToMolar": false
  },
  {
    "code": "26515-7",
    "label": "Platelets [#/volume] in Blood",
    "projectLabel": "Plaquetas",
    "panel": "Hemograma",
    "canonicalUnit": "10*3/uL",
    "loincExampleUnit": "10*3/uL",
    "molarMass": null,
    "synonyms": [
      "Plaquetas",
      "plaqueta # Sg",
      "Platelet",
      "Plt",
      "Thrombocytes",
      "Platelt",
      "Thrb",
      "Thrombocyte"
    ],
    "convertsToMolar": false
  },
  {
    "code": "30428-7",
    "label": "MCV [Entitic mean volume] in Red Blood Cells",
    "projectLabel": "VCM",
    "panel": "Hemograma",
    "canonicalUnit": "fL",
    "loincExampleUnit": "fL",
    "molarMass": null,
    "synonyms": [
      "Volume Corpuscular Médio do eritrócito",
      "MCV RBC",
      "Vol",
      "MCV",
      "Erythrocytes",
      "Red blood corpusles",
      "Red blood corpuscle",
      "Red blood cell"
    ],
    "convertsToMolar": false
  },
  {
    "code": "28539-5",
    "label": "MCH [Entitic mass]",
    "projectLabel": "HCM",
    "panel": "Hemograma",
    "canonicalUnit": "pg",
    "loincExampleUnit": "pg",
    "molarMass": null,
    "synonyms": [
      "Hemoglobina eritrocitária Corpuscular Média",
      "MCH RBC Qn",
      "Hgb",
      "Hb",
      "Haemoglobin",
      "MCH",
      "Erythrocytes",
      "Red blood corpusles"
    ],
    "convertsToMolar": false
  },
  {
    "code": "28540-3",
    "label": "MCHC [Entitic Mass/volume] in Red Blood Cells",
    "projectLabel": "CHCM",
    "panel": "Hemograma",
    "canonicalUnit": "g/dL",
    "loincExampleUnit": "g/dL",
    "molarMass": null,
    "synonyms": [
      "Concentração de Hemoglobina eritrocitária Corpuscular Média",
      "MCHC RBC-mCnc",
      "Hgb",
      "Hb",
      "Haemoglobin",
      "MCHC",
      "MCH",
      "Erythrocytes"
    ],
    "convertsToMolar": false
  },
  {
    "code": "30385-9",
    "label": "Erythrocyte [DistWidth] in Blood",
    "projectLabel": "RDW",
    "panel": "Hemograma",
    "canonicalUnit": "%",
    "loincExampleUnit": "%",
    "molarMass": null,
    "synonyms": [
      "Amplitude de distribuição do tamanho dos eritrócitos",
      "RDW RBC-Rto",
      "RDW",
      "Erythrocyte morphology index",
      "RCMI",
      "Erythrocytes",
      "Red blood corpusles",
      "Red blood corpuscle"
    ],
    "convertsToMolar": false
  },
  {
    "code": "26499-4",
    "label": "Neutrophils [#/volume] in Blood",
    "projectLabel": "Neutrofilos (absoluto)",
    "panel": "Hemograma",
    "canonicalUnit": "10*3/uL",
    "loincExampleUnit": "10*3/uL",
    "molarMass": null,
    "synonyms": [
      "Neutrófilos",
      "Neutrophils # Sg",
      "PNM",
      "Neutrophil",
      "Neutr",
      "PMN",
      "Neut",
      "#"
    ],
    "convertsToMolar": false
  },
  {
    "code": "26511-6",
    "label": "Neutrophils/Leukocytes in Blood",
    "projectLabel": "Neutrofilos (%)",
    "panel": "Hemograma",
    "canonicalUnit": "%",
    "loincExampleUnit": "%",
    "molarMass": null,
    "synonyms": [
      "Neutrófilos/100 leucócitos",
      "Neutrophils Fr Sg",
      "PNM",
      "Neutrophil",
      "Neutr",
      "PMN",
      "Neut",
      "Leucoc"
    ],
    "convertsToMolar": false
  },
  {
    "code": "26474-7",
    "label": "Lymphocytes [#/volume] in Blood",
    "projectLabel": "Linfocitos (absoluto)",
    "panel": "Hemograma",
    "canonicalUnit": "10*3/uL",
    "loincExampleUnit": "10*3/uL",
    "molarMass": null,
    "synonyms": [
      "Linfócitos",
      "Lymphocytes # Sg",
      "Lymphs",
      "Lymph",
      "Lymphocyte",
      "Lympho",
      "Lymphs%",
      "Lymp"
    ],
    "convertsToMolar": false
  },
  {
    "code": "26478-8",
    "label": "Lymphocytes/Leukocytes in Blood",
    "projectLabel": "Linfocitos (%)",
    "panel": "Hemograma",
    "canonicalUnit": "%",
    "loincExampleUnit": "%",
    "molarMass": null,
    "synonyms": [
      "Linfócitos/100 leucócitos",
      "Lymphocytes Fr Sg",
      "Lymphs",
      "Lymph",
      "Lymphocyte",
      "Lympho",
      "Lymphs%",
      "Lymp"
    ],
    "convertsToMolar": false
  },
  {
    "code": "26484-6",
    "label": "Monocytes [#/volume] in Blood",
    "projectLabel": "Monocitos (absoluto)",
    "panel": "Hemograma",
    "canonicalUnit": "10*3/uL",
    "loincExampleUnit": "10*3/uL",
    "molarMass": null,
    "synonyms": [
      "Monócitos",
      "Monocytes # Sg",
      "Monos",
      "Mono",
      "Monocyte",
      "#",
      "Number concentration",
      "Count"
    ],
    "convertsToMolar": false
  },
  {
    "code": "26485-3",
    "label": "Monocytes/Leukocytes in Blood",
    "projectLabel": "Monocitos (%)",
    "panel": "Hemograma",
    "canonicalUnit": "%",
    "loincExampleUnit": "%",
    "molarMass": null,
    "synonyms": [
      "Monócitos/100 leucócitos",
      "Monocytes Fr Sg",
      "Monos",
      "Mono",
      "Monocyte",
      "Leucoc",
      "White blood cell",
      "Leuc"
    ],
    "convertsToMolar": false
  },
  {
    "code": "26449-9",
    "label": "Eosinophils [#/volume] in Blood",
    "projectLabel": "Eosinofilos (absoluto)",
    "panel": "Hemograma",
    "canonicalUnit": "10*3/uL",
    "loincExampleUnit": "10*3/uL",
    "molarMass": null,
    "synonyms": [
      "Eosinófilos",
      "Eosinophil # Sg",
      "Eosinophil",
      "Eos",
      "Eosins",
      "Eosin",
      "Eosino",
      "#"
    ],
    "convertsToMolar": false
  },
  {
    "code": "26450-7",
    "label": "Eosinophils/Leukocytes in Blood",
    "projectLabel": "Eosinofilos (%)",
    "panel": "Hemograma",
    "canonicalUnit": "%",
    "loincExampleUnit": "%",
    "molarMass": null,
    "synonyms": [
      "Eosinófilos/100 leucócitos",
      "Eosinophil Fr Sg",
      "Eosinophil",
      "Eos",
      "Eosins",
      "Eosin",
      "Eosino",
      "Leucoc"
    ],
    "convertsToMolar": false
  },
  {
    "code": "26444-0",
    "label": "Basophils [#/volume] in Blood",
    "projectLabel": "Basofilos (absoluto)",
    "panel": "Hemograma",
    "canonicalUnit": "10*3/uL",
    "loincExampleUnit": "10*3/uL",
    "molarMass": null,
    "synonyms": [
      "Basófilos",
      "Basophils # Sg",
      "Baso",
      "Basos",
      "Basophil",
      "Bph",
      "#",
      "Number concentration"
    ],
    "convertsToMolar": false
  },
  {
    "code": "30180-4",
    "label": "Basophils/Leukocytes in Blood",
    "projectLabel": "Basofilos (%)",
    "panel": "Hemograma",
    "canonicalUnit": "%",
    "loincExampleUnit": "%",
    "molarMass": null,
    "synonyms": [
      "Basófilos/100 leucócitos",
      "Basophils Fr Sg",
      "Baso",
      "Basos",
      "Basophil",
      "Bph",
      "Leucoc",
      "White blood cell"
    ],
    "convertsToMolar": false
  },
  {
    "code": "2093-3",
    "label": "Cholesterol [Mass/volume] in Serum or Plasma",
    "projectLabel": "Colesterol total",
    "panel": "Lipidico",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 386.65,
    "synonyms": [
      "Colesterol",
      "Colest SerPl-mCnc",
      "Cholest",
      "Chol",
      "Choles",
      "Lipid",
      "Cholesterol total",
      "Cholesterols"
    ],
    "convertsToMolar": true
  },
  {
    "code": "2085-9",
    "label": "Cholesterol in HDL [Mass/volume] in Serum or Plasma",
    "projectLabel": "HDL",
    "panel": "Lipidico",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 386.65,
    "synonyms": [
      "Colesterol.HDL",
      "HDLc SerPl-mCnc",
      "HDLc",
      "TCHHDL",
      "HDL-C",
      "High density lipoprotein cholesterols",
      "Chol",
      "Choles"
    ],
    "convertsToMolar": true
  },
  {
    "code": "2089-1",
    "label": "Cholesterol in LDL [Mass/volume] in Serum or Plasma",
    "projectLabel": "LDL",
    "panel": "Lipidico",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 386.65,
    "synonyms": [
      "Colesterol.LDL",
      "LDLc SerPl-mCnc",
      "LDLc",
      "LDL-C",
      "Low density lipoprotein cholesterols",
      "Low density lipoprotein cholesterol",
      "Chol",
      "Choles"
    ],
    "convertsToMolar": true
  },
  {
    "code": "2091-7",
    "label": "Cholesterol in VLDL [Mass/volume] in Serum or Plasma",
    "projectLabel": "VLDL",
    "panel": "Lipidico",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 386.65,
    "synonyms": [
      "Colesterol.VLDL",
      "VLDLc SerPl-mCnc",
      "VLDLc",
      "Very low density lipoprotein cholesterols",
      "Chol",
      "Choles",
      "Cholest",
      "Lipid"
    ],
    "convertsToMolar": true
  },
  {
    "code": "2571-8",
    "label": "Triglyceride [Mass/volume] in Serum or Plasma",
    "projectLabel": "Triglicerides",
    "panel": "Lipidico",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 885.4,
    "synonyms": [
      "Triglicérides",
      "Trigl SerPl-mCnc",
      "Trigl",
      "TG",
      "Trigly",
      "Triglycrides",
      "Trig",
      "Triglycerides"
    ],
    "convertsToMolar": true
  },
  {
    "code": "43396-1",
    "label": "Cholesterol non HDL [Mass/volume] in Serum or Plasma",
    "projectLabel": "Colesterol nao-HDL",
    "panel": "Lipidico",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 386.65,
    "synonyms": [
      "Colesterol.não HDL",
      "NonHDLc SerPl-mCnc",
      "NonHDLc",
      "LDL + IDL + VLDL",
      "Cholest",
      "Chol",
      "Choles",
      "Lipid"
    ],
    "convertsToMolar": true
  },
  {
    "code": "2345-7",
    "label": "Glucose [Mass/volume] in Serum or Plasma",
    "projectLabel": "Glicose",
    "panel": "Glicemia",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 180.16,
    "synonyms": [
      "Glicose",
      "Glicose SerPl-mCnc",
      "Glu",
      "Gluc",
      "Glucoseur",
      "SerPl",
      "SerPlas",
      "SerP"
    ],
    "convertsToMolar": true
  },
  {
    "code": "4548-4",
    "label": "Hemoglobin A1c/Hemoglobin.total in Blood",
    "projectLabel": "Hemoglobina glicada",
    "panel": "Glicemia",
    "canonicalUnit": "%",
    "loincExampleUnit": "%",
    "molarMass": null,
    "synonyms": [
      "Hemoglobina A1c/Hemoglobina.total",
      "Hgb A1c SFr Sg",
      "Hgb A1c",
      "Glycohemogolobin",
      "Glycohaemogolobin",
      "GHb",
      "HA1c",
      "HBA1c"
    ],
    "convertsToMolar": false
  },
  {
    "code": "20448-7",
    "label": "Insulin [Units/volume] in Serum or Plasma",
    "projectLabel": "Insulina",
    "panel": "Glicemia",
    "canonicalUnit": "u[IU]/mL",
    "loincExampleUnit": "u[IU]/mL",
    "molarMass": null,
    "synonyms": [
      "Insulina",
      "Insulin SerPl-aCnc",
      "Insul",
      "Humulin",
      "HUM",
      "IH7",
      "Lente",
      "NPH"
    ],
    "convertsToMolar": false
  },
  {
    "code": "1986-9",
    "label": "C peptide [Mass/volume] in Serum or Plasma",
    "projectLabel": "Peptideo C",
    "panel": "Glicemia",
    "canonicalUnit": "ng/mL",
    "loincExampleUnit": "ng/mL",
    "molarMass": null,
    "synonyms": [
      "Peptídeo C",
      "C peptide SerPl-mCnc",
      "Connecting peptide of insulin",
      "Pro-insulin c peptide",
      "SerPl",
      "SerPlas",
      "SerP",
      "SR"
    ],
    "convertsToMolar": false
  },
  {
    "code": "2160-0",
    "label": "Creatinine [Mass/volume] in Serum or Plasma",
    "projectLabel": "Creatinina",
    "panel": "Renal",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 113.12,
    "synonyms": [
      "Creatinina",
      "Creat SerPl-mCnc",
      "Creat",
      "CR",
      "SerPl",
      "SerPlas",
      "SerP",
      "SR"
    ],
    "convertsToMolar": true
  },
  {
    "code": "3091-6",
    "label": "Urea [Mass/volume] in Serum or Plasma",
    "projectLabel": "Ureia",
    "panel": "Renal",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 60.06,
    "synonyms": [
      "Uréia",
      "Urea SerPl-mCnc",
      "SerPl",
      "SerPlas",
      "SerP",
      "SR",
      "Pl",
      "Plsm"
    ],
    "convertsToMolar": true
  },
  {
    "code": "3084-1",
    "label": "Urate [Mass/volume] in Serum or Plasma",
    "projectLabel": "Acido urico",
    "panel": "Renal",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 168.11,
    "synonyms": [
      "Urato",
      "Urate SerPl-mCnc",
      "UA",
      "Urates",
      "Uric acid",
      "SerPl",
      "SerPlas",
      "SerP"
    ],
    "convertsToMolar": true
  },
  {
    "code": "1754-1",
    "label": "Albumin [Mass/volume] in Urine",
    "projectLabel": "Albumina urinaria",
    "panel": "Renal",
    "canonicalUnit": "mg/L",
    "loincExampleUnit": "g/dL",
    "molarMass": null,
    "synonyms": [
      "Albumina",
      "Albumin Ur-mCnc",
      "Protein.albumin",
      "Alb",
      "Ur",
      "Urn",
      "UA",
      "Chemistry"
    ],
    "convertsToMolar": false
  },
  {
    "code": "1742-6",
    "label": "Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma",
    "projectLabel": "ALT (TGP)",
    "panel": "Hepatica",
    "canonicalUnit": "U/L",
    "loincExampleUnit": "U/L",
    "molarMass": null,
    "synonyms": [
      "Alanina aminotransferase",
      "ALT SerPl-cCnc",
      "ALT",
      "Glutamic-pyruvic transferase",
      "SGPT",
      "Alanine transaminase",
      "Ala",
      "L-alanine"
    ],
    "convertsToMolar": false
  },
  {
    "code": "1920-8",
    "label": "Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma",
    "projectLabel": "AST (TGO)",
    "panel": "Hepatica",
    "canonicalUnit": "U/L",
    "loincExampleUnit": "U/L",
    "molarMass": null,
    "synonyms": [
      "Aspartato amino transferase",
      "AST SerPl-cCnc",
      "AST",
      "Aspartate amino transferase",
      "Glutamic oxaloacetic transaminase",
      "Aspartate transaminase",
      "SGOT",
      "Asp"
    ],
    "convertsToMolar": false
  },
  {
    "code": "2324-2",
    "label": "Gamma glutamyl transferase [Enzymatic activity/volume] in Serum or Plasma",
    "projectLabel": "Gama-GT",
    "panel": "Hepatica",
    "canonicalUnit": "U/L",
    "loincExampleUnit": "U/L",
    "molarMass": null,
    "synonyms": [
      "Gama Glutamil Transferase",
      "GGT SerPl-cCnc",
      "GGT",
      "Gamma-GTP",
      "GGTP",
      "Gamma glutamyl transpeptidase",
      "Catalytic Concentration",
      "SerPl"
    ],
    "convertsToMolar": false
  },
  {
    "code": "6768-6",
    "label": "Alkaline phosphatase [Enzymatic activity/volume] in Serum or Plasma",
    "projectLabel": "Fosfatase alcalina",
    "panel": "Hepatica",
    "canonicalUnit": "U/L",
    "loincExampleUnit": "U/L",
    "molarMass": null,
    "synonyms": [
      "Fosfatase alcalina",
      "ALP SerPl-cCnc",
      "ALP",
      "Alk phos",
      "Alkaline phos",
      "ALKP",
      "AP",
      "Alkaline phosphatase.total"
    ],
    "convertsToMolar": false
  },
  {
    "code": "1975-2",
    "label": "Bilirubin.total [Mass/volume] in Serum or Plasma",
    "projectLabel": "Bilirrubina total",
    "panel": "Hepatica",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 584.66,
    "synonyms": [
      "Bilirrubina",
      "Bilirub SerPl-mCnc",
      "Bilirub",
      "Bili",
      "TBIL",
      "Bilirubins",
      "SerPl",
      "SerPlas"
    ],
    "convertsToMolar": true
  },
  {
    "code": "1968-7",
    "label": "Bilirubin.direct [Mass/volume] in Serum or Plasma",
    "projectLabel": "Bilirrubina direta",
    "panel": "Hepatica",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 584.66,
    "synonyms": [
      "Bilirrubina.glicuronizada+Bilirrubina.ligada a albumina",
      "Bilirub Direct SerPl-mCnc",
      "Bilirub Direct",
      "TBIL-Bu",
      "Bilirubin direct",
      "Bilirub Conj",
      "Bc",
      "Bilirubin glucuronides"
    ],
    "convertsToMolar": true
  },
  {
    "code": "1971-1",
    "label": "Bilirubin.indirect [Mass/volume] in Serum or Plasma",
    "projectLabel": "Bilirrubina indireta",
    "panel": "Hepatica",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 584.66,
    "synonyms": [
      "Bilirrubina.não glicuronizada",
      "Bilirub Indirect SerPl-mCnc",
      "Bilirub Indirect",
      "Bu",
      "Bilirubin indirect",
      "Bilirubin primary",
      "Bilirubin non-conjugated",
      "Bilirubin unconjugated"
    ],
    "convertsToMolar": true
  },
  {
    "code": "1751-7",
    "label": "Albumin [Mass/volume] in Serum or Plasma",
    "projectLabel": "Albumina",
    "panel": "Hepatica",
    "canonicalUnit": "g/dL",
    "loincExampleUnit": "g/dL",
    "molarMass": null,
    "synonyms": [
      "Albumina",
      "Albumin SerPl-mCnc",
      "Protein.albumin",
      "Alb",
      "SerPl",
      "SerPlas",
      "SerP",
      "SR"
    ],
    "convertsToMolar": false
  },
  {
    "code": "2885-2",
    "label": "Protein [Mass/volume] in Serum or Plasma",
    "projectLabel": "Proteinas totais",
    "panel": "Hepatica",
    "canonicalUnit": "g/dL",
    "loincExampleUnit": "g/dL",
    "molarMass": null,
    "synonyms": [
      "Proteína",
      "Prot SerPl-mCnc",
      "Prot",
      "PR",
      "SerPl",
      "SerPlas",
      "SerP",
      "SR"
    ],
    "convertsToMolar": false
  },
  {
    "code": "2951-2",
    "label": "Sodium [Moles/volume] in Serum or Plasma",
    "projectLabel": "Sodio",
    "panel": "Eletrolitos",
    "canonicalUnit": "mmol/L",
    "loincExampleUnit": "mmol/L",
    "molarMass": null,
    "synonyms": [
      "Sódio",
      "Sodium SerPl-sCnc",
      "Na",
      "Substance concentration",
      "SerPl",
      "SerPlas",
      "SerP",
      "SR"
    ],
    "convertsToMolar": false
  },
  {
    "code": "2823-3",
    "label": "Potassium [Moles/volume] in Serum or Plasma",
    "projectLabel": "Potassio",
    "panel": "Eletrolitos",
    "canonicalUnit": "mmol/L",
    "loincExampleUnit": "mmol/L",
    "molarMass": null,
    "synonyms": [
      "Potássio",
      "Potássio SerPl-sCnc",
      "K+",
      "Potass",
      "K",
      "Substance concentration",
      "SerPl",
      "SerPlas"
    ],
    "convertsToMolar": false
  },
  {
    "code": "2075-0",
    "label": "Chloride [Moles/volume] in Serum or Plasma",
    "projectLabel": "Cloro",
    "panel": "Eletrolitos",
    "canonicalUnit": "mmol/L",
    "loincExampleUnit": "mmol/L",
    "molarMass": null,
    "synonyms": [
      "Cloreto",
      "Chloride SerPl-sCnc",
      "Cl-",
      "Cl",
      "Substance concentration",
      "SerPl",
      "SerPlas",
      "SerP"
    ],
    "convertsToMolar": false
  },
  {
    "code": "17861-6",
    "label": "Calcium [Mass/volume] in Serum or Plasma",
    "projectLabel": "Calcio total",
    "panel": "Eletrolitos",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 40.08,
    "synonyms": [
      "Cálcio",
      "Cálcio SerPl-mCnc",
      "Cal",
      "Ca",
      "SerPl",
      "SerPlas",
      "SerP",
      "SR"
    ],
    "convertsToMolar": true
  },
  {
    "code": "1995-0",
    "label": "Calcium.ionized [Moles/volume] in Serum or Plasma",
    "projectLabel": "Calcio ionico",
    "panel": "Eletrolitos",
    "canonicalUnit": "mmol/L",
    "loincExampleUnit": "mmol/L",
    "molarMass": null,
    "synonyms": [
      "Cálcio.ionizado",
      "Ca-I SerPl-sCnc",
      "Ca-I",
      "Calcium free",
      "iCa",
      "Calcium active",
      "Coagulation factor I",
      "Cal"
    ],
    "convertsToMolar": false
  },
  {
    "code": "19123-9",
    "label": "Magnesium [Mass/volume] in Serum or Plasma",
    "projectLabel": "Magnesio",
    "panel": "Eletrolitos",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 24.31,
    "synonyms": [
      "Magnésio",
      "Magnesium SerPl-mCnc",
      "MAG",
      "Magnes",
      "Mg",
      "SerPl",
      "SerPlas",
      "SerP"
    ],
    "convertsToMolar": true
  },
  {
    "code": "2777-1",
    "label": "Phosphate [Mass/volume] in Serum or Plasma",
    "projectLabel": "Fosforo",
    "panel": "Eletrolitos",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 30.97,
    "synonyms": [
      "Fósforo",
      "Phosphate SerPl-mCnc",
      "Phos",
      "Phosphrous",
      "Phosphorous",
      "Pi",
      "i Phos",
      "PO4"
    ],
    "convertsToMolar": true
  },
  {
    "code": "3016-3",
    "label": "Thyrotropin [Units/volume] in Serum or Plasma",
    "projectLabel": "TSH",
    "panel": "Tireoide",
    "canonicalUnit": "u[IU]/mL",
    "loincExampleUnit": "m[IU]/L",
    "molarMass": null,
    "synonyms": [
      "Tirotropina",
      "TSH SerPl-aCnc",
      "TSH",
      "Thyrotropic hormone",
      "Thyroid stimulating hormone",
      "Arbitrary concentration",
      "SerPl",
      "SerPlas"
    ],
    "convertsToMolar": false
  },
  {
    "code": "3024-7",
    "label": "Thyroxine (T4) free [Mass/volume] in Serum or Plasma",
    "projectLabel": "T4 livre",
    "panel": "Tireoide",
    "canonicalUnit": "ng/dL",
    "loincExampleUnit": "ng/dL",
    "molarMass": 776.87,
    "synonyms": [
      "Tiroxina.livre",
      "T4 Free SerPl-mCnc",
      "T4 Free",
      "T-4",
      "FreeT4",
      "Thyrox",
      "Thyrx",
      "Thyroxin"
    ],
    "convertsToMolar": true
  },
  {
    "code": "3026-2",
    "label": "Thyroxine (T4) [Mass/volume] in Serum or Plasma",
    "projectLabel": "T4 total",
    "panel": "Tireoide",
    "canonicalUnit": "ug/dL",
    "loincExampleUnit": "ug/dL",
    "molarMass": 776.87,
    "synonyms": [
      "Tiroxina",
      "T4 SerPl-mCnc",
      "T4",
      "T-4",
      "Thyrox",
      "Thyrx",
      "Thyroxin",
      "Levothyroxine"
    ],
    "convertsToMolar": true
  },
  {
    "code": "3051-0",
    "label": "Triiodothyronine (T3) Free [Mass/volume] in Serum or Plasma",
    "projectLabel": "T3 livre",
    "panel": "Tireoide",
    "canonicalUnit": "pg/mL",
    "loincExampleUnit": "pg/mL",
    "molarMass": 650.98,
    "synonyms": [
      "Triiodotironina.livre",
      "T3Free SerPl-mCnc",
      "T3Free",
      "Triodothyrne",
      "T-3",
      "FT3",
      "T3",
      "SerPl"
    ],
    "convertsToMolar": true
  },
  {
    "code": "3053-6",
    "label": "Triiodothyronine (T3) [Mass/volume] in Serum or Plasma",
    "projectLabel": "T3 total",
    "panel": "Tireoide",
    "canonicalUnit": "ng/dL",
    "loincExampleUnit": "ng/dL",
    "molarMass": 650.98,
    "synonyms": [
      "Triiodotironina",
      "T3 SerPl-mCnc",
      "T3",
      "Triodothyrne",
      "T-3",
      "FT3",
      "SerPl",
      "SerPlas"
    ],
    "convertsToMolar": true
  },
  {
    "code": "8099-4",
    "label": "Thyroperoxidase Ab [Units/volume] in Serum or Plasma",
    "projectLabel": "Anti-TPO",
    "panel": "Tireoide",
    "canonicalUnit": "[IU]/mL",
    "loincExampleUnit": "[IU]/mL",
    "molarMass": null,
    "synonyms": [
      "Tiroperoxidase Ac",
      "Thyroperoxidase Ac Ser-aCnc",
      "Thyroid Microsomal",
      "Thyroid microsomes",
      "Thyroid peroxidase",
      "Iodide peroxidase",
      "TPO",
      "Arbitrary concentration"
    ],
    "convertsToMolar": false
  },
  {
    "code": "62292-8",
    "label": "25-Hydroxyvitamin D3+25-Hydroxyvitamin D2 [Mass/volume] in Serum or Plasma",
    "projectLabel": "Vitamina D (25-OH)",
    "panel": "Vitaminas",
    "canonicalUnit": "ng/mL",
    "loincExampleUnit": "ng/mL",
    "molarMass": 400.64,
    "synonyms": [
      "25-Hidroxi vitamina D"
    ],
    "convertsToMolar": true
  },
  {
    "code": "2132-9",
    "label": "Cobalamin (Vitamin B12) [Mass/volume] in Serum or Plasma",
    "projectLabel": "Vitamina B12",
    "panel": "Vitaminas",
    "canonicalUnit": "pg/mL",
    "loincExampleUnit": "pg/mL",
    "molarMass": 1355.37,
    "synonyms": [
      "Cobalaminas",
      "Vit B12 Ser-mCnc",
      "Vit B12",
      "Cbl",
      "Vitamin B12",
      "Cobalamin",
      "SR",
      "Chemistry"
    ],
    "convertsToMolar": true
  },
  {
    "code": "2284-8",
    "label": "Folate [Mass/volume] in Serum or Plasma",
    "projectLabel": "Acido folico",
    "panel": "Vitaminas",
    "canonicalUnit": "ng/mL",
    "loincExampleUnit": "ng/mL",
    "molarMass": 441.4,
    "synonyms": [
      "Folato",
      "Folate SerPl-mCnc",
      "Vit M",
      "Pteroylglutamate",
      "Folic acid",
      "Vitamin M",
      "Pteroylglutamic acid",
      "SerPl"
    ],
    "convertsToMolar": true
  },
  {
    "code": "1903-4",
    "label": "Ascorbate [Mass/volume] in Serum or Plasma",
    "projectLabel": "Vitamina C",
    "panel": "Vitaminas",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": 176.12,
    "synonyms": [
      "Ascorbato",
      "Vit C SerPl-mCnc",
      "Vit C",
      "Vitamin C",
      "Ascorbic acid",
      "SerPl",
      "SerPlas",
      "SerP"
    ],
    "convertsToMolar": true
  },
  {
    "code": "2923-1",
    "label": "Retinol [Mass/volume] in Serum or Plasma",
    "projectLabel": "Vitamina A",
    "panel": "Vitaminas",
    "canonicalUnit": "ug/dL",
    "loincExampleUnit": "ug/mL",
    "molarMass": 286.45,
    "synonyms": [
      "Retinol",
      "Vit A SerPl-mCnc",
      "Vit A",
      "Vit A1",
      "Vitamin A alcohol",
      "Vit A1 alcohol",
      "Vit A alcohol",
      "Axerophthol"
    ],
    "convertsToMolar": true
  },
  {
    "code": "1823-4",
    "label": "Alpha tocopherol [Mass/volume] in Serum or Plasma",
    "projectLabel": "Vitamina E",
    "panel": "Vitaminas",
    "canonicalUnit": "mg/L",
    "loincExampleUnit": "mg/L;mg/dL",
    "molarMass": 430.71,
    "synonyms": [
      "Alfa tocoferol",
      "A-Tocopherol Vit E SerPl-mCnc",
      "A-Tocopherol Vit E",
      "Tocopherols",
      "SerPl",
      "SerPlas",
      "SerP",
      "SR"
    ],
    "convertsToMolar": true
  },
  {
    "code": "2498-4",
    "label": "Iron [Mass/volume] in Serum or Plasma",
    "projectLabel": "Ferro serico",
    "panel": "Ferro",
    "canonicalUnit": "ug/dL",
    "loincExampleUnit": "ug/dL",
    "molarMass": 55.85,
    "synonyms": [
      "Ferro",
      "Iron SerPl-mCnc",
      "Fe",
      "SerPl",
      "SerPlas",
      "SerP",
      "SR",
      "Pl"
    ],
    "convertsToMolar": true
  },
  {
    "code": "2276-4",
    "label": "Ferritin [Mass/volume] in Serum or Plasma",
    "projectLabel": "Ferritina",
    "panel": "Ferro",
    "canonicalUnit": "ng/mL",
    "loincExampleUnit": "ng/mL",
    "molarMass": null,
    "synonyms": [
      "Ferritina",
      "Ferritin SerPl-mCnc",
      "SerPl",
      "SerPlas",
      "SerP",
      "SR",
      "Pl",
      "Plsm"
    ],
    "convertsToMolar": false
  },
  {
    "code": "3034-6",
    "label": "Transferrin [Mass/volume] in Serum or Plasma",
    "projectLabel": "Transferrina",
    "panel": "Ferro",
    "canonicalUnit": "mg/dL",
    "loincExampleUnit": "mg/dL",
    "molarMass": null,
    "synonyms": [
      "Transferrina",
      "Transferrin SerPl-mCnc",
      "Tf",
      "Siderophilin",
      "Trf",
      "SerPl",
      "SerPlas",
      "SerP"
    ],
    "convertsToMolar": false
  },
  {
    "code": "2502-3",
    "label": "Iron saturation [Mass Fraction] in Serum or Plasma",
    "projectLabel": "Saturacao de transferrina",
    "panel": "Ferro",
    "canonicalUnit": "%",
    "loincExampleUnit": "%",
    "molarMass": null,
    "synonyms": [
      "Saturação do ferro",
      "Iron Satn SerPl-mRto",
      "Iron Satn",
      "Fe",
      "mRto",
      "Mass concentration ratio",
      "SerPl",
      "SerPlas"
    ],
    "convertsToMolar": false
  },
  {
    "code": "2500-7",
    "label": "Iron binding capacity [Mass/volume] in Serum or Plasma",
    "projectLabel": "Capacidade de ligacao do ferro",
    "panel": "Ferro",
    "canonicalUnit": "ug/dL",
    "loincExampleUnit": "ug/dL",
    "molarMass": null,
    "synonyms": [
      "Capacidade de ligação do ferro",
      "TIBC SerPl-mCnc",
      "TIBC",
      "IBC",
      "Fe",
      "SerPl",
      "SerPlas",
      "SerP"
    ],
    "convertsToMolar": false
  },
  {
    "code": "1988-5",
    "label": "C reactive protein [Mass/volume] in Serum or Plasma",
    "projectLabel": "Proteina C reativa",
    "panel": "Inflamacao",
    "canonicalUnit": "mg/L",
    "loincExampleUnit": "mg/L",
    "molarMass": null,
    "synonyms": [
      "Proteína C Reativa",
      "CRP SerPl-mCnc",
      "Prot",
      "PR",
      "CRP",
      "C reactive peptide",
      "SerPl",
      "SerPlas"
    ],
    "convertsToMolar": false
  },
  {
    "code": "30341-2",
    "label": "Erythrocyte [Sedimentation Rate] in Blood",
    "projectLabel": "VHS",
    "panel": "Inflamacao",
    "canonicalUnit": "mm/h",
    "loincExampleUnit": "mm/h",
    "molarMass": null,
    "synonyms": [
      "Sedimentação de eritrócitos",
      "ESR Sg Qn",
      "ESR",
      "E.S.R.",
      "Sed rate",
      "Erythrocytes",
      "Red blood corpusles",
      "Red blood corpuscle"
    ],
    "convertsToMolar": false
  },
  {
    "code": "2857-1",
    "label": "Prostate specific Ag [Mass/volume] in Serum or Plasma",
    "projectLabel": "PSA total",
    "panel": "Inflamacao",
    "canonicalUnit": "ng/mL",
    "loincExampleUnit": "ng/mL",
    "molarMass": null,
    "synonyms": [
      "Prostático Específico Ag",
      "PSA SerPl-mCnc",
      "PSA",
      "Kallikrein 3",
      "SerPl",
      "SerPlas",
      "SerP",
      "SR"
    ],
    "convertsToMolar": false
  },
  {
    "code": "10886-0",
    "label": "Prostate Specific Ag Free [Mass/volume] in Serum or Plasma",
    "projectLabel": "PSA livre",
    "panel": "Inflamacao",
    "canonicalUnit": "ng/mL",
    "loincExampleUnit": "ng/mL",
    "molarMass": null,
    "synonyms": [
      "Prostático Específico Ag.livre",
      "PSA Free SerPl-mCnc",
      "PSA Free",
      "fPSA",
      "Kallikrein 3",
      "SerPl",
      "SerPlas",
      "SerP"
    ],
    "convertsToMolar": false
  },
  {
    "code": "2986-8",
    "label": "Testosterone [Mass/volume] in Serum or Plasma",
    "projectLabel": "Testosterona total",
    "panel": "Hormonios",
    "canonicalUnit": "ng/dL",
    "loincExampleUnit": "ng/dL",
    "molarMass": 288.42,
    "synonyms": [
      "Testosterona",
      "Testost SerPl-mCnc",
      "Testost",
      "Testos",
      "SerPl",
      "SerPlas",
      "SerP",
      "SR"
    ],
    "convertsToMolar": true
  },
  {
    "code": "2991-8",
    "label": "Testosterone Free [Mass/volume] in Serum or Plasma",
    "projectLabel": "Testosterona livre",
    "panel": "Hormonios",
    "canonicalUnit": "pg/mL",
    "loincExampleUnit": "pg/mL",
    "molarMass": 288.42,
    "synonyms": [
      "Testosterona.livre",
      "Testost Free SerPl-mCnc",
      "Testost Free",
      "Testosterone.unconjugated",
      "Testos",
      "SerPl",
      "SerPlas",
      "SerP"
    ],
    "convertsToMolar": true
  },
  {
    "code": "2143-6",
    "label": "Cortisol [Mass/volume] in Serum or Plasma",
    "projectLabel": "Cortisol",
    "panel": "Hormonios",
    "canonicalUnit": "ug/dL",
    "loincExampleUnit": "ug/dL",
    "molarMass": 362.46,
    "synonyms": [
      "Cortisol",
      "Cortis SerPl-mCnc",
      "Cortis",
      "Coritsol",
      "Compound F",
      "17-Hydroxycorticosterone",
      "SerPl",
      "SerPlas"
    ],
    "convertsToMolar": true
  },
  {
    "code": "2243-4",
    "label": "Estradiol (E2) [Mass/volume] in Serum or Plasma",
    "projectLabel": "Estradiol",
    "panel": "Hormonios",
    "canonicalUnit": "pg/mL",
    "loincExampleUnit": "pg/mL",
    "molarMass": 272.38,
    "synonyms": [
      "Estradiol",
      "Estradiol SerPl-mCnc",
      "Oestradiol",
      "E2",
      "17-beta estradiol",
      "SerPl",
      "SerPlas",
      "SerP"
    ],
    "convertsToMolar": true
  },
  {
    "code": "15067-2",
    "label": "Follitropin [Units/volume] in Serum or Plasma",
    "projectLabel": "FSH",
    "panel": "Hormonios",
    "canonicalUnit": "m[IU]/mL",
    "loincExampleUnit": "m[IU]/mL",
    "molarMass": null,
    "synonyms": [
      "Folitropina",
      "FSH SerPl-aCnc",
      "FSH",
      "Follicle stimulating hormone",
      "Arbitrary concentration",
      "SerPl",
      "SerPlas",
      "SerP"
    ],
    "convertsToMolar": false
  },
  {
    "code": "10501-5",
    "label": "Lutropin [Units/volume] in Serum or Plasma",
    "projectLabel": "LH",
    "panel": "Hormonios",
    "canonicalUnit": "m[IU]/mL",
    "loincExampleUnit": "m[IU]/mL",
    "molarMass": null,
    "synonyms": [
      "Luteotrofina",
      "LH SerPl-aCnc",
      "LH",
      "Interstitual cell stimulating hormone",
      "Leutinizing hormone",
      "Lutenizing hormone",
      "Lutenin",
      "Luteinizing hormone"
    ],
    "convertsToMolar": false
  },
  {
    "code": "2842-3",
    "label": "Prolactin [Mass/volume] in Serum or Plasma",
    "projectLabel": "Prolactina",
    "panel": "Hormonios",
    "canonicalUnit": "ng/mL",
    "loincExampleUnit": "ng/mL",
    "molarMass": null,
    "synonyms": [
      "Prolactina",
      "Prolactin SerPl-mCnc",
      "Mammatropic hormone",
      "Lactotropic hormone",
      "Lactotropin",
      "PRL",
      "Mammotropin",
      "SerPl"
    ],
    "convertsToMolar": false
  },
  {
    "code": "19080-1",
    "label": "Choriogonadotropin [Units/volume] in Serum or Plasma",
    "projectLabel": "Beta-HCG",
    "panel": "Hormonios",
    "canonicalUnit": "m[IU]/mL",
    "loincExampleUnit": "m[IU]/mL",
    "molarMass": null,
    "synonyms": [
      "Gonadotrofina Coriônica",
      "HCG SerPl-aCnc",
      "HCG",
      "Chorionic gonadotropin",
      "CG",
      "Human chorionic gonadotropin",
      "Pregnancy test",
      "Choriogonadotropins total"
    ],
    "convertsToMolar": false
  },
  {
    "code": "30522-7",
    "label": "C reactive protein [Mass/volume] in Serum or Plasma by High sensitivity method",
    "projectLabel": "Proteina C reativa ultrassensivel",
    "panel": "Inflamacao",
    "canonicalUnit": "mg/L",
    "loincExampleUnit": "mg/L",
    "molarMass": null,
    "synonyms": [
      "Proteína C Reativa",
      "CRP SerPl High Sens-mCnc",
      "Prot",
      "PR",
      "CRP",
      "C reactive peptide",
      "SerPl",
      "SerPlas"
    ],
    "convertsToMolar": false
  }
];

const PELO_CODIGO = new Map(ANALYTE_CATALOG.map((a) => [a.code, a]));

/** Nunca lanca: codigo desconhecido devolve null, e quem chama manda a linha
 *  para revisao em vez de chutar (tarefa 5). */
export function findAnalyteByCode(code: string): CanonicalAnalyte | null {
  return PELO_CODIGO.get(code) ?? null;
}

/** A lista curta que vai no prompt (tarefa 9). Leva os nomes em portugues,
 *  porque o laudo brasileiro e em portugues, e NAO leva massa molar, que e
 *  insumo do conversor e nao do mapeamento. */
export function candidatesForPrompt(): Array<
  Pick<CanonicalAnalyte, 'code' | 'label' | 'projectLabel' | 'canonicalUnit' | 'synonyms'>
> {
  return ANALYTE_CATALOG.map(({ code, label, projectLabel, canonicalUnit, synonyms }) => ({
    code,
    label,
    projectLabel,
    canonicalUnit,
    synonyms,
  }));
}
