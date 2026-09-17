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

# (painel, rotulo do projeto, COMPONENT, SYSTEM, PROPERTY)
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
    ('Inflamacao', 'PSA total',             r'Prostate specific Ag',       SER, 'MCnc'),
    ('Inflamacao', 'PSA livre',             r'Prostate specific Ag\.free', SER, 'MCnc'),

    ('Hormonios', 'Testosterona total',     r'Testosterone',               SER, 'MCnc'),
    ('Hormonios', 'Testosterona livre',     r'Testosterone\.free',         SER, 'MCnc'),
    ('Hormonios', 'Cortisol',               r'Cortisol',                   SER, 'MCnc'),
    ('Hormonios', 'Estradiol',              r'Estradiol',                  SER, 'MCnc'),
    ('Hormonios', 'FSH',                    r'Follitropin',                SER, 'ACnc'),
    ('Hormonios', 'LH',                     r'Lutropin',                   SER, 'ACnc'),
    ('Hormonios', 'Prolactina',             r'Prolactin',                  SER, 'MCnc'),
    ('Hormonios', 'Beta-HCG',               r'Choriogonadotropin',         SER, 'ACnc'),
]

# Termos de metodo especifico que o laudo brasileiro nomeia por escrito, e que
# por isso ganham linha propria em vez de serem absorvidos pelo termo neutro.
ALVOS_COM_METODO = [
    ('Inflamacao', 'Proteina C reativa ultrassensivel', r'C reactive protein', SER, 'MCnc', r'High Sensitivity'),
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

    for painel, rotulo, comp, sysx, prop in ALVOS:
        cand = [r for r in linhas
                if re.fullmatch(comp, r['COMPONENT'], re.I)
                and re.fullmatch(sysx, r['SYSTEM'], re.I)
                and r['PROPERTY'] == prop]
        if not cand:
            avisos.append('SEM CANDIDATO: %s (%s / %s / %s)' % (rotulo, comp, sysx, prop))
            continue
        cand.sort(key=lambda r: (r['METHOD_TYP'] != '', rank(r)))
        saida.append(linha_de(cand[0], ptbr, painel, rotulo))

    for painel, rotulo, comp, sysx, prop, met in ALVOS_COM_METODO:
        cand = [r for r in linhas
                if re.fullmatch(comp, r['COMPONENT'], re.I)
                and re.fullmatch(sysx, r['SYSTEM'], re.I)
                and r['PROPERTY'] == prop
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
