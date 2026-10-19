/**
 * Resumo do arquivo:
 * O mapa do app que o assistente usa para orientar (E1, D1.3). O erro mais
 * grave aqui e mandar a pessoa para uma tela ou um botao que nao existe -- uma
 * pessoa de baixo letramento digital, perdida no app, desiste. Por isso o
 * teste le o DISCO: as rotas de `src/app`, os rotulos de
 * `src/constants/navigation.ts` e o codigo das telas de onde os botoes saem.
 *
 * A Lambda nao importa de `src/`; o teste importa, e e ele que garante que as
 * duas copias dos rotulos (a do app e a do mapa) nao divergem.
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { APP_TABS, MORE_MENU_ITEMS } from '../../../../src/constants/navigation';
import { MAPA_DO_APP, MAPA_DO_APP_PROMPT } from '../mapaDoApp';

const RAIZ = join(__dirname, '..', '..', '..', '..');
const APP = join(RAIZ, 'src', 'app');
const APP_LOGADO = join(APP, '(app)');

/** Telas que o mapa NAO cita, com o motivo. Toda tela nova cai aqui ou no mapa. */
const FORA_DO_MAPA: Record<string, string> = {
  index: 'login, antes de entrar no app',
  register: 'cadastro de conta, antes de entrar no app',
  confirm: 'confirmação de conta, antes de entrar no app',
  'forgot-password': 'recuperação de senha, antes de entrar no app',
  'profile-setup': 'primeiro acesso, antes de entrar no app',
  'dev-preview': 'só existe em desenvolvimento',
};

/**
 * Botao citado num caminho -> arquivo da tela e o que a pessoa VE nele. Os de
 * icone mostram so o "+"; o nome existe so para o leitor de tela. Mandar a
 * pessoa procurar "Adicionar medicamento" por escrito a deixa perdida -- por
 * isso o caminho de um botao de icone diz "botão + (nome)".
 */
const BOTOES: Record<string, { arquivo: string; tipo: 'icone' | 'texto' }> = {
  'Adicionar documento': { arquivo: 'src/screens/ExamsScreen.tsx', tipo: 'icone' },
  Evolução: { arquivo: 'src/components/AnalyteSeriesEntry.tsx', tipo: 'texto' },
  'Adicionar medicamento': { arquivo: 'src/screens/MedicinesScreen.tsx', tipo: 'icone' },
  'Novo compromisso': { arquivo: 'src/screens/AgendaScreen.tsx', tipo: 'icone' },
  'Adicionar vacina': { arquivo: 'src/screens/VaccinationScreen.tsx', tipo: 'icone' },
  Importar: { arquivo: 'src/screens/HealthDashboardScreen.tsx', tipo: 'texto' },
  'Editar perfil': { arquivo: 'src/screens/ProfileScreen.tsx', tipo: 'texto' },
};

const BOTAO_DE_ICONE = /^botão \+ \((.+)\)$/;

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ABAS: string[] = APP_TABS.map((t) => t.label);
const ITENS_DO_MAIS: string[] = MORE_MENU_ITEMS.map((i) => i.label);

function telasEm(pasta: string): string[] {
  return readdirSync(pasta)
    .filter((f) => f.endsWith('.tsx') && f !== '_layout.tsx')
    .map((f) => f.replace(/\.tsx$/, ''));
}

describe('o mapa so cita telas que existem', () => {
  it('toda rota do mapa existe em src/app ou src/app/(app)', () => {
    for (const { rota } of MAPA_DO_APP) {
      const existe =
        existsSync(join(APP, `${rota}.tsx`)) || existsSync(join(APP_LOGADO, `${rota}.tsx`));
      expect({ rota, existe }).toEqual({ rota, existe: true });
    }
  });

  it('toda tela de src/app esta no mapa ou em FORA_DO_MAPA', () => {
    const mapeadas = new Set(MAPA_DO_APP.map((t) => t.rota));
    for (const rota of [...telasEm(APP), ...telasEm(APP_LOGADO)]) {
      if (!mapeadas.has(rota) && !(rota in FORA_DO_MAPA)) {
        throw new Error(
          `A tela "${rota}" nao esta no mapa do assistente: acrescente em mapaDoApp.ts ou em FORA_DO_MAPA, com o motivo.`,
        );
      }
    }
  });

  it('nenhuma rota aparece duas vezes', () => {
    const rotas = MAPA_DO_APP.map((t) => t.rota);
    expect(new Set(rotas).size).toBe(rotas.length);
  });
});

