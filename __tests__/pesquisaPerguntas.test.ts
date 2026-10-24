/**
 * Resumo do arquivo:
 * A lista de perguntas da pesquisa da feira (infra/site-pesquisa/pesquisa.mjs)
 * e a validacao do que chega do navegador. A mesma lista alimenta a pagina
 * `opiniao.html` e a Lambda que grava as respostas, entao este teste e o que
 * impede as duas de divergirem da secao 5.1 do spec
 * (docs/superpowers/specs/2026-10-24-site-feira-pesquisa-design.md).
 */
import {
  ESCALA_IMPRESSAO,
  ESCALA_USO,
  FUNCIONALIDADES,
  PERGUNTAS,
  VERSAO_DO_FORMULARIO,
  validarEnvio,
} from '../infra/site-pesquisa/pesquisa.mjs';

const ID = '3f2b8c1e-9a47-4d6b-8e15-0c7a1d2f4b69';

const codigosDe = (id: string): string[] => {
  const pergunta = PERGUNTAS.find((p: { id: string }) => p.id === id);
  if (!pergunta?.opcoes) throw new Error(`Pergunta sem opcoes: ${id}`);
  return pergunta.opcoes.map((o: { codigo: string }) => o.codigo);
};

const envio = (respostas: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  id: ID,
  etapa: 3,
  concluido: false,
  respostas,
  ...extra,
});

describe('perguntas da pesquisa da feira', () => {
  it('tem 11 perguntas, na ordem do spec, e nenhuma e de reacao por funcionalidade', () => {
    expect(PERGUNTAS.map((p: { id: string }) => p.id)).toEqual([
      'impressao',
      'usaria',
      'frequencia',
      'chamaram_atencao',
      'guarda_hoje',
      'barreiras',
      'modelo',
      'idade',
      'celular',
      'remedio_em_casa',
      'comentario',
    ]);
    expect(PERGUNTAS.some((p: { id: string }) => p.id.startsWith('reacao_'))).toBe(false);
  });

  it('a versao do formulario e 1', () => {
    expect(VERSAO_DO_FORMULARIO).toBe('1');
  });

  it('as duas escalas de cinco pontos seguem a ordem do spec', () => {
    expect(ESCALA_USO).toEqual([
      { codigo: 'nao_usaria', texto: 'Não usaria' },
      { codigo: 'usaria_pouco', texto: 'Usaria pouco' },
      { codigo: 'nao_sei', texto: 'Não sei' },
      { codigo: 'usaria', texto: 'Usaria' },
      { codigo: 'usaria_muito', texto: 'Usaria muito' },
    ]);
    expect(ESCALA_IMPRESSAO).toEqual([
      { codigo: 'nao_gostei', texto: 'Não gostei' },
      { codigo: 'gostei_pouco', texto: 'Gostei pouco' },
      { codigo: 'nao_sei', texto: 'Não sei' },
      { codigo: 'gostei', texto: 'Gostei' },
      { codigo: 'gostei_muito', texto: 'Gostei muito' },
    ]);
  });

  it.each([
    ['impressao', ['nao_gostei', 'gostei_pouco', 'nao_sei', 'gostei', 'gostei_muito']],
    ['usaria', ['nao_usaria', 'usaria_pouco', 'nao_sei', 'usaria', 'usaria_muito']],
    ['frequencia', ['todo_dia', 'semana', 'mes', 'so_quando_precisa', 'nunca']],
    [
      'chamaram_atencao',
      ['exames', 'assistente', 'remedios', 'vacinas', 'prevencao', 'agenda', 'smartwatch', 'nenhuma'],
    ],
    ['guarda_hoje', ['papel', 'fotos', 'mensagens', 'outro_app', 'nao_guardo']],
    [
      'barreiras',
      ['privacidade', 'trabalho_cadastrar', 'desconfio_ia', 'so_iphone', 'nao_vejo_necessidade', 'outro', 'nenhuma'],
    ],
    ['modelo', ['gratis', 'gratis_com_extras', 'assinatura_pequena', 'outra_pessoa_paga', 'nao_sei']],
    ['idade', ['menos_18', '18_24', '25_34', '35_44', '45_59', '60_mais']],
    ['celular', ['android', 'iphone', 'outro']],
    ['remedio_em_casa', ['eu', 'outra_pessoa', 'eu_e_outra', 'ninguem']],
  ])('os codigos de %s batem com a secao 5.1 do spec', (id, esperado) => {
    expect(codigosDe(id)).toEqual(esperado);
  });

  it('as funcionalidades sao as 7 do spec e so tem id e nome', () => {
    expect(FUNCIONALIDADES.map((f: { id: string }) => f.id)).toEqual([
      'exames',
      'assistente',
      'remedios',
      'vacinas',
      'prevencao',
      'agenda',
      'smartwatch',
    ]);
    for (const f of FUNCIONALIDADES) expect(Object.keys(f).sort()).toEqual(['id', 'nome']);
  });

  it('chamaram_atencao aceita no maximo 3 e "nenhuma" e exclusiva; guarda_hoje e barreiras tem a sua exclusiva', () => {
    const achar = (id: string) => PERGUNTAS.find((p: { id: string }) => p.id === id);
    expect(achar('chamaram_atencao')).toMatchObject({ tipo: 'multipla', max: 3, exclusivas: ['nenhuma'] });
    expect(achar('guarda_hoje')).toMatchObject({ tipo: 'multipla', exclusivas: ['nao_guardo'] });
    expect(achar('barreiras')).toMatchObject({ tipo: 'multipla', exclusivas: ['nenhuma'] });
  });

  it('nenhuma opcao de modelo fala em anuncio ou venda de dados', () => {
    const modelo = PERGUNTAS.find((p: { id: string }) => p.id === 'modelo');
    for (const o of modelo.opcoes) {
      expect(`${o.codigo} ${o.texto}`).not.toMatch(/an[uú]ncio|publicidad|propaganda|vend/i);
    }
  });
});

