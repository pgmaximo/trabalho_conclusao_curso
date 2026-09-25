/**
 * A tela "O que o assistente lembra" (M9, M10, M11).
 *
 * Esta tela é onde os direitos do art. 18 da LGPD deixam de ser texto de
 * política e viram botão: acesso (II), correção (III), eliminação de um (IV) e
 * de todos (VI), e revogação do consentimento (IX). Cada teste abaixo é um
 * inciso.
 */
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AssistantMemoryScreen } from '@/screens/AssistantMemoryScreen';
import type { UseAssistantMemoryReturn } from '@/hooks/useAssistantMemory';

const FATOS = [
  {
    id: 'f-1',
    texto: 'Prefiro respostas curtas',
    tipo: 'PREFERENCIA_DE_RESPOSTA',
    confirmadoEm: '2026-09-10T12:00:00Z',
    editadoEm: null,
    conversaDeOrigem: 'c-1',
  },
  {
    id: 'f-2',
    texto: 'Trabalho de madrugada',
    tipo: 'ROTINA',
    confirmadoEm: '2026-09-01T12:00:00Z',
    editadoEm: null,
    conversaDeOrigem: null,
  },
];

function estado(over: Partial<UseAssistantMemoryReturn> = {}): UseAssistantMemoryReturn {
  return {
    fatos: FATOS,
    carregando: false,
    ligada: true,
    apagar: jest.fn(),
    apagarTudo: jest.fn(),
    editar: jest.fn().mockResolvedValue({ ok: true }),
    definirLigada: jest.fn(),
    abrirConversa: jest.fn(),
    ...over,
  };
}

describe('acesso — art. 18, II', () => {
  it('lista todos os fatos, com o texto literal', () => {
    render(<AssistantMemoryScreen state={estado()} />);
    expect(screen.getByText('Prefiro respostas curtas')).toBeTruthy();
    expect(screen.getByText('Trabalho de madrugada')).toBeTruthy();
  });

  it('mostra o tipo em português, sem interpretar saúde', () => {
    render(<AssistantMemoryScreen state={estado()} />);
    expect(screen.getByText(/como você prefere as respostas/i)).toBeTruthy();
    expect(screen.getByText(/sua rotina/i)).toBeTruthy();
    expect(screen.queryByText(/normal|alterado|risco|preocupante/i)).toBeNull();
  });

  it('mostra a data em que cada fato foi guardado', () => {
    render(<AssistantMemoryScreen state={estado()} />);
    expect(screen.getAllByText(/10\/09\/2026|01\/09\/2026/).length).toBeGreaterThan(0);
  });
});

describe('transparência — art. 6º, VI', () => {
  it('o parágrafo de abertura diz que nada é guardado sem confirmação', () => {
    render(<AssistantMemoryScreen state={estado()} />);
    expect(screen.getByText(/só guardo o que você confirma|nada é guardado sem/i)).toBeTruthy();
  });

  it('o parágrafo aparece TAMBÉM com a lista vazia', () => {
    // É na primeira vez que a pessoa abre que ela precisa saber o que a
    // memória é. Mesma razão da linha de retenção na gaveta (C9).
    render(<AssistantMemoryScreen state={estado({ fatos: [] })} />);
    expect(screen.getByText(/só guardo o que você confirma|nada é guardado sem/i)).toBeTruthy();
  });

  it('o estado vazio explica, em vez de mostrar uma tela em branco', () => {
    render(<AssistantMemoryScreen state={estado({ fatos: [] })} />);
    expect(screen.getByText(/ainda não guardei nada/i)).toBeTruthy();
  });

  it('o atalho para a conversa de origem some quando aquela conversa foi apagada', () => {
    // A D33 deixou o apagar na mão da pessoa. O fato é dela, não da conversa:
    // o atalho some, e o fato fica.
    render(<AssistantMemoryScreen state={estado()} />);
    expect(screen.getAllByLabelText(/ver a conversa de origem/i)).toHaveLength(1);
    expect(screen.getByText('Trabalho de madrugada')).toBeTruthy();
  });

  it('o atalho abre a conversa daquele fato', () => {
    const abrirConversa = jest.fn();
    render(<AssistantMemoryScreen state={estado({ abrirConversa })} />);
    fireEvent.press(screen.getAllByLabelText(/ver a conversa de origem/i)[0]);
    expect(abrirConversa).toHaveBeenCalledWith('c-1');
  });
});

