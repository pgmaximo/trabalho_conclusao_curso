/** Aplica uma máscara HH:MM a um texto digitado livremente, mantendo o valor
 * sempre dentro de um horário válido (hora 00-23, minuto 00-59). */
export function maskTimeInput(rawText: string): string {
  let digits = rawText.replace(/\D/g, '').slice(0, 4);

  if (!digits) return '';

  // Primeiro dígito da hora só pode ser 0-2 (hora válida é 00-23). Um dígito
  // 3-9 nessa posição não fecha nenhuma hora válida, então tratamos como se
  // faltasse o zero à esquerda (ex.: "5" -> "05").
  if (digits.length === 1 && Number(digits) > 2) {
    digits = `0${digits}`;
  }

  let hours = digits.slice(0, 2);
  let minutes = digits.slice(2, 4);

  if (hours.length === 2 && Number(hours) > 23) {
    hours = '23';
  }

  if (minutes.length === 1 && Number(minutes) > 5) {
    minutes = `0${minutes}`;
  } else if (minutes.length === 2 && Number(minutes) > 59) {
    minutes = '59';
  }

  return minutes ? `${hours}:${minutes}` : hours;
}
