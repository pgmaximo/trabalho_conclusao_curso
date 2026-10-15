# -*- coding: utf-8 -*-
"""Gera loinc-analitos-suasaude.csv a partir do release oficial do LOINC.

NENHUM codigo LOINC e digitado a mao neste arquivo. Cada linha do extrato sai de
uma busca por (COMPONENT, SYSTEM, PROPERTY) no Loinc.csv oficial, com dois
criterios de desempate, nesta ordem:

  1) METHOD_TYP vazio -- o termo neutro de metodo tem preferencia, porque o
     laudo nem sempre informa o metodo, e escolher um termo especifico de metodo
     faria um laudo silencioso mapear para o codigo errado;
  2) menor COMMON_TEST_RANK -- o ranqueamento de uso do proprio LOINC, em que
     1 e o exame mais comum. Termo sem ranqueamento vai para o fim.

COMO RODAR

  1. Baixar o release completo do LOINC em https://loinc.org/downloads/
     (exige aceitar a licenca -- ver ../licencas.md).
  2. Descompactar e apontar ORIGEM abaixo para a pasta, ou passar o caminho
     como primeiro argumento:

     python gerar-extrato.py C:/caminho/para/Loinc_2.83

  O script espera encontrar, dentro dessa pasta:
     LoincTable/Loinc.csv
     AccessoryFiles/LinguisticVariants/ptBR11LinguisticVariant.csv

Os arquivos de origem nao entram no repositorio: somados passam de 100 MB, e a
licenca nao exige que entrem. O que entra e o extrato, a licenca e este script.

This material contains content from LOINC (http://loinc.org). LOINC is copyright
(c) 1995-2024, Regenstrief Institute, Inc. and the Logical Observation
Identifiers Names and Codes (LOINC) Committee and is available at no cost under
the license at http://loinc.org/license. LOINC(R) is a registered United States
trademark of Regenstrief Institute, Inc.
"""
import csv, io, os, re, sys

VERSAO_LOINC = '2.83'
ORIGEM = r'C:/Users/pedro/Desktop/Loinc_2.83'
csv.field_size_limit(10_000_000)

SER = r'Ser/Plas|Ser|Plas'

# O EIXO DO TEMPO (TIME_ASPCT), acrescentado no Bloco 10. Sem ele, urina de 24
# horas e urina de amostra isolada caem na mesma tripla -- o SYSTEM e `Urine`
# nas duas -- e o alvo resolve para o termo de maior ranqueamento, que pode ser
# qualquer um dos dois. Todo alvo sem tempo explicito e PONTUAL.
TEMPO_PADRAO = 'Pt'

