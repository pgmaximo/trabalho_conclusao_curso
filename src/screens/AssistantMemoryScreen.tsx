import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DeleteConfirmPanel } from '@/components/DeleteConfirmPanel';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useThemeColors } from '@/constants/theme';
import type { UseAssistantMemoryReturn } from '@/hooks/useAssistantMemory';
import type { FatoSalvo } from '@/services/assistantMemoryService';
import { MAX_CARACTERES_FATO } from '../../amplify/functions/chat-assistant/memoria/regras';
import type { MemoryKind } from '../../amplify/functions/chat-assistant/memoria/regras';

/**
 * Resumo do arquivo:
 * "O que eu lembro" — a tela em que os direitos do art. 18 da LGPD deixam de
 * ser texto de política e viram botão (D34, M9/M10).
 *
 * Ela NÃO carrega o aviso de encaminhamento a profissional de saúde, e isso é
 * decisão registrada na spec §5.2: aqui não aparece número de exame nenhum. O
 * aviso é obrigatório onde há número (R2); repetido onde não há, ele vira ruído
 * e enfraquece exatamente onde importa.
 *
 * Nenhum rótulo desta tela interpreta saúde. Os nomes dos tipos falam de FORMA
 * de conversa e de rotina, porque é só isso que a memória guarda.
 */

/** O art. 6º, VI (transparência) numa frase, e ela aparece inclusive vazia. */
const ABERTURA =
  'Eu só guardo o que você confirma, e você pode apagar quando quiser. Isto não são seus exames — é só o que ajuda a conversar do seu jeito.';

const VAZIO = 'Ainda não guardei nada. Quando você me contar algo que mude o jeito de eu responder, eu pergunto antes de guardar.';

const RECUSADO = 'Não posso guardar isso. Exame, doença e remédio ficam no seu registro, não aqui.';

/**
 * Os rótulos dos quatro tipos. Escritos do ponto de vista da pessoa, e nenhum
 * deles nomeia condição, resultado ou qualquer coisa que dependa de leitura
 * clínica.
 */
const ROTULO_DO_TIPO: Record<string, string> = {
  COMO_ME_CHAMAR: 'Como te chamar',
  PREFERENCIA_DE_RESPOSTA: 'Como você prefere as respostas',
  ROTINA: 'Sua rotina',
  ACESSO_A_CUIDADO: 'Como você se cuida',
};

/** `formatDateForDisplay` espera AAAA-MM-DD; o que vem do banco tem hora. */
function dataCurta(iso: string | null): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
}

type LinhaDeFatoProps = {
  fato: FatoSalvo;
  state: UseAssistantMemoryReturn;
};

function LinhaDeFato({ fato, state }: LinhaDeFatoProps) {
  const colors = useThemeColors();
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(fato.texto);
  const [aConfirmar, setAConfirmar] = useState(false);
  const [recusado, setRecusado] = useState(false);

  async function salvar() {
    const resultado = await state.editar(fato.id, rascunho, fato.tipo as MemoryKind);
    if (resultado.ok) {
      setEditando(false);
      setRecusado(false);
      return;
    }
    // O texto antigo continua na tela: a edição recusada não apaga o que já
    // estava guardado e confirmado.
    setRecusado(true);
  }

  return (
    <View className="mb-3 rounded-card border border-app-border bg-app-surface p-4 dark:border-app-dark-border dark:bg-app-dark-surface">
      <Text className="text-[12px] font-semibold uppercase tracking-wide text-app-textSecondary dark:text-app-dark-textSecondary">
        {ROTULO_DO_TIPO[fato.tipo] ?? 'Sua rotina'}
      </Text>

      {editando ? (
        <>
          <TextInput
            accessibilityLabel="Texto do fato"
            value={rascunho}
            onChangeText={setRascunho}
            multiline
            maxLength={MAX_CARACTERES_FATO}
            className="mt-2 min-h-12 rounded-field border border-app-border px-3 py-2 text-[15px] text-app-text dark:border-app-dark-border dark:text-app-dark-text"
          />
          {recusado ? (
            <Text className="mt-2 text-[13px] text-app-danger dark:text-app-dark-danger">
              {RECUSADO}
            </Text>
          ) : null}
          <View className="mt-3 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              onPress={() => void salvar()}
              className="h-11 flex-1 items-center justify-center rounded-field border-[1.5px] border-app-primary bg-app-primarySoft dark:border-app-dark-primary dark:bg-app-dark-primarySoft"
            >
              <Text className="text-[14px] font-semibold text-app-primary dark:text-app-dark-primary">
                Salvar
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setRascunho(fato.texto);
                setRecusado(false);
                setEditando(false);
              }}
              className="h-11 flex-1 items-center justify-center rounded-field border-[1.5px] border-app-border bg-app-background dark:border-app-dark-border dark:bg-app-dark-background"
            >
              <Text className="text-[14px] font-semibold text-app-text dark:text-app-dark-text">
                Cancelar
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Text className="mt-1 text-[15px] leading-[21px] text-app-text dark:text-app-dark-text">
          {fato.texto}
        </Text>
      )}

      <View className="mt-3 flex-row items-center gap-3">
        <Text className="flex-1 text-[12px] text-app-textSecondary dark:text-app-dark-textSecondary">
          {fato.editadoEm
            ? `Guardado em ${dataCurta(fato.confirmadoEm)} · corrigido em ${dataCurta(fato.editadoEm)}`
            : `Guardado em ${dataCurta(fato.confirmadoEm)}`}
        </Text>

        {/* O atalho só existe se a conversa ainda existir. A pessoa pode ter
            apagado aquela conversa (D33), e o fato continua sendo dela. */}
        {fato.conversaDeOrigem ? (
          <Pressable
            accessibilityLabel="Ver a conversa de origem"
            accessibilityRole="button"
            onPress={() => state.abrirConversa(fato.conversaDeOrigem as string)}
            className="size-9 items-center justify-center rounded-xl"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.iconMuted} />
          </Pressable>
        ) : null}

        <Pressable
          accessibilityLabel="Editar este fato"
          accessibilityRole="button"
          onPress={() => setEditando(true)}
          className="size-9 items-center justify-center rounded-xl"
        >
          <Ionicons name="create-outline" size={16} color={colors.iconMuted} />
        </Pressable>

        <Pressable
          accessibilityLabel="Apagar este fato"
          accessibilityRole="button"
          onPress={() => setAConfirmar(true)}
          className="size-9 items-center justify-center rounded-xl"
        >
          <Ionicons name="trash-outline" size={16} color={colors.iconMuted} />
        </Pressable>
      </View>

      {aConfirmar ? (
        <View className="mt-3">
          <DeleteConfirmPanel
            message="Apagar este fato? Ele some de vez, e não pode ser desfeita."
            onCancel={() => setAConfirmar(false)}
            onConfirm={() => void state.apagar(fato.id)}
          />
        </View>
      ) : null}
    </View>
  );
}

