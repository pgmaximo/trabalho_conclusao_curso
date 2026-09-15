import { isFileKeyValid } from '../fileKeyValidation';

describe('isFileKeyValid', () => {
  const importId = 'b2f1c5b0-1234-4a5b-9c1d-abcdef123456';

  it('accepts a key under health-imports/<identityId>/<importId>/<file>', () => {
    expect(isFileKeyValid(`health-imports/abc123/${importId}/pedometer.csv`, importId)).toBe(true);
  });

  it('rejects a key whose importId segment does not match', () => {
    expect(isFileKeyValid('health-imports/abc123/other-import-id/pedometer.csv', importId)).toBe(false);
  });

  it('rejects a key outside health-imports/', () => {
    expect(isFileKeyValid(`medical-documents/abc123/${importId}/pedometer.csv`, importId)).toBe(false);
  });

  it('rejects a key missing the filename segment', () => {
    expect(isFileKeyValid(`health-imports/abc123/${importId}/`, importId)).toBe(false);
  });

  it('rejects a key with a nested path in the filename segment (path traversal shape)', () => {
    expect(isFileKeyValid(`health-imports/abc123/${importId}/../../secret.csv`, importId)).toBe(false);
  });

  it('escapes regex metacharacters in importId', () => {
    const trickyId = 'a.b+c(d)';
    expect(isFileKeyValid(`health-imports/abc123/${trickyId}/file.csv`, trickyId)).toBe(true);
    expect(isFileKeyValid('health-imports/abc123/aXbYc(d)/file.csv', trickyId)).toBe(false);
  });

  it('rejects when importId is empty', () => {
    expect(isFileKeyValid('health-imports/abc123//file.csv', '')).toBe(false);
  });
});