describe('validarEnvio', () => {
  it('aceita um envio parcial valido e devolve so o que importa', () => {
    const respostas = { impressao: 'gostei', usaria: 'usaria', frequencia: 'semana' };
    expect(validarEnvio(envio(respostas))).toEqual({
      ok: true,
      valor: { id: ID, etapa: 3, concluido: false, respostas },
    });
  });

  it('ignora campos extras fora de respostas e nao os devolve', () => {
    const r = validarEnvio(envio({ impressao: 'gostei' }, { acao: 'salvar', site: '', outro: 'x' }));
    expect(r.ok).toBe(true);
    expect(Object.keys(r.valor).sort()).toEqual(['concluido', 'etapa', 'id', 'respostas']);
  });

  it('aceita multipla escolha dentro das regras e envio completo', () => {
    const r = validarEnvio(
      envio(
        {
          chamaram_atencao: ['exames', 'assistente', 'agenda'],
          guarda_hoje: ['papel', 'fotos'],
          barreiras: ['nenhuma'],
          idade: '25_34',
          comentario: '',
        },
        { etapa: 11, concluido: true },
      ),
    );
    expect(r.ok).toBe(true);
  });

  it('aceita comentario de 280 caracteres e preserva HTML como texto', () => {
    const html = `<script>alert(1)</script>${'a'.repeat(280 - 25)}`;
    expect(html).toHaveLength(280);
    const r = validarEnvio(envio({ comentario: html }));
    expect(r.ok).toBe(true);
    expect(r.valor.respostas.comentario).toBe(html);
  });

  it.each([
    ['id que nao e UUID', envio({ usaria: 'usaria' }, { id: 'abc' })],
    ['id que nao e v4', envio({ usaria: 'usaria' }, { id: '3f2b8c1e-9a47-1d6b-8e15-0c7a1d2f4b69' })],
    ['chave de resposta desconhecida', envio({ pergunta_inventada: 'x' })],
    ['reacao por funcionalidade (removida do formulario)', envio({ reacao_exames: 'usaria' })],
    ['codigo fora da lista', envio({ usaria: 'com_certeza' })],
    ['etapa negativa', envio({ usaria: 'usaria' }, { etapa: -1 })],
    ['etapa acima de 11', envio({ usaria: 'usaria' }, { etapa: 12 })],
    ['etapa que nao e inteira', envio({ usaria: 'usaria' }, { etapa: 2.5 })],
    ['concluido que nao e booleano', envio({ usaria: 'usaria' }, { concluido: 'sim' })],
    ['comentario com 281 caracteres', envio({ comentario: 'a'.repeat(281) })],
    ['comentario que nao e texto', envio({ comentario: 42 })],
    ['chamaram_atencao com 4 itens', envio({ chamaram_atencao: ['exames', 'assistente', 'agenda', 'vacinas'] })],
    ['chamaram_atencao com nenhuma e outra', envio({ chamaram_atencao: ['nenhuma', 'agenda'] })],
    ['guarda_hoje com nao_guardo e outra', envio({ guarda_hoje: ['nao_guardo', 'papel'] })],
    ['barreiras com nenhuma e outra', envio({ barreiras: ['nenhuma', 'privacidade'] })],
    ['multipla com item repetido', envio({ barreiras: ['privacidade', 'privacidade'] })],
    ['multipla enviada como texto', envio({ barreiras: 'privacidade' })],
    ['unica enviada como lista', envio({ usaria: ['usaria'] })],
    ['respostas que e lista', envio([] as unknown as Record<string, unknown>)],
    ['respostas ausente', { id: ID, etapa: 1, concluido: false }],
  ])('recusa: %s', (_nome, corpo) => {
    const r = validarEnvio(corpo);
    expect(r.ok).toBe(false);
    expect(typeof r.erro).toBe('string');
  });

  it.each([[null], [undefined], [42], ['texto'], [[]], [{}]])('nao lanca excecao para %p', (corpo) => {
    expect(() => validarEnvio(corpo)).not.toThrow();
    expect(validarEnvio(corpo).ok).toBe(false);
  });
});