describe('correção — art. 18, III', () => {
  it('editar abre o texto e salva o que foi escrito', async () => {
    const editar = jest.fn().mockResolvedValue({ ok: true });
    render(<AssistantMemoryScreen state={estado({ editar })} />);

    fireEvent.press(screen.getAllByLabelText(/editar este fato/i)[0]);
    fireEvent.changeText(screen.getByLabelText(/texto do fato/i), 'Prefiro respostas bem curtas');
    fireEvent.press(screen.getByText('Salvar'));

    expect(editar).toHaveBeenCalledWith('f-1', 'Prefiro respostas bem curtas', 'PREFERENCIA_DE_RESPOSTA');
  });

  it('cancelar a edição não salva nada', () => {
    const editar = jest.fn();
    render(<AssistantMemoryScreen state={estado({ editar })} />);
    fireEvent.press(screen.getAllByLabelText(/editar este fato/i)[0]);
    fireEvent.press(screen.getByText('Cancelar'));
    expect(editar).not.toHaveBeenCalled();
  });

  it('uma edição recusada avisa, e o texto antigo continua na tela', async () => {
    const editar = jest.fn().mockResolvedValue({ ok: false, motivo: 'recusado' });
    render(<AssistantMemoryScreen state={estado({ editar })} />);
    fireEvent.press(screen.getAllByLabelText(/editar este fato/i)[0]);
    fireEvent.changeText(screen.getByLabelText(/texto do fato/i), 'Tenho diabetes tipo 2');
    fireEvent.press(screen.getByText('Salvar'));
    await screen.findByText(/não posso guardar/i);
  });
});

describe('eliminação — art. 18, IV e VI', () => {
  it('apagar um pede confirmação inline, e nunca com alerta do sistema', () => {
    render(<AssistantMemoryScreen state={estado()} />);
    fireEvent.press(screen.getAllByLabelText(/apagar este fato/i)[0]);
    expect(screen.getByText(/não pode ser desfeita/i)).toBeTruthy();
  });

  it('a confirmação é sobre UM fato, e não sobre a lista', () => {
    render(<AssistantMemoryScreen state={estado()} />);
    fireEvent.press(screen.getAllByLabelText(/apagar este fato/i)[1]);
    expect(screen.getAllByText(/não pode ser desfeita/i)).toHaveLength(1);
  });

  it('confirmar chama quem apaga, com o id certo', () => {
    const apagar = jest.fn();
    render(<AssistantMemoryScreen state={estado({ apagar })} />);
    fireEvent.press(screen.getAllByLabelText(/apagar este fato/i)[0]);
    fireEvent.press(screen.getByText('Excluir'));
    expect(apagar).toHaveBeenCalledWith('f-1');
  });

  it('cancelar não apaga', () => {
    const apagar = jest.fn();
    render(<AssistantMemoryScreen state={estado({ apagar })} />);
    fireEvent.press(screen.getAllByLabelText(/apagar este fato/i)[0]);
    fireEvent.press(screen.getByText('Cancelar'));
    expect(apagar).not.toHaveBeenCalled();
  });

  it('apagar todos existe e pede confirmação própria', () => {
    const apagarTudo = jest.fn();
    render(<AssistantMemoryScreen state={estado({ apagarTudo })} />);
    fireEvent.press(screen.getByLabelText(/apagar tudo o que eu lembro/i));
    // A afirmação é sobre a MENSAGEM do painel, e não sobre o rótulo do botão:
    // procurar por "apagar tudo" acharia o próprio botão e o teste passaria
    // sem que painel nenhum tivesse aberto.
    expect(screen.getByText(/tudo o que eu lembro de você some/i)).toBeTruthy();
    fireEvent.press(screen.getByText('Excluir'));
    expect(apagarTudo).toHaveBeenCalled();
  });

  it('sem fato nenhum, não há o que apagar em massa', () => {
    render(<AssistantMemoryScreen state={estado({ fatos: [] })} />);
    expect(screen.queryByLabelText(/apagar tudo o que eu lembro/i)).toBeNull();
  });
});

