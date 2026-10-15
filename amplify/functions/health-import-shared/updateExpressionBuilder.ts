// Modulo puro compartilhado (ver comentario em fileKeyValidation.ts sobre a
// excecao de compartilhar entre as duas Lambdas desta feature).
//
// Monta um UpdateCommand do DynamoDB a partir de um objeto simples,
// decidindo SET vs REMOVE por campo: `undefined` = nao mencionar (deixa como
// esta), `null` = REMOVE (apaga o atributo), qualquer outro valor = SET.
// Isso evita escrever `SET periodStart = :periodStart` com `:periodStart`
// igual a `null` quando nenhum periodo foi identificado -- o DynamoDB aceita
// o tipo NULL, mas misturar "atributo ausente" com "atributo NULL" e uma
// fonte facil de bug ao comparar `item.periodStart` depois.
export type UpdateExpressionInput = Record<string, string | number | boolean | string[] | null | undefined>;

export type UpdateExpressionResult = {
  UpdateExpression: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, unknown>;
};

export function buildUpdateExpression(fields: UpdateExpressionInput): UpdateExpressionResult {
  const setParts: string[] = [];
  const removeParts: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;

    const nameKey = `#${key}`;
    names[nameKey] = key;

    if (value === null) {
      removeParts.push(nameKey);
    } else {
      const valueKey = `:${key}`;
      setParts.push(`${nameKey} = ${valueKey}`);
      values[valueKey] = value;
    }
  }

  const clauses: string[] = [];
  if (setParts.length > 0) clauses.push(`SET ${setParts.join(', ')}`);
  if (removeParts.length > 0) clauses.push(`REMOVE ${removeParts.join(', ')}`);

  return {
    UpdateExpression: clauses.join(' '),
    ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
    ExpressionAttributeValues: Object.keys(values).length > 0 ? values : undefined,
  };
}