describe('o caminho usa os rotulos que o app mostra', () => {
  it('o 1o passo e uma aba da barra, com o rotulo de APP_TABS', () => {
    for (const { rota, caminho } of MAPA_DO_APP) {
      expect({ rota, passo: caminho[0], ehAba: ABAS.includes(caminho[0]) }).toEqual({
        rota,
        passo: caminho[0],
        ehAba: true,
      });
    }
  });

  it('depois de "Mais", o 2o passo e um item de MORE_MENU_ITEMS, com o mesmo rotulo', () => {
    for (const { rota, caminho } of MAPA_DO_APP.filter((t) => t.caminho[0] === 'Mais')) {
      if (caminho.length < 2) continue;
      expect({ rota, ehItem: ITENS_DO_MAIS.includes(caminho[1]) }).toEqual({ rota, ehItem: true });
    }
  });

  it('todo outro passo e gesto ("tocar..."), botao de icone ("botão + (nome)") ou texto visivel', () => {
    for (const { rota, caminho } of MAPA_DO_APP) {
      const inicio = caminho[0] === 'Mais' ? 2 : 1;
      for (const passo of caminho.slice(inicio)) {
        if (passo.startsWith('tocar ')) continue;
        const icone = BOTAO_DE_ICONE.exec(passo);
        const nome = icone ? icone[1] : passo;
        const botao = BOTOES[nome];
        expect({ rota, passo, tipo: botao?.tipo }).toEqual({
          rota,
          passo,
          tipo: icone ? 'icone' : 'texto',
        });
        const fonte = readFileSync(join(RAIZ, botao.arquivo), 'utf8');
        if (icone) {
          expect(fonte).toContain(`accessibilityLabel="${nome}"`);
          expect(fonte).toContain('name="add"');
        } else {
          expect(fonte).toMatch(new RegExp(`<Text[^>]*>\\s*${escapar(nome)}\\s*</Text>`));
        }
      }
    }
  });

  it('o Assistente diz onde ficam as conversas antigas, pelo icone que a tela mostra', () => {
    const assistente = MAPA_DO_APP.find((t) => t.rota === 'ai');
    expect(assistente?.oQueFaz).toContain('relógio');
    const tela = readFileSync(join(RAIZ, 'src/screens/ChatBotScreen.tsx'), 'utf8');
    expect(tela).toContain('accessibilityLabel="Histórico de conversas"');
    expect(tela).toContain('name="time-outline"');
  });

  it('o nome da tela da barra ou do menu Mais e o proprio rotulo', () => {
    for (const { nome, caminho } of MAPA_DO_APP) {
      const ultimo = caminho[caminho.length - 1];
      if (ABAS.includes(ultimo) || ITENS_DO_MAIS.includes(ultimo)) expect(nome).toBe(ultimo);
    }
  });
});

describe('o texto que vai ao prompt', () => {
  it('nao tem rota, arquivo nem marcacao', () => {
    expect(MAPA_DO_APP_PROMPT).not.toMatch(/(^|\s)\/[a-z]|\.tsx?\b|\*|#|\]\(|https?:/);
    for (const { rota } of MAPA_DO_APP) {
      if (rota.includes('-')) expect(MAPA_DO_APP_PROMPT).not.toContain(rota);
    }
  });

  it('tem uma linha por tela, com nome e caminho com " > "', () => {
    const linhas = MAPA_DO_APP_PROMPT.split('\n');
    expect(linhas).toHaveLength(MAPA_DO_APP.length);
    MAPA_DO_APP.forEach((tela, i) => {
      expect(linhas[i].startsWith(tela.nome)).toBe(true);
      expect(linhas[i]).toContain(tela.caminho.join(' > '));
    });
  });

  it('cabe em 1.800 caracteres', () => {
    expect(MAPA_DO_APP_PROMPT.length).toBeLessThanOrEqual(1800);
  });

  it('Medicamentos, Vacinacao e Prevencao sao apelidos de telas do mapa', () => {
    const apelidoDe = (apelido: string) =>
      MAPA_DO_APP.find((t) => t.apelidos?.includes(apelido))?.nome;
    expect(apelidoDe('Medicamentos')).toBe('Remédios');
    expect(apelidoDe('Vacinação')).toBe('Carteira de vacinação');
    expect(apelidoDe('Prevenção')).toBe('Prevenção & Alertas');
  });
});
