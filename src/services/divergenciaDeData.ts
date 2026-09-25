/**
 * Resumo do arquivo:
 * A divergência entre a data que a pessoa digitou no formulário e a data de
 * coleta que o modelo leu do laudo.
 *
 * Por que ele existe (decisão B2 do Bloco 9): o campo do formulário vem
 * preenchido com hoje. Quem digitaliza um exame recém-feito ganha
 * conveniência; quem digitaliza um laudo antigo cai numa armadilha silenciosa
 * — e caiu: um laudo de 04/10/2025 entrou como 18/09/2026, e dois turnos
 * depois o assistente disse as duas datas, as duas corretas, e juntas
 * mentindo.
 *
 * O QUE ELE NÃO FAZ, e é decisão e não esquecimento: **não corrige nada**. A
 * extração não escreve no que a pessoa digitou (D24), e um laudo consolidado
 * reúne coletas de dias diferentes — não existe "a" data para escrever no
 * formulário. Ele informa; quem corrige é a pessoa.
 *
 * Módulo PURO: sem React e sem rede, testado como função.
 */
import { formatDateForDisplay } from '@/utils/date';

/** Só o que este cálculo precisa da linha. Aceitar `LabResultView` inteiro
 *  amarraria este módulo à forma do banco sem ganhar nada. */
type LinhaComData = { collectedAt: string | null };

/**
 * Devolve o aviso, ou `null` quando não há divergência a apontar.
 *
 * A regra de divergência é **fora da faixa**, e não "diferente": um PDF
 * consolidado reúne coletas de vários dias, e uma data digitada que cai entre
 * elas é plausível. Avisar nesse caso seria ruído, e ruído faz a pessoa parar
 * de ler o aviso que às vezes importa.
 *
 * NÃO há tolerância em dias — nem um, nem três. Um limiar desses seria um
 * número que ninguém mediu, e este repositório já carrega um limiar provisório
 * declarado como tal; não vale criar outro para economizar um aviso. Fora da
 * faixa é fora da faixa.
 *
 * As datas são ISO (`AAAA-MM-DD`), e a comparação é de texto de propósito:
 * nessa forma a ordem alfabética é a ordem cronológica, e não há fuso horário
 * no caminho para deslocar um dia.
 */
export function avisoDeDivergenciaDeData(
  documentDate: string | null | undefined,
  linhas: LinhaComData[],
): string | null {
  if (!documentDate) return null;

  const coletas = linhas
    .map((l) => l.collectedAt)
    .filter((d): d is string => typeof d === 'string' && d !== '')
    .sort();

  if (coletas.length === 0) return null;

  const primeira = coletas[0];
  const ultima = coletas[coletas.length - 1];

  if (documentDate >= primeira && documentDate <= ultima) return null;

  const coleta =
    primeira === ultima
      ? `coleta em ${formatDateForDisplay(primeira)}`
      : `coletas entre ${formatDateForDisplay(primeira)} e ${formatDateForDisplay(ultima)}`;

  // A copy não acusa e não manda corrigir: a data digitada pode estar certa, e
  // quem sabe qual das duas vale é a pessoa que tem o papel na mão.
  return `O laudo indica ${coleta}, e este documento está guardado com a data ${formatDateForDisplay(documentDate)}.`;
}