export function AssistantMemoryScreen({ state }: { state: UseAssistantMemoryReturn }) {
  const [perguntandoDesligar, setPerguntandoDesligar] = useState(false);
  const [confirmandoTudo, setConfirmandoTudo] = useState(false);

  function tocarNoInterruptor() {
    if (!state.ligada) {
      // Ligar não pergunta nada: ligar não cria dado nenhum, porque gravar
      // continua dependendo de confirmação por fato.
      void state.definirLigada(true);
      return;
    }
    setPerguntandoDesligar(true);
  }

  return (
    <ScrollView
      className="flex-1 bg-app-background px-5 pt-6 dark:bg-app-dark-background"
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title="O que eu lembro" />

      <Text className="mb-5 text-[14px] leading-[20px] text-app-textSecondary dark:text-app-dark-textSecondary">
        {ABERTURA}
      </Text>

      {/* O estado aparece em TEXTO, e não só na posição de um controle: um
          interruptor sem rótulo obriga a pessoa a adivinhar se ligado é para a
          esquerda ou para a direita. */}
      <View className="mb-5 rounded-card border border-app-border bg-app-surface p-4 dark:border-app-dark-border dark:bg-app-dark-surface">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-[15px] font-semibold text-app-text dark:text-app-dark-text">
            {state.ligada ? 'Memória ligada' : 'Memória desligada'}
          </Text>
          <Pressable
            accessibilityLabel={state.ligada ? 'Desligar a memória' : 'Ligar a memória'}
            accessibilityRole="switch"
            accessibilityState={{ checked: state.ligada }}
            onPress={tocarNoInterruptor}
            className="h-10 min-w-24 items-center justify-center rounded-field border-[1.5px] border-app-border px-4 dark:border-app-dark-border"
          >
            <Text className="text-[14px] font-semibold text-app-text dark:text-app-dark-text">
              {state.ligada ? 'Desligar' : 'Ligar'}
            </Text>
          </Pressable>
        </View>

        {/* Desligar PERGUNTA se também apaga. Revogar o consentimento
            (art. 18, IX) e eliminar o que já foi guardado (art. 18, VI) são
            direitos diferentes, e o art. 8º, §5 diz que um não arrasta o outro.
            As duas saídas aparecem com o mesmo peso. */}
        {perguntandoDesligar ? (
          <View className="mt-4">
            <Text className="text-[14px] leading-[20px] text-app-text dark:text-app-dark-text">
              Eu paro de guardar e de usar o que já está guardado. E o que já
              guardei, você quer manter ou apagar?
            </Text>
            <View className="mt-3 gap-2">
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void state.definirLigada(false);
                  setPerguntandoDesligar(false);
                }}
                className="h-11 items-center justify-center rounded-field border-[1.5px] border-app-border bg-app-background dark:border-app-dark-border dark:bg-app-dark-background"
              >
                <Text className="text-[14px] font-semibold text-app-text dark:text-app-dark-text">
                  Manter o que já está guardado
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void state.definirLigada(false);
                  void state.apagarTudo();
                  setPerguntandoDesligar(false);
                }}
                className="h-11 items-center justify-center rounded-field border-[1.5px] border-app-dangerBadgeBorder bg-app-dangerSoft dark:border-app-dark-dangerBadgeBorder dark:bg-app-dark-dangerSoft"
              >
                <Text className="text-[14px] font-semibold text-app-danger dark:text-app-dark-danger">
                  Desligar e apagar tudo
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {state.fatos.length === 0 ? (
        <Text className="text-[15px] leading-[21px] text-app-textSecondary dark:text-app-dark-textSecondary">
          {VAZIO}
        </Text>
      ) : (
        <>
          {state.fatos.map((fato) => (
            <LinhaDeFato key={fato.id} fato={fato} state={state} />
          ))}

          <View className="mb-10 mt-2">
            {confirmandoTudo ? (
              <DeleteConfirmPanel
                message="Tudo o que eu lembro de você some, e isso não volta."
                onCancel={() => setConfirmandoTudo(false)}
                onConfirm={() => void state.apagarTudo()}
              />
            ) : (
              <Pressable
                accessibilityLabel="Apagar tudo o que eu lembro"
                accessibilityRole="button"
                onPress={() => setConfirmandoTudo(true)}
                className="h-11 items-center justify-center rounded-field border-[1.5px] border-app-dangerBadgeBorder dark:border-app-dark-dangerBadgeBorder"
              >
                <Text className="text-[14px] font-semibold text-app-danger dark:text-app-dark-danger">
                  Apagar tudo
                </Text>
              </Pressable>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}