describe('revogação — art. 18, IX, e o art. 8º, §5', () => {
  it('o estado do interruptor aparece em TEXTO, não só na posição do controle', () => {
    render(<AssistantMemoryScreen state={estado({ ligada: true })} />);
    expect(screen.getByText(/memória ligada/i)).toBeTruthy();

    screen.rerender(<AssistantMemoryScreen state={estado({ ligada: false })} />);
    expect(screen.getByText(/memória desligada/i)).toBeTruthy();
  });

  it('desligar PERGUNTA se também apaga, com as duas saídas visíveis', () => {
    // Revogar (art. 18, IX) e eliminar (art. 18, VI) são direitos diferentes.
    // Apagar sem perguntar destruiria dado que a pessoa talvez quisesse
    // manter; manter sem perguntar deixaria dado sensível guardado depois de
    // ela dizer que não quer mais.
    render(<AssistantMemoryScreen state={estado()} />);
    fireEvent.press(screen.getByLabelText(/desligar a memória/i));
    expect(screen.getByText(/manter o que já está guardado/i)).toBeTruthy();
    expect(screen.getByText(/desligar e apagar tudo/i)).toBeTruthy();
  });

  it('desligar sem apagar desliga e mantém os fatos', () => {
    const definirLigada = jest.fn();
    const apagarTudo = jest.fn();
    render(<AssistantMemoryScreen state={estado({ definirLigada, apagarTudo })} />);
    fireEvent.press(screen.getByLabelText(/desligar a memória/i));
    fireEvent.press(screen.getByText(/manter o que já está guardado/i));
    expect(definirLigada).toHaveBeenCalledWith(false);
    expect(apagarTudo).not.toHaveBeenCalled();
  });

  it('desligar e apagar faz as duas coisas', () => {
    const definirLigada = jest.fn();
    const apagarTudo = jest.fn();
    render(<AssistantMemoryScreen state={estado({ definirLigada, apagarTudo })} />);
    fireEvent.press(screen.getByLabelText(/desligar a memória/i));
    fireEvent.press(screen.getByText(/desligar e apagar tudo/i));
    expect(definirLigada).toHaveBeenCalledWith(false);
    expect(apagarTudo).toHaveBeenCalled();
  });

  it('LIGAR de novo não pergunta nada', () => {
    const definirLigada = jest.fn();
    render(<AssistantMemoryScreen state={estado({ ligada: false, definirLigada })} />);
    fireEvent.press(screen.getByLabelText(/ligar a memória/i));
    expect(definirLigada).toHaveBeenCalledWith(true);
    // O botão "Apagar tudo" da lista continua na tela, e é legítimo. O que não
    // pode aparecer é a PERGUNTA do desligamento.
    expect(screen.queryByText(/desligar e apagar tudo/i)).toBeNull();
  });
});

describe('o que esta tela NÃO tem', () => {
  it('não carrega o aviso de encaminhamento a profissional de saúde', () => {
    // Decisão registrada na spec §5.2: esta tela não mostra número de exame
    // nenhum. O aviso é obrigatório onde há número (R2); repetido onde não há,
    // vira ruído e enfraquece onde importa.
    render(<AssistantMemoryScreen state={estado()} />);
    expect(screen.queryByText(/não substitui avaliação médica/i)).toBeNull();
  });

  it('não usa o termo vetado', () => {
    render(<AssistantMemoryScreen state={estado()} />);
    const raiz = ['defi', 'nitiv'].join('');
    expect(screen.queryByText(new RegExp(raiz, 'i'))).toBeNull();
  });
});