# (painel, rotulo do projeto, COMPONENT, SYSTEM, PROPERTY[, TIME_ASPCT])
ALVOS = [
    ('Hemograma', 'Hemoglobina',            r'Hemoglobin',                 r'Bld', 'MCnc'),
    ('Hemograma', 'Hematocrito',            r'Erythrocyte/Blood',          r'Bld', 'VFr'),
    ('Hemograma', 'Eritrocitos',            r'Erythrocytes',               r'Bld', 'NCnc'),
    ('Hemograma', 'Leucocitos',             r'Leukocytes',                 r'Bld', 'NCnc'),
    ('Hemograma', 'Plaquetas',              r'Platelets',                  r'Bld', 'NCnc'),
    ('Hemograma', 'VCM',                    r'Observation',                r'RBC', 'EntMeanVol'),
    ('Hemograma', 'HCM',                    r'Hemoglobin',                 r'RBC', 'EntMass'),
    ('Hemograma', 'CHCM',                   r'Hemoglobin',                 r'RBC', 'EntMCnc'),
    ('Hemograma', 'RDW',                    r'Erythrocyte',                r'Bld', 'DistWidth'),
    ('Hemograma', 'Neutrofilos (absoluto)', r'Neutrophils',                r'Bld', 'NCnc'),
    ('Hemograma', 'Neutrofilos (%)',        r'Neutrophils/Leukocytes',     r'Bld', 'NFr'),
    ('Hemograma', 'Linfocitos (absoluto)',  r'Lymphocytes',                r'Bld', 'NCnc'),
    ('Hemograma', 'Linfocitos (%)',         r'Lymphocytes/Leukocytes',     r'Bld', 'NFr'),
    ('Hemograma', 'Monocitos (absoluto)',   r'Monocytes',                  r'Bld', 'NCnc'),
    ('Hemograma', 'Monocitos (%)',          r'Monocytes/Leukocytes',       r'Bld', 'NFr'),
    ('Hemograma', 'Eosinofilos (absoluto)', r'Eosinophils',                r'Bld', 'NCnc'),
    ('Hemograma', 'Eosinofilos (%)',        r'Eosinophils/Leukocytes',     r'Bld', 'NFr'),
    ('Hemograma', 'Basofilos (absoluto)',   r'Basophils',                  r'Bld', 'NCnc'),
    ('Hemograma', 'Basofilos (%)',          r'Basophils/Leukocytes',       r'Bld', 'NFr'),

    ('Lipidico', 'Colesterol total',        r'Cholesterol',                SER, 'MCnc'),
    ('Lipidico', 'HDL',                     r'Cholesterol\.in HDL',        SER, 'MCnc'),
    ('Lipidico', 'LDL',                     r'Cholesterol\.in LDL',        SER, 'MCnc'),
    ('Lipidico', 'VLDL',                    r'Cholesterol\.in VLDL',       SER, 'MCnc'),
    ('Lipidico', 'Triglicerides',           r'Triglyceride',               SER, 'MCnc'),
    ('Lipidico', 'Colesterol nao-HDL',      r'Cholesterol\.non HDL',       SER, 'MCnc'),

    ('Glicemia', 'Glicose',                 r'Glucose',                    SER, 'MCnc'),
    ('Glicemia', 'Hemoglobina glicada',     r'Hemoglobin A1c/Hemoglobin\.total', r'Bld|RBC', 'MFr'),
    ('Glicemia', 'Insulina',                r'Insulin',                    SER, 'ACnc'),
    ('Glicemia', 'Peptideo C',              r'C peptide',                  SER, 'MCnc'),

    ('Renal', 'Creatinina',                 r'Creatinine',                 SER, 'MCnc'),
    ('Renal', 'Ureia',                      r'Urea',                       SER, 'MCnc'),
    ('Renal', 'Acido urico',                r'Urate',                      SER, 'MCnc'),
    ('Renal', 'Albumina urinaria',          r'Albumin',                    r'Urine', 'MCnc'),

    ('Hepatica', 'ALT (TGP)',               r'Alanine aminotransferase',   SER, 'CCnc'),
    ('Hepatica', 'AST (TGO)',               r'Aspartate aminotransferase', SER, 'CCnc'),
    ('Hepatica', 'Gama-GT',                 r'Gamma glutamyl transferase', SER, 'CCnc'),
    ('Hepatica', 'Fosfatase alcalina',      r'Alkaline phosphatase',       SER, 'CCnc'),
    ('Hepatica', 'Bilirrubina total',       r'Bilirubin',                  SER, 'MCnc'),
    ('Hepatica', 'Bilirrubina direta',      r'Bilirubin\.glucuronidated\+Bilirubin\.albumin bound', SER, 'MCnc'),
    ('Hepatica', 'Bilirrubina indireta',    r'Bilirubin\.non-glucuronidated', SER, 'MCnc'),
    ('Hepatica', 'Albumina',                r'Albumin',                    SER, 'MCnc'),
    ('Hepatica', 'Proteinas totais',        r'Protein',                    SER, 'MCnc'),

    ('Eletrolitos', 'Sodio',                r'Sodium',                     SER, 'SCnc'),
    ('Eletrolitos', 'Potassio',             r'Potassium',                  SER, 'SCnc'),
    ('Eletrolitos', 'Cloro',                r'Chloride',                   SER, 'SCnc'),
    ('Eletrolitos', 'Calcio total',         r'Calcium',                    SER, 'MCnc'),
    ('Eletrolitos', 'Calcio ionico',        r'Calcium\.ionized',           SER, 'SCnc'),
    ('Eletrolitos', 'Magnesio',             r'Magnesium',                  SER, 'MCnc'),
    ('Eletrolitos', 'Fosforo',              r'Phosphate',                  SER, 'MCnc'),

    ('Tireoide', 'TSH',                     r'Thyrotropin',                SER, 'ACnc'),
    ('Tireoide', 'T4 livre',                r'Thyroxine\.free',            SER, 'MCnc'),
    ('Tireoide', 'T4 total',                r'Thyroxine',                  SER, 'MCnc'),
    ('Tireoide', 'T3 livre',                r'Triiodothyronine\.free',     SER, 'MCnc'),
    ('Tireoide', 'T3 total',                r'Triiodothyronine',           SER, 'MCnc'),
    ('Tireoide', 'Anti-TPO',                r'Thyroperoxidase Ab',         SER, 'ACnc'),

    ('Vitaminas', 'Vitamina D (25-OH)',     r'Calcidiol\+ercalcidiol',     SER, 'MCnc'),
    ('Vitaminas', 'Vitamina B12',           r'Cobalamins',                 SER, 'MCnc'),
    ('Vitaminas', 'Acido folico',           r'Folate',                     SER, 'MCnc'),
    ('Vitaminas', 'Vitamina C',             r'Ascorbate',                  SER, 'MCnc'),
    ('Vitaminas', 'Vitamina A',             r'Retinol',                    SER, 'MCnc'),
    # Alfa-tocoferol, e nao "Tocopherols" (totais): a massa molar de
    # conversao-unidades.md (430,71) e a do alfa, e o laudo brasileiro reporta o alfa.
    ('Vitaminas', 'Vitamina E',             r'Alpha tocopherol',           SER, 'MCnc'),

    ('Ferro', 'Ferro serico',               r'Iron',                       SER, 'MCnc'),
    ('Ferro', 'Ferritina',                  r'Ferritin',                   SER, 'MCnc'),
    ('Ferro', 'Transferrina',               r'Transferrin',                SER, 'MCnc'),
    ('Ferro', 'Saturacao de transferrina',  r'Iron saturation',            SER, 'MFr'),
    ('Ferro', 'Capacidade de ligacao do ferro', r'Iron binding capacity',  SER, 'MCnc'),

    ('Inflamacao', 'Proteina C reativa',    r'C reactive protein',         SER, 'MCnc'),
    ('Inflamacao', 'VHS',                   r'Erythrocyte',                r'Bld', 'Sedimentation Rate'),
    # PSA saiu de `Inflamacao` no Bloco 10 (pendencia S8): com os marcadores
    # tumorais no extrato, o painel virou `Tumoral`. Rotulo nosso -- o codigo
    # nao muda.
    ('Tumoral', 'PSA total',                r'Prostate specific Ag',       SER, 'MCnc'),
    ('Tumoral', 'PSA livre',                r'Prostate specific Ag\.free', SER, 'MCnc'),

    ('Hormonios', 'Testosterona total',     r'Testosterone',               SER, 'MCnc'),
    ('Hormonios', 'Testosterona livre',     r'Testosterone\.free',         SER, 'MCnc'),
    ('Hormonios', 'Cortisol',               r'Cortisol',                   SER, 'MCnc'),
    ('Hormonios', 'Estradiol',              r'Estradiol',                  SER, 'MCnc'),
    ('Hormonios', 'FSH',                    r'Follitropin',                SER, 'ACnc'),
    ('Hormonios', 'LH',                     r'Lutropin',                   SER, 'ACnc'),
    ('Hormonios', 'Prolactina',             r'Prolactin',                  SER, 'MCnc'),
    ('Hormonios', 'Beta-HCG',               r'Choriogonadotropin',         SER, 'ACnc'),
    # --- Bloco 10: a ampliacao do estudo cobertura-brasileira-lacunas.md. -----
    # Toda tripla abaixo foi CONFERIDA contra o release 2.83 antes de ser
    # escrita, e varias divergiram do estudo -- as divergencias estao
    # registradas em ../pendencias.md, secao "O que a conferencia corrigiu".

    ('Hemograma', 'Reticulocitos (%)',      r'Reticulocytes/Erythrocytes', r'Bld', 'NFr'),
    ('Hemograma', 'Reticulocitos (absoluto)', r'Reticulocytes',            r'Bld', 'NCnc'),
    ('Hemograma', 'Segmentados (absoluto)', r'Neutrophils\.segmented',     r'Bld', 'NCnc'),
    ('Hemograma', 'Segmentados (%)',        r'Neutrophils\.segmented/Leukocytes', r'Bld', 'NFr'),
    ('Hemograma', 'Bastonetes (absoluto)',  r'Neutrophils\.band form',     r'Bld', 'NCnc'),
    ('Hemograma', 'Bastonetes (%)',         r'Neutrophils\.band form/Leukocytes', r'Bld', 'NFr'),
    # A armadilha do VCM de novo: a informacao esta na PROPRIEDADE.
    ('Hemograma', 'VPM',                    r'Platelet',                   r'Bld', 'EntMeanVol'),

    # Coagulograma: plasma pobre em plaquetas, nunca a constante SER. TP, TTPA e
    # INR estao no ALVOS_COM_METODO, porque no 2.83 os tres sao `Coagulation`.
    ('Coagulacao', 'Fibrinogenio',          r'Fibrinogen',                 r'PPP', 'MCnc'),
    ('Coagulacao', 'Atividade de protrombina', r'Prothrombin\.activity actual/normal', r'PPP', 'RelTime'),

    ('Enzimas', 'Amilase',                  r'Amylase',                    SER, 'CCnc'),
    ('Enzimas', 'Lipase',                   r'Triacylglycerol lipase',     SER, 'CCnc'),
    ('Enzimas', 'CK total (CPK)',           r'Creatine kinase',            SER, 'CCnc'),
    ('Enzimas', 'CK-MB atividade',          r'Creatine kinase\.MB',        SER, 'CCnc'),
    ('Enzimas', 'CK-MB massa',              r'Creatine kinase\.MB',        SER, 'MCnc'),
    ('Enzimas', 'LDH',                      r'Lactate dehydrogenase',      SER, 'CCnc'),

    # Urina tipo I: so o que e numero COMPARAVEL. Contagem por volume entra;
    # por campo nao (pendencia S4). Densidade: a armadilha do VCM outra vez.
    ('Urina', 'Densidade urinaria',         r'Observation',                r'Urine', 'SpGrav'),
    ('Urina', 'Leucocitos na urina',        r'Leukocytes',                 r'Urine', 'NCnc'),
    ('Urina', 'Hemacias na urina',          r'Erythrocytes',               r'Urine', 'NCnc'),

    # Urina de 24 horas e relacoes -- o motivo de o eixo do tempo existir.
    ('Renal', 'Creatinina urinaria',        r'Creatinine',                 r'Urine', 'MCnc'),
    ('Renal', 'Proteinuria de 24 horas',    r'Protein',                    r'Urine', 'MRat', '24H'),
    ('Renal', 'Albumina urinaria de 24 horas', r'Albumin',                 r'Urine', 'MRat', '24H'),
    ('Renal', 'Relacao albumina/creatinina', r'Albumin/Creatinine',        r'Urine', 'MRto'),
    ('Renal', 'Clearance de creatinina',    r'Creatinine renal clearance', r'Urine\+Ser/Plas', 'VRat', '24H'),
    ('Renal', 'Calcio urinario de 24 horas', r'Calcium',                   r'Urine', 'MRat', '24H'),

    ('Imunologia', 'IgA',                   r'IgA',                        SER, 'MCnc'),
    ('Imunologia', 'IgG',                   r'IgG',                        SER, 'MCnc'),
    ('Imunologia', 'IgM',                   r'IgM',                        SER, 'MCnc'),
    ('Imunologia', 'IgE total',             r'IgE',                        SER, 'ACnc'),
    ('Imunologia', 'Complemento C3',        r'Complement C3',              SER, 'MCnc'),
    ('Imunologia', 'Complemento C4',        r'Complement C4',              SER, 'MCnc'),
    ('Imunologia', 'Fator reumatoide',      r'Rheumatoid factor',          SER, 'ACnc'),

    ('Tireoide', 'Anti-tireoglobulina',     r'Thyroglobulin Ab',           SER, 'ACnc'),
    ('Tireoide', 'Tireoglobulina',          r'Thyroglobulin',              SER, 'MCnc'),
    ('Tireoide', 'TRAb',                    r'Thyrotropin receptor Ab',    SER, 'ACnc'),
    ('Tireoide', 'T3 reverso',              r'Triiodothyronine\.reverse',  SER, 'MCnc'),

    ('Hormonios', 'Progesterona',           r'Progesterone',               SER, 'MCnc'),
    ('Hormonios', '17-OH-progesterona',     r'17-Hydroxyprogesterone',     SER, 'MCnc'),
    ('Hormonios', 'DHEA-S',                 r'Dehydroepiandrosterone sulfate', SER, 'MCnc'),
    ('Hormonios', 'DHEA',                   r'Dehydroepiandrosterone',     SER, 'MCnc'),
    ('Hormonios', 'Androstenediona',        r'Androstenedione',            SER, 'MCnc'),
    ('Hormonios', 'SHBG',                   r'Sex hormone binding globulin', SER, 'SCnc'),
    ('Hormonios', 'ACTH',                   r'Corticotropin',              SER, 'MCnc'),
    ('Hormonios', 'IGF-1',                  r'Insulin-like growth factor-I', SER, 'MCnc'),
    ('Hormonios', 'GH',                     r'Somatotropin',               SER, 'MCnc'),
    ('Hormonios', 'Paratormonio (PTH)',     r'Parathyrin\.intact',         SER, 'MCnc'),
    ('Hormonios', 'Estrona',                r'Estrone',                    SER, 'MCnc'),
    # O 2.83 chama a di-hidrotestosterona de "Androstanolone".
    ('Hormonios', 'Di-hidrotestosterona (DHT)', r'Androstanolone',         SER, 'MCnc'),
    ('Hormonios', 'Hormonio antimulleriano', r'Mullerian inhibiting substance', SER, 'MCnc'),
    ('Hormonios', 'Cortisol salivar',       r'Cortisol',                   r'Saliva', 'MCnc'),

    ('Lipidico', 'Apolipoproteina A1',      r'Apolipoprotein A-I',         SER, 'MCnc'),
    ('Lipidico', 'Apolipoproteina B',       r'Apolipoprotein B',           SER, 'MCnc'),
    # ATENCAO: `Lipoprotein.alpha` e a ALFA-lipoproteina (a fracao do HDL), e
    # nao a Lp(a). O termo certo no 2.83 e `Lipoprotein (little a)`. Um alvo
    # frouxo aqui mapearia a Lp(a) para o HDL em silencio.
    ('Lipidico', 'Lipoproteina (a)',        r'Lipoprotein \(little a\)',   SER, 'MCnc'),
    ('Lipidico', 'Homocisteina',            r'Homocysteine',               SER, 'SCnc'),

    ('Minerais', 'Zinco',                   r'Zinc',                       SER, 'MCnc'),
    ('Minerais', 'Cobre',                   r'Copper',                     SER, 'MCnc'),
    ('Minerais', 'Selenio',                 r'Selenium',                   SER, 'MCnc'),

    ('Tumoral', 'CEA',                      r'Carcinoembryonic Ag',        SER, 'MCnc'),
    ('Tumoral', 'Alfa-fetoproteina',        r'Alpha-1-Fetoprotein',        SER, 'MCnc'),
    ('Tumoral', 'CA 125',                   r'Cancer Ag 125',              SER, 'ACnc'),
    ('Tumoral', 'CA 15-3',                  r'Cancer Ag 15-3',             SER, 'ACnc'),
    ('Tumoral', 'CA 19-9',                  r'Cancer Ag 19-9',             SER, 'ACnc'),

    # A SOMA 1,25-(OH)2 D2 + D3, e nao `Calcitriol`, que no 2.83 e so a D3. E a
    # armadilha da D36 um andar acima: o laudo brasileiro reporta a soma.
    ('Vitaminas', '1,25-di-hidroxivitamina D', r'1,25-Dihydroxyvitamin D', SER, 'MCnc'),
]

