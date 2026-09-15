import { buildUpdateExpression } from '../updateExpressionBuilder';

describe('buildUpdateExpression', () => {
  it('builds a SET clause for defined, non-null values', () => {
    const result = buildUpdateExpression({ status: 'READY', dayCount: 42 });

    expect(result.UpdateExpression).toBe('SET #status = :status, #dayCount = :dayCount');
    expect(result.ExpressionAttributeNames).toEqual({ '#status': 'status', '#dayCount': 'dayCount' });
    expect(result.ExpressionAttributeValues).toEqual({ ':status': 'READY', ':dayCount': 42 });
  });

  it('builds a REMOVE clause for null values', () => {
    const result = buildUpdateExpression({ errorMessage: null });

    expect(result.UpdateExpression).toBe('REMOVE #errorMessage');
    expect(result.ExpressionAttributeValues).toBeUndefined();
  });

  it('skips undefined values entirely (does not touch the attribute)', () => {
    const result = buildUpdateExpression({ status: 'READY', periodStart: undefined });

    expect(result.UpdateExpression).toBe('SET #status = :status');
    expect(result.ExpressionAttributeNames).toEqual({ '#status': 'status' });
  });

  it('combines SET and REMOVE clauses in one expression', () => {
    const result = buildUpdateExpression({ status: 'PROCESSING', errorMessage: null });

    expect(result.UpdateExpression).toBe('SET #status = :status REMOVE #errorMessage');
  });

  it('handles an all-undefined input by producing an empty expression', () => {
    const result = buildUpdateExpression({ a: undefined, b: undefined });

    expect(result.UpdateExpression).toBe('');
    expect(result.ExpressionAttributeNames).toBeUndefined();
    expect(result.ExpressionAttributeValues).toBeUndefined();
  });

  it('preserves array values as-is in SET', () => {
    const result = buildUpdateExpression({ warnings: ['a', 'b'] });

    expect(result.ExpressionAttributeValues).toEqual({ ':warnings': ['a', 'b'] });
  });
});
