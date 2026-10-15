/**
 * A gravação da memória (M7), que é do APLICATIVO e nunca da função.
 *
 * Aqui mora o consentimento do art. 11, I virando caminho de código: o modelo
 * propõe, a pessoa toca, e só então este arquivo grava. Nenhuma função do chat
 * chega perto disto — ela continua somente leitura por contrato, e a varredura
 * que garante isso passou a cobrir a função inteira nesta EPIC.
 */
const mockModels = {
  AssistantMemoryFact: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
  },
  AssistantMemorySetting: {
    create: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
  },
};

jest.mock('aws-amplify/data', () => ({
  generateClient: () => ({ models: mockModels }),
}));

import {
  apagarFato,
  apagarTodosOsFatos,
  editarFato,
  guardarFato,
  lerInterruptor,
  listarFatos,
  definirInterruptor,
} from '@/services/assistantMemoryService';

const BOA = { texto: 'Prefiro respostas curtas', tipo: 'PREFERENCIA_DE_RESPOSTA' as const };

function fatoGravado(id: string, text: string, confirmedAt = '2026-09-10T12:00:00Z') {
  return { id, text, kind: 'ROTINA', confirmedAt, editedAt: null, sourceConversationId: 'c-1' };
}

beforeEach(() => {
  for (const modelo of Object.values(mockModels)) {
    for (const fn of Object.values(modelo)) (fn as jest.Mock).mockReset();
  }
  mockModels.AssistantMemoryFact.create.mockResolvedValue({ data: { id: 'f-1' } });
  mockModels.AssistantMemoryFact.update.mockResolvedValue({ data: {} });
  mockModels.AssistantMemoryFact.delete.mockResolvedValue({ data: {} });
  mockModels.AssistantMemoryFact.list.mockResolvedValue({ data: [] });
  mockModels.AssistantMemorySetting.list.mockResolvedValue({ data: [] });
  mockModels.AssistantMemorySetting.create.mockResolvedValue({ data: { id: 's-1' } });
  mockModels.AssistantMemorySetting.update.mockResolvedValue({ data: {} });
});

describe('guardar um fato', () => {
  it('grava texto, tipo, data e a conversa de origem', async () => {
    await guardarFato(BOA, 'c-1');
    const [entrada] = mockModels.AssistantMemoryFact.create.mock.calls[0];
    expect(entrada.text).toBe('Prefiro respostas curtas');
    expect(entrada.kind).toBe('PREFERENCIA_DE_RESPOSTA');
    expect(entrada.sourceConversationId).toBe('c-1');
    expect(typeof entrada.confirmedAt).toBe('string');
  });

  it('o texto gravado é EXATAMENTE o que foi recebido', async () => {
    // Este é o teste do consentimento. Mostrar um texto na confirmação e
    // gravar outro esvaziaria o art. 11, I -- a pessoa teria consentido com
    // uma coisa e o banco guardaria outra.
    await guardarFato({ texto: 'me chame de Pedro', tipo: 'COMO_ME_CHAMAR' }, 'c-1');
    const [entrada] = mockModels.AssistantMemoryFact.create.mock.calls[0];
    expect(entrada.text).toBe('me chame de Pedro');
  });

  it('devolve o resultado da gravação', async () => {
    await expect(guardarFato(BOA, 'c-1')).resolves.toEqual({ ok: true });
  });

  it('sem conversa de origem, grava mesmo assim', async () => {
    // A origem é transparência (art. 6º, VI), não requisito. Um fato sem ela
    // continua sendo da pessoa.
    await guardarFato(BOA, null);
    expect(mockModels.AssistantMemoryFact.create).toHaveBeenCalled();
  });
});

describe('o que o serviço RECUSA gravar', () => {
  it('recusa proposta que a validação reprova, e NÃO grava', async () => {
    const r = await guardarFato({ texto: 'Tomo losartana 50 mg', tipo: 'ROTINA' }, 'c-1');
    expect(r).toEqual({ ok: false, motivo: 'recusado' });
    expect(mockModels.AssistantMemoryFact.create).not.toHaveBeenCalled();
  });

  it('recusa tipo fora da lista fechada', async () => {
    const r = await guardarFato({ texto: 'Qualquer coisa', tipo: 'CONDICAO' as never }, 'c-1');
    expect(r.ok).toBe(false);
    expect(mockModels.AssistantMemoryFact.create).not.toHaveBeenCalled();
  });

  it('recusa quando a memória já está cheia, e a recusa é DISTINGUÍVEL', async () => {
    // A tela precisa dizer coisas diferentes: "não posso guardar isso" e "não
    // cabe mais nada" são problemas diferentes, com saídas diferentes.
    mockModels.AssistantMemoryFact.list.mockResolvedValue({
      data: Array.from({ length: 20 }, (_, i) => fatoGravado(`f-${i}`, `fato ${i}`)),
    });
    const r = await guardarFato(BOA, 'c-1');
    expect(r).toEqual({ ok: false, motivo: 'cheia' });
    expect(mockModels.AssistantMemoryFact.create).not.toHaveBeenCalled();
  });

  it('nenhum fato antigo é apagado quando a memória está cheia', async () => {
    // Descartar o mais antigo em silêncio seria decidir pela pessoa qual parte
    // dela deixa de importar.
    mockModels.AssistantMemoryFact.list.mockResolvedValue({
      data: Array.from({ length: 20 }, (_, i) => fatoGravado(`f-${i}`, `fato ${i}`)),
    });
    await guardarFato(BOA, 'c-1');
    expect(mockModels.AssistantMemoryFact.delete).not.toHaveBeenCalled();
  });
});