# Termos de metodo especifico que o laudo brasileiro nomeia por escrito, e que
# por isso ganham linha propria em vez de serem absorvidos pelo termo neutro.
ALVOS_COM_METODO = [
    ('Inflamacao', 'Proteina C reativa ultrassensivel', r'C reactive protein', SER, 'MCnc', r'High Sensitivity'),

    # Coagulograma. No 2.83, TP, TTPA e INR tem o MESMO componente
    # (`Coagulation`) em plasma pobre em plaquetas; o que os separa e a
    # propriedade e o metodo -- via extrinseca ("tissue factor") para TP e INR,
    # intrinseca ("surface induced") para o TTPA. Nao ha termo neutro de metodo.
    ('Coagulacao', 'Tempo de protrombina',  r'Coagulation', r'PPP', 'Time',    r'Coag\.tissue factor'),
    ('Coagulacao', 'INR',                   r'Coagulation', r'PPP', 'RelTime', r'Coag\.tissue factor'),
    ('Coagulacao', 'TTPA',                  r'Coagulation', r'PPP', 'Time',    r'Coag\.surface induced'),

    # Eletroforese de proteinas. O termo NEUTRO de metodo das fracoes existe,
    # mas em mg/L e sem ranqueamento -- nao e o exame que o laudo brasileiro
    # reporta. O exame e a eletroforese, e o laudo a nomeia. A albumina
    # PRECISA do metodo: sem ele, cai no codigo da albumina do painel hepatico.
    ('Eletroforese', 'Albumina (eletroforese)', r'Albumin',          SER, 'MCnc', r'Electrophoresis'),
    ('Eletroforese', 'Alfa-1-globulina',        r'Alpha 1 globulin', SER, 'MCnc', r'Electrophoresis'),
    ('Eletroforese', 'Alfa-2-globulina',        r'Alpha 2 globulin', SER, 'MCnc', r'Electrophoresis'),
    ('Eletroforese', 'Beta-globulina',          r'Beta globulin',    SER, 'MCnc', r'Electrophoresis'),
    ('Eletroforese', 'Gama-globulina',          r'Gamma globulin',   SER, 'MCnc', r'Electrophoresis'),
    ('Eletroforese', 'Albumina (eletroforese, %)', r'Albumin/Protein\.total',          SER, 'MFr', r'Electrophoresis'),
    ('Eletroforese', 'Alfa-1-globulina (%)',    r'Alpha 1 globulin/Protein\.total', SER, 'MFr', r'Electrophoresis'),
    ('Eletroforese', 'Alfa-2-globulina (%)',    r'Alpha 2 globulin/Protein\.total', SER, 'MFr', r'Electrophoresis'),
    ('Eletroforese', 'Beta-globulina (%)',      r'Beta globulin/Protein\.total',    SER, 'MFr', r'Electrophoresis'),
    ('Eletroforese', 'Gama-globulina (%)',      r'Gamma globulin/Protein\.total',   SER, 'MFr', r'Electrophoresis'),
]

