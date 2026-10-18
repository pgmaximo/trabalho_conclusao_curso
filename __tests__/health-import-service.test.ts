// O cliente é montado no carregamento do módulo: as funções abaixo só leem
// os `mock*` na hora da chamada, quando eles já existem.
const mockGetImport = jest.fn();
const mockListImports = jest.fn();
const mockDeleteImport = jest.fn();
const mockRemove = jest.fn();

jest.mock('aws-amplify/data', () => ({
  generateClient: jest.fn(() => ({
    models: {
      HealthImport: {
        get: (...args: unknown[]) => mockGetImport(...args),
        list: (...args: unknown[]) => mockListImports(...args),
        delete: (...args: unknown[]) => mockDeleteImport(...args),
      },
    },
  })),
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
  remove: (...args: unknown[]) => mockRemove(...args),
}));

// healthImportService também importa 'uuid' diretamente (não só via
// aws-amplify) para gerar o importId — mesmo problema de ESM não
// transformado pelo Jest. validatePickedFiles (o que este arquivo testa) não
// usa uuid, então o mock nunca precisa gerar um valor real.
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

import {
  canDeleteHealthImport,
  deleteHealthImport,
  getLatestReadyHealthImport,
  IN_PROGRESS_DELETABLE_AFTER_MS,
  listHealthImports,
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

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'import-1',
    status: 'READY',
    fileKeys: ['health-imports/identity-1/import-1/0-export.zip'],
    fileNames: ['export.zip'],
    resultArtifactKey: 'health-imports/identity-1/import-1/result.json',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:02:00.000Z',
    ...overrides,
  };
}

describe('listHealthImports', () => {
  beforeEach(() => {
    mockListImports.mockReset();
  });

  it('reads every page — the owner filter can leave a page short, with more after it', async () => {
    mockListImports
      .mockResolvedValueOnce({ data: [], nextToken: 'page-2' })
      .mockResolvedValueOnce({ data: [row({ id: 'a' })], nextToken: null });

    const imports = await listHealthImports();

    expect(imports.map((item) => item.id)).toEqual(['a']);
    expect(mockListImports).toHaveBeenLastCalledWith({ nextToken: 'page-2' });
  });

  it('lists the most recently uploaded first, even if an older one finished analysing later', async () => {
    mockListImports.mockResolvedValueOnce({
      data: [
        row({ id: 'older', createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-09T00:00:00.000Z' }),
        row({ id: 'newer', createdAt: '2026-10-05T10:00:00.000Z', updatedAt: '2026-10-05T10:02:00.000Z' }),
      ],
      nextToken: null,
    });

    const imports = await listHealthImports();

    expect(imports.map((item) => item.id)).toEqual(['newer', 'older']);
  });

  it('getLatestReadyHealthImport also reads past the first page', async () => {
    mockListImports
      .mockResolvedValueOnce({ data: [row({ id: 'failed', status: 'FAILED' })], nextToken: 'page-2' })
      .mockResolvedValueOnce({ data: [row({ id: 'ready' })], nextToken: null });

    const latest = await getLatestReadyHealthImport();

    expect(latest?.id).toBe('ready');
  });
});

describe('canDeleteHealthImport', () => {
  const now = Date.parse('2026-10-18T12:00:00.000Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it.each(['READY', 'FAILED'] as const)('always allows deleting a %s import', (status) => {
    expect(canDeleteHealthImport({ status, startedAt: ago(0), createdAt: ago(0) }, now)).toBe(true);
  });

  it('blocks deleting an analysis that may still be running — the Lambda would write the row back', () => {
    expect(
      canDeleteHealthImport({ status: 'PROCESSING', startedAt: ago(60_000), createdAt: ago(90_000) }, now),
    ).toBe(false);
  });

  it('allows deleting an analysis stuck past the deadline, so it does not stay in the list forever', () => {
    expect(
      canDeleteHealthImport(
        { status: 'PROCESSING', startedAt: ago(IN_PROGRESS_DELETABLE_AFTER_MS), createdAt: ago(IN_PROGRESS_DELETABLE_AFTER_MS + 1) },
        now,
      ),
    ).toBe(true);
  });

  it('counts a PENDING import (no startedAt yet) from when it was created', () => {
    expect(canDeleteHealthImport({ status: 'PENDING', startedAt: null, createdAt: ago(60_000) }, now)).toBe(false);
    expect(
      canDeleteHealthImport({ status: 'PENDING', startedAt: null, createdAt: ago(IN_PROGRESS_DELETABLE_AFTER_MS) }, now),
    ).toBe(true);
  });
});

describe('deleteHealthImport', () => {
  beforeEach(() => {
    mockGetImport.mockReset();
    mockDeleteImport.mockReset();
    mockRemove.mockReset();
  });

  it('removes the uploaded files and result.json from S3, then the row', async () => {
    const order: string[] = [];
    mockGetImport.mockResolvedValue({
      data: row({
        fileKeys: ['health-imports/identity-1/import-1/0-a.csv', 'health-imports/identity-1/import-1/1-b.json'],
      }),
    });
    mockRemove.mockImplementation(async ({ path }: { path: string }) => {
      order.push(path);
    });
    mockDeleteImport.mockImplementation(async () => {
      order.push('row');
      return { errors: undefined };
    });

    await deleteHealthImport('import-1');

    expect(order).toEqual([
      'health-imports/identity-1/import-1/0-a.csv',
      'health-imports/identity-1/import-1/1-b.json',
      'health-imports/identity-1/import-1/result.json',
      'row',
    ]);
    expect(mockDeleteImport).toHaveBeenCalledWith({ id: 'import-1' });
  });

  it('skips the result.json when the analysis never wrote one', async () => {
    mockGetImport.mockResolvedValue({ data: row({ resultArtifactKey: '' }) });
    mockRemove.mockResolvedValue(undefined);
    mockDeleteImport.mockResolvedValue({ errors: undefined });

    await deleteHealthImport('import-1');

    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockRemove).toHaveBeenCalledWith({ path: 'health-imports/identity-1/import-1/0-export.zip' });
  });

  it('keeps the row when a file cannot be removed, so deleting again finishes the job', async () => {
    mockGetImport.mockResolvedValue({ data: row() });
    mockRemove.mockRejectedValue(new Error('network'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(deleteHealthImport('import-1')).rejects.toThrow('Não foi possível excluir a importação.');
    expect(mockDeleteImport).not.toHaveBeenCalled();
  });

  it('does nothing when the import is already gone', async () => {
    mockGetImport.mockResolvedValue({ data: null });

    await deleteHealthImport('import-1');

    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockDeleteImport).not.toHaveBeenCalled();
  });
});
