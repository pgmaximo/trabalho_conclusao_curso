/**
 * Resumo do arquivo:
 * O nome do remedio sem concentracao nem posologia (D4.2), num modulo PURO.
 *
 * Nasceu em `receitasSaida.ts` (E4) e saiu de la no E11: o lembrete proposto
 * pela IA tem de cortar o nome com a MESMA regra ("vitamina d 2000 ui" vira
 * "vitamina d"), e `receitasSaida.ts` importa a porta de leitura, que carrega o
 * SDK da AWS. Duas copias divergiriam, e a que divergisse deixaria a dose
 * entrar pelo nome.
 */
import { removerDose } from '../../drug-interactions-shared/normalizeDrugName';

/** A partir do primeiro digito que nao esta colado a letra (nem a outro
 *  digito colado a letra), e posologia: "AAS 100", "AAS-100", "Clav.125",
 *  "Paracetamol 750 1cp 8/8h", "de 8 em 8 horas". Codigo colado a letra
 *  ("B12", "D3") fica, porque e parte do nome. */
const A_PARTIR_DO_PRIMEIRO_NUMERO = /(^|[^\p{L}\d])\d.*$/u;
/** O que sobra pendurado depois do corte: "Amoxicilina de", "Dipirona 0,",
 *  "AAS-", "Losartana #". O "a" so sai dentro de "a cada": solto, e parte do
 *  nome ("Vitamina A"). */
const SOBRA_NO_FIM = /(?:\s+(?:de|a\s+cada|cada|por|em|com|x)|[\s.,:;#%+/-])+$/i;

/**
 * Comeca pela regra do E9 (`removerDose`), que tira parentese e "50 mg" -- mas
 * ela so corta numero seguido de unidade, e o revisor do E4 mediu "AAS 100",
 * "Bisoprolol 2,5mg" (sobrava "2,") e "Paracetamol 750 1cp 8/8h" passando pela
 * R3. Por isso o corte daqui vai alem: alargar `removerDose` mudaria o
 * reconhecimento de nomes do E9.
 */
function semPosologia(parte: string): string {
  return ` ${removerDose(parte)}`.replace(/\s+/g, ' ').replace(A_PARTIR_DO_PRIMEIRO_NUMERO, '$1').replace(SOBRA_NO_FIM, '').trim();
}

/** Combinacao ("Amoxicilina 875 + Clavulanato 125mg"): cada parte e limpa
 *  sozinha. Cortar o rotulo inteiro no primeiro numero perdia o segundo
 *  principio ativo (risco 2 do E4). Nada sobrando, devolve `''`: quem chama
 *  decide o que isso significa (ilegivel na receita, campo vazio no lembrete). */
export function nomeSemPosologia(texto: string): string {
  return texto.split('+').map(semPosologia).filter(Boolean).join(' + ');
}