CAMPOS = [
    'painel', 'rotulo_projeto',
    'LOINC_NUM', 'LONG_COMMON_NAME', 'SHORTNAME', 'DisplayName',
    'COMPONENT', 'PROPERTY', 'TIME_ASPCT', 'SYSTEM', 'SCALE_TYP', 'METHOD_TYP',
    'CLASS', 'STATUS', 'EXAMPLE_UCUM_UNITS', 'COMMON_TEST_RANK',
    'ptBR_COMPONENT', 'ptBR_PROPERTY', 'ptBR_TIME_ASPCT', 'ptBR_SYSTEM',
    'ptBR_SCALE_TYP', 'ptBR_METHOD_TYP', 'ptBR_SHORTNAME', 'ptBR_RELATEDNAMES2',
]


def rank(r):
    try:
        v = int(r['COMMON_TEST_RANK'] or 0)
    except ValueError:
        v = 0
    return v if v > 0 else 10 ** 9


def linha_de(r, ptbr, painel, rotulo):
    # Clausula 10.2 da licenca: conteudo de terceiro fica de fora.
    assert not r['EXTERNAL_COPYRIGHT_NOTICE'].strip(), \
        'termo com direito de terceiro: %s (%s)' % (r['LOINC_NUM'], rotulo)
    p = ptbr.get(r['LOINC_NUM'], {})
    return {
        'painel': painel, 'rotulo_projeto': rotulo,
        'LOINC_NUM': r['LOINC_NUM'], 'LONG_COMMON_NAME': r['LONG_COMMON_NAME'],
        'SHORTNAME': r['SHORTNAME'], 'DisplayName': r['DisplayName'],
        'COMPONENT': r['COMPONENT'], 'PROPERTY': r['PROPERTY'], 'TIME_ASPCT': r['TIME_ASPCT'],
        'SYSTEM': r['SYSTEM'], 'SCALE_TYP': r['SCALE_TYP'], 'METHOD_TYP': r['METHOD_TYP'],
        'CLASS': r['CLASS'], 'STATUS': r['STATUS'],
        'EXAMPLE_UCUM_UNITS': r['EXAMPLE_UCUM_UNITS'], 'COMMON_TEST_RANK': r['COMMON_TEST_RANK'],
        'ptBR_COMPONENT': p.get('COMPONENT', ''), 'ptBR_PROPERTY': p.get('PROPERTY', ''),
        'ptBR_TIME_ASPCT': p.get('TIME_ASPCT', ''), 'ptBR_SYSTEM': p.get('SYSTEM', ''),
        'ptBR_SCALE_TYP': p.get('SCALE_TYP', ''), 'ptBR_METHOD_TYP': p.get('METHOD_TYP', ''),
        'ptBR_SHORTNAME': p.get('SHORTNAME', ''), 'ptBR_RELATEDNAMES2': p.get('RELATEDNAMES2', ''),
    }


