jest.mock('aws-amplify/data', () => ({
  generateClient: jest.fn(() => ({})),
}));

// healthImportService importa fetchAuthSession de 'aws-amplify/auth', que
// transitivamente carrega uuid (ESM não transformado pelo Jest) — mesmo
// problema documentado em login-screen.test.tsx. Stubar evita o crash de
// load sem afetar o comportamento testado (validatePickedFiles não usa auth).
jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn(),
}));

// healthImportService também importa uploadFileToS3 de '@/services/upload',
// que importa 'aws-amplify/storage' — mesmo problema de ESM (via
// @aws-amplify/core) descrito acima para 'aws-amplify/auth'.
jest.mock('aws-amplify/storage', () => ({
  uploadData: jest.fn(),
}));

// healthImportService também importa 'uuid' diretamente (não só via
// aws-amplify) para gerar o importId — mesmo problema de ESM não
// transformado pelo Jest. validatePickedFiles (o que este arquivo testa) não
// usa uuid, então o mock nunca precisa gerar um valor real.
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

import {
  MAX_FILE_COUNT,
  MAX_STANDALONE_FILE_SIZE_BYTES,
  MAX_ZIP_SIZE_BYTES,
  type PickedHealthFile,
  validatePickedFiles,
} from '@/services/healthImportService';

function file(overrides: Partial<PickedHealthFile> = {}): PickedHealthFile {
  return { name: 'pedometer.csv', uri: 'file:///tmp/pedometer.csv', size: 1024, ...overrides };
}

describe('validatePickedFiles', () => {
  it('accepts a single valid CSV', () => {
    expect(validatePickedFiles([file()])).toEqual([]);
  });

  it('accepts a valid JSON file', () => {
    expect(validatePickedFiles([file({ name: 'hrv.json' })])).toEqual([]);
  });

  it('accepts a valid ZIP within the ZIP size limit', () => {
    expect(validatePickedFiles([file({ name: 'export.zip', size: MAX_ZIP_SIZE_BYTES })])).toEqual([]);
  });

  it('rejects an empty selection', () => {
    const errors = validatePickedFiles([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.field).toBe('files');
  });

  it('rejects more than MAX_FILE_COUNT files', () => {
    const files = Array.from({ length: MAX_FILE_COUNT + 1 }, (_, i) => file({ name: `file-${i}.csv` }));
    const errors = validatePickedFiles(files);
    expect(errors.some((e) => e.message.includes(String(MAX_FILE_COUNT)))).toBe(true);
  });

  it('rejects a disallowed extension', () => {
    const errors = validatePickedFiles([file({ name: 'export.pdf' })]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('não é um formato aceito');
  });

  it('rejects a standalone CSV/JSON larger than the per-file limit', () => {
    const errors = validatePickedFiles([file({ size: MAX_STANDALONE_FILE_SIZE_BYTES + 1 })]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('muito grande');
  });

  it('applies the larger ZIP size limit only to .zip files', () => {
    const zipOk = validatePickedFiles([
      file({ name: 'export.zip', size: MAX_STANDALONE_FILE_SIZE_BYTES + 1 }),
    ]);
    expect(zipOk).toEqual([]);

    const zipTooBig = validatePickedFiles([file({ name: 'export.zip', size: MAX_ZIP_SIZE_BYTES + 1 })]);
    expect(zipTooBig).toHaveLength(1);
  });

  it('reports one error per invalid file, not just the first', () => {
    const errors = validatePickedFiles([file({ name: 'a.exe' }), file({ name: 'b.exe' })]);
    expect(errors).toHaveLength(2);
  });

  it('accepts a mixed valid selection of csv, json and zip', () => {
    const errors = validatePickedFiles([
      file({ name: 'pedometer.csv' }),
      file({ name: 'hrv.json' }),
      file({ name: 'export.zip', size: 50 * 1024 * 1024 }),
    ]);
    expect(errors).toEqual([]);
  });
});
