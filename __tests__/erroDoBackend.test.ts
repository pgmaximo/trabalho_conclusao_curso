import { BackendError, backendError, technicalDetail } from '@/services/backendError';

// Os servicos montavam a mensagem do erro com o texto que o backend devolvia
// ("Unauthorized", "Network error"), e as telas mostram `error.message`: a
// pessoa lia o texto tecnico, em ingles. Agora ela le a frase em portugues, e
// o texto tecnico fica em `detail`
// (specs/00-fundacao/correcoes-de-usabilidade/spec.md, D9).

describe('backendError', () => {
  let aviso: jest.SpyInstance;

  beforeEach(() => {
    aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    aviso.mockRestore();
  });

  it('a mensagem e a frase em portugues, e nunca o texto do backend', () => {
    const erro = backendError([{ message: 'Unauthorized' }], 'Não foi possível carregar a agenda.');

    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(BackendError);
    expect(erro.message).toBe('Não foi possível carregar a agenda.');
    expect(erro.message).not.toMatch(/Unauthorized/);
  });

  it('guarda o texto tecnico em `detail` e o registra no console', () => {
    const erro = backendError(
      [{ message: 'Unauthorized' }, { message: 'Network error' }, { message: null }],
      'Não foi possível carregar a agenda.',
    );

    expect(erro.detail).toBe('Unauthorized; Network error');
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('Unauthorized; Network error'));
  });

  it('funciona sem nenhum detalhe', () => {
    const erro = backendError(null, 'Não foi possível salvar o perfil.');

    expect(erro.message).toBe('Não foi possível salvar o perfil.');
    expect(erro.detail).toBe('');
    expect(aviso).not.toHaveBeenCalled();
  });
});

describe('technicalDetail', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('devolve o texto do backend, para o codigo que precisa reconhecer um erro especifico', () => {
    const erro = backendError([{ message: 'Cannot query field "listMedicineDoseLogs"' }], 'Não foi possível.');
    expect(technicalDetail(erro)).toBe('Cannot query field "listMedicineDoseLogs"');
  });

  it('num erro comum, devolve a propria mensagem', () => {
    expect(technicalDetail(new Error('Network request failed'))).toBe('Network request failed');
    expect(technicalDetail('texto solto')).toBe('texto solto');
  });
});