def main():
    origem = sys.argv[1] if len(sys.argv) > 1 else ORIGEM
    caminho_loinc = os.path.join(origem, 'LoincTable', 'Loinc.csv')
    caminho_ptbr = os.path.join(origem, 'AccessoryFiles', 'LinguisticVariants',
                                'ptBR11LinguisticVariant.csv')
    for c in (caminho_loinc, caminho_ptbr):
        if not os.path.exists(c):
            sys.exit('Nao encontrei %s.\nBaixe o release do LOINC e passe a pasta como argumento.' % c)

    linhas = []
    with io.open(caminho_loinc, encoding='utf-8-sig', newline='') as fh:
        for r in csv.DictReader(fh):
            # CLASSTYPE 1 = laboratorio; Qn = escala quantitativa (tem numero).
            if r['STATUS'] == 'ACTIVE' and r['CLASSTYPE'] == '1' and r['SCALE_TYP'] == 'Qn':
                linhas.append(r)

    ptbr = {}
    with io.open(caminho_ptbr, encoding='utf-8-sig', newline='') as fh:
        for r in csv.DictReader(fh):
            ptbr[r['LOINC_NUM']] = r

    saida, vistos, avisos = [], {}, []

    for alvo in ALVOS:
        painel, rotulo, comp, sysx, prop = alvo[:5]
        tempo = alvo[5] if len(alvo) > 5 else TEMPO_PADRAO
        cand = [r for r in linhas
                if re.fullmatch(comp, r['COMPONENT'], re.I)
                and re.fullmatch(sysx, r['SYSTEM'], re.I)
                and r['PROPERTY'] == prop
                and r['TIME_ASPCT'] == tempo]
        if not cand:
            avisos.append('SEM CANDIDATO: %s (%s / %s / %s / %s)' % (rotulo, comp, sysx, prop, tempo))
            continue
        cand.sort(key=lambda r: (r['METHOD_TYP'] != '', rank(r)))
        saida.append(linha_de(cand[0], ptbr, painel, rotulo))

    for alvo in ALVOS_COM_METODO:
        painel, rotulo, comp, sysx, prop, met = alvo[:6]
        tempo = alvo[6] if len(alvo) > 6 else TEMPO_PADRAO
        cand = [r for r in linhas
                if re.fullmatch(comp, r['COMPONENT'], re.I)
                and re.fullmatch(sysx, r['SYSTEM'], re.I)
                and r['PROPERTY'] == prop
                and r['TIME_ASPCT'] == tempo
                and re.search(met, r['METHOD_TYP'], re.I)]
        if not cand:
            avisos.append('SEM CANDIDATO (metodo): %s' % rotulo)
            continue
        cand.sort(key=rank)
        saida.append(linha_de(cand[0], ptbr, painel, rotulo))

    for r in saida:
        if r['LOINC_NUM'] in vistos:
            avisos.append('CODIGO REPETIDO: %s em "%s" e "%s"' %
                          (r['LOINC_NUM'], vistos[r['LOINC_NUM']], r['rotulo_projeto']))
        vistos[r['LOINC_NUM']] = r['rotulo_projeto']
        if not r['ptBR_COMPONENT']:
            avisos.append('SEM pt-BR: %s (%s)' % (r['rotulo_projeto'], r['LOINC_NUM']))

    destino = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'loinc-analitos-suasaude.csv')
    with io.open(destino, 'w', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=CAMPOS)
        w.writeheader()
        w.writerows(saida)

    print('LOINC %s -- %d linhas gravadas em %s' % (VERSAO_LOINC, len(saida), os.path.basename(destino)))
    if avisos:
        print()
        print('AVISOS (%d):' % len(avisos))
        for a in avisos:
            print('  -', a)
    else:
        print('Sem avisos: todos os alvos resolvidos, sem repeticao, todos com pt-BR.')


if __name__ == '__main__':
    main()
