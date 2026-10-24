/**
 * Resumo do arquivo:
 * O trecho do navegador que e compartilhado entre as paginas do site
 * (scripts/site-publico/cliente/comum.js): deteccao de iPhone e o formato do
 * pedido que vai para a Lambda da pesquisa. O resto do codigo de cliente mexe
 * em DOM e e conferido no navegador; o que da para ser funcao pura mora aqui.
 */
import { ehIphone, montarPedido } from '../scripts/site-publico/cliente/comum.js';

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36';
const UA_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15';

describe('ehIphone', () => {
  it('reconhece iPhone, iPad e iPod pelo user agent', () => {
    expect(ehIphone({ userAgent: UA_IPHONE, plataforma: 'iPhone', toquesSimultaneos: 5 })).toBe(true);
    expect(ehIphone({ userAgent: UA_IPHONE.replace('iPhone', 'iPad'), plataforma: 'iPad', toquesSimultaneos: 5 })).toBe(true);
    expect(ehIphone({ userAgent: UA_IPHONE.replace('iPhone', 'iPod'), plataforma: 'iPod', toquesSimultaneos: 5 })).toBe(true);
  });

  it('reconhece iPad que se apresenta como Mac, porque ele tem tela de toque', () => {
    expect(ehIphone({ userAgent: UA_MAC, plataforma: 'MacIntel', toquesSimultaneos: 5 })).toBe(true);
  });

  it('nao confunde Android nem Mac de verdade com iPhone', () => {
    expect(ehIphone({ userAgent: UA_ANDROID, plataforma: 'Linux armv8l', toquesSimultaneos: 5 })).toBe(false);
    expect(ehIphone({ userAgent: UA_MAC, plataforma: 'MacIntel', toquesSimultaneos: 0 })).toBe(false);
  });

  it('nao lanca excecao quando o navegador nao informa nada', () => {
    expect(ehIphone({})).toBe(false);
  });
});

describe('montarPedido', () => {
  it('manda JSON como texto simples, para o navegador nao fazer pedido de verificacao antes', () => {
    const pedido = montarPedido({ acao: 'clique', origem: 'inicio' });
    expect(pedido.method).toBe('POST');
    expect(pedido.headers).toEqual({ 'content-type': 'text/plain;charset=UTF-8' });
    expect(JSON.parse(pedido.body)).toEqual({ acao: 'clique', origem: 'inicio' });
  });

  it('segura o pedido ate o fim mesmo se a pagina fechar (keepalive)', () => {
    expect(montarPedido({ acao: 'clique', origem: 'fim' }).keepalive).toBe(true);
  });

  it('o cabecalho da chave do painel vai junto e exige o pedido de verificacao', () => {
    const pedido = montarPedido({ acao: 'listar' }, { chave: 'abc' });
    expect(pedido.headers).toEqual({ 'content-type': 'text/plain;charset=UTF-8', 'x-chave': 'abc' });
  });
});
