/**
 * Resumo do arquivo:
 * A logica da pesquisa de opiniao da feira que nao depende de tela
 * (infra/site-pesquisa/fluxo.mjs): o que acontece a cada toque, quando da para
 * avancar e o que vai para a Lambda. A pagina (js/opiniao.js) so desenha o
 * estado e chama estas funcoes; por isso o que importa para "nao perder
 * resposta" e "nao mandar lixo" e conferido aqui, sem navegador.
 */
import {
  avancar,
  digitar,
  escolher,
  estadoInicial,
  montarEnvio,
  podeAvancar,
  voltar,
} from '../infra/site-pesquisa/fluxo.mjs';
import { PERGUNTAS, validarEnvio } from '../infra/site-pesquisa/pesquisa.mjs';

const ID = '3f2b8c1e-9a47-4d6b-8e15-0c7a1d2f4b69';
const TOTAL = PERGUNTAS.length;

const pergunta = (id: string) => {
  const achada = PERGUNTAS.find((p: { id: string }) => p.id === id);
  if (!achada) throw new Error(`Pergunta ausente: ${id}`);
  return achada;
};

describe('estadoInicial', () => {
  it('comeca na primeira pergunta, sem respostas', () => {
    expect(estadoInicial()).toEqual({ tela: 0, respostas: {} });
  });
});

describe('escolher', () => {
  it('em escolha unica troca a resposta anterior', () => {
    let estado = escolher(estadoInicial(), pergunta('usaria'), 'usaria');
    estado = escolher(estado, pergunta('usaria'), 'nao_sei');
    expect(estado.respostas).toEqual({ usaria: 'nao_sei' });
  });

  it('em multipla escolha marca e desmarca, e some a chave quando nao sobra nada', () => {
    let estado = escolher(estadoInicial(), pergunta('barreiras'), 'privacidade');
    estado = escolher(estado, pergunta('barreiras'), 'so_iphone');
    expect(estado.respostas.barreiras).toEqual(['privacidade', 'so_iphone']);
    estado = escolher(estado, pergunta('barreiras'), 'privacidade');
    expect(estado.respostas.barreiras).toEqual(['so_iphone']);
    estado = escolher(estado, pergunta('barreiras'), 'so_iphone');
    expect(estado.respostas).toEqual({});
  });

  it.each([
    ['guarda_hoje', 'nao_guardo', 'papel'],
    ['barreiras', 'nenhuma', 'privacidade'],
    ['chamaram_atencao', 'nenhuma', 'agenda'],
  ])('em %s, marcar "%s" desmarca as outras e marcar outra desmarca "%s"', (id, exclusiva, comum) => {
    let estado = escolher(estadoInicial(), pergunta(id), comum);
    estado = escolher(estado, pergunta(id), exclusiva);
    expect(estado.respostas[id]).toEqual([exclusiva]);
    estado = escolher(estado, pergunta(id), comum);
    expect(estado.respostas[id]).toEqual([comum]);
  });

  it('chamaram_atencao nao passa de 3 escolhas: o quarto toque nao muda nada, e desmarcar libera', () => {
    let estado = estadoInicial();
    for (const codigo of ['exames', 'assistente', 'agenda']) {
      estado = escolher(estado, pergunta('chamaram_atencao'), codigo);
    }
    const igual = escolher(estado, pergunta('chamaram_atencao'), 'vacinas');
    expect(igual.respostas.chamaram_atencao).toEqual(['exames', 'assistente', 'agenda']);
    const liberado = escolher(escolher(estado, pergunta('chamaram_atencao'), 'agenda'), pergunta('chamaram_atencao'), 'vacinas');
    expect(liberado.respostas.chamaram_atencao).toEqual(['exames', 'assistente', 'vacinas']);
  });

  it('a opcao exclusiva vale mesmo com 3 escolhidas (o limite nao a bloqueia)', () => {
    let estado = estadoInicial();
    for (const codigo of ['exames', 'assistente', 'agenda']) {
      estado = escolher(estado, pergunta('chamaram_atencao'), codigo);
    }
    expect(escolher(estado, pergunta('chamaram_atencao'), 'nenhuma').respostas.chamaram_atencao).toEqual(['nenhuma']);
  });

  it('nao altera o estado recebido', () => {
    const antes = escolher(estadoInicial(), pergunta('barreiras'), 'privacidade');
    const copia = JSON.parse(JSON.stringify(antes));
    escolher(antes, pergunta('barreiras'), 'so_iphone');
    expect(antes).toEqual(copia);
  });
});

describe('digitar', () => {
  it('guarda o comentario e apaga a chave quando fica vazio', () => {
    let estado = digitar(estadoInicial(), pergunta('comentario'), 'Faltou lembrar da consulta.');
    expect(estado.respostas.comentario).toBe('Faltou lembrar da consulta.');
    estado = digitar(estado, pergunta('comentario'), '');
    expect(estado.respostas).toEqual({});
  });

  it('corta o que passa do limite da pergunta', () => {
    const estado = digitar(estadoInicial(), pergunta('comentario'), 'a'.repeat(300));
    expect(estado.respostas.comentario).toHaveLength(280);
  });
});

describe('podeAvancar', () => {
  it('escolha unica e multipla exigem resposta; o comentario e opcional', () => {
    expect(podeAvancar(estadoInicial(), pergunta('usaria'))).toBe(false);
    expect(podeAvancar(escolher(estadoInicial(), pergunta('usaria'), 'usaria'), pergunta('usaria'))).toBe(true);
    expect(podeAvancar(estadoInicial(), pergunta('barreiras'))).toBe(false);
    expect(podeAvancar(escolher(estadoInicial(), pergunta('barreiras'), 'outro'), pergunta('barreiras'))).toBe(true);
    expect(podeAvancar(estadoInicial(), pergunta('comentario'))).toBe(true);
  });
});

describe('avancar e voltar', () => {
  it('andam uma tela, param nos limites e guardam as respostas', () => {
    let estado = escolher(estadoInicial(), pergunta('impressao'), 'gostei');
    estado = avancar(estado, TOTAL);
    expect(estado.tela).toBe(1);
    estado = voltar(voltar(estado));
    expect(estado.tela).toBe(0);
    expect(estado.respostas).toEqual({ impressao: 'gostei' });
    let fim = { ...estado, tela: TOTAL - 1 };
    fim = avancar(avancar(fim, TOTAL), TOTAL);
    expect(fim.tela).toBe(TOTAL);
  });
});

describe('montarEnvio', () => {
  it('um envio parcial passa na validacao da Lambda e ainda nao esta concluido', () => {
    let estado = escolher(estadoInicial(), pergunta('impressao'), 'gostei');
    estado = avancar(estado, TOTAL);
    const envio = montarEnvio(estado, ID, TOTAL);
    expect(envio).toEqual({
      acao: 'salvar',
      id: ID,
      etapa: 1,
      concluido: false,
      respostas: { impressao: 'gostei' },
      site: '',
    });
    expect(validarEnvio(envio).ok).toBe(true);
  });

  it('percorrer as 11 perguntas escolhendo a primeira opcao termina concluido e valido', () => {
    let estado = estadoInicial();
    for (const p of PERGUNTAS) {
      if (p.tipo !== 'texto') estado = escolher(estado, p, p.opcoes[0].codigo);
      estado = avancar(estado, TOTAL);
    }
    const envio = montarEnvio(estado, ID, TOTAL);
    expect(envio.etapa).toBe(TOTAL);
    expect(envio.concluido).toBe(true);
    expect(validarEnvio(envio).ok).toBe(true);
  });
});