describe('listar', () => {
  it('devolve os fatos, do mais recente para o mais antigo', async () => {
    mockModels.AssistantMemoryFact.list.mockResolvedValue({
      data: [
        fatoGravado('velho', 'a', '2026-01-01T10:00:00Z'),
        fatoGravado('novo', 'b', '2026-09-01T10:00:00Z'),
      ],
    });
    const fatos = await listarFatos();
    expect(fatos.map((f) => f.id)).toEqual(['novo', 'velho']);
  });

  it('fato sem data NÃO some — ele vai para o fim', async () => {
    mockModels.AssistantMemoryFact.list.mockResolvedValue({
      data: [{ id: 'sem-data', text: 'a', kind: 'ROTINA' }, fatoGravado('com-data', 'b')],
    });
    const fatos = await listarFatos();
    expect(fatos.map((f) => f.id)).toEqual(['com-data', 'sem-data']);
  });
});

describe('editar — art. 18, III', () => {
  it('grava a data da edição', async () => {
    await editarFato('f-1', 'Prefiro respostas bem curtas', 'PREFERENCIA_DE_RESPOSTA');
    const [entrada] = mockModels.AssistantMemoryFact.update.mock.calls[0];
    expect(entrada.id).toBe('f-1');
    expect(entrada.text).toBe('Prefiro respostas bem curtas');
    expect(typeof entrada.editedAt).toBe('string');
  });

  it('NÃO reescreve `confirmedAt`', async () => {
    // As duas datas contam coisas diferentes: quando a pessoa consentiu e
    // quando ela corrigiu.
    await editarFato('f-1', 'outro texto', 'ROTINA');
    const [entrada] = mockModels.AssistantMemoryFact.update.mock.calls[0];
    expect(entrada.confirmedAt).toBeUndefined();
  });

  it('recusa edição que a validação reprova, e não grava', async () => {
    // O tipo e VALIDO aqui de proposito: a recusa tem que vir do TEXTO, e nao
    // de um tipo vazio. Era assim que este teste passava pelo motivo errado.
    const r = await editarFato('f-1', 'Tenho diabetes tipo 2', 'ROTINA');
    expect(r.ok).toBe(false);
    expect(mockModels.AssistantMemoryFact.update).not.toHaveBeenCalled();
  });
});

describe('apagar — art. 18, IV e VI', () => {
  it('apagar um remove de verdade, sem marcação lógica', async () => {
    await apagarFato('f-1');
    expect(mockModels.AssistantMemoryFact.delete).toHaveBeenCalledWith({ id: 'f-1' });
    expect(mockModels.AssistantMemoryFact.update).not.toHaveBeenCalled();
  });

  it('apagar todos remove todos, um a um', async () => {
    mockModels.AssistantMemoryFact.list.mockResolvedValue({
      data: [fatoGravado('f-1', 'a'), fatoGravado('f-2', 'b')],
    });
    await apagarTodosOsFatos();
    expect(mockModels.AssistantMemoryFact.delete).toHaveBeenCalledTimes(2);
  });
});

describe('o interruptor — art. 18, IX e art. 8º, §5', () => {
  it('sem linha nenhuma, a memória está LIGADA', async () => {
    // Ausência significa que a pessoa nunca mexeu. E ligada não grava nada
    // sozinha: gravar depende de confirmação.
    await expect(lerInterruptor()).resolves.toBe(true);
  });

  it('lê o estado gravado', async () => {
    mockModels.AssistantMemorySetting.list.mockResolvedValue({
      data: [{ id: 's-1', enabled: false, updatedAt: '2026-09-10T10:00:00Z' }],
    });
    await expect(lerInterruptor()).resolves.toBe(false);
  });

  it('desligar grava o estado e NÃO apaga nada', async () => {
    // Revogar o consentimento interrompe o tratamento dali para frente; a
    // eliminação é outro direito, e é outra decisão. Apagar junto seria
    // destruir dado que a pessoa talvez quisesse manter.
    mockModels.AssistantMemorySetting.list.mockResolvedValue({
      data: [{ id: 's-1', enabled: true, updatedAt: '2026-09-10T10:00:00Z' }],
    });
    await definirInterruptor(false);
    expect(mockModels.AssistantMemorySetting.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's-1', enabled: false }),
    );
    expect(mockModels.AssistantMemoryFact.delete).not.toHaveBeenCalled();
  });

  it('a primeira mudança cria a linha em vez de falhar', async () => {
    await definirInterruptor(false);
    expect(mockModels.AssistantMemorySetting.create).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});
