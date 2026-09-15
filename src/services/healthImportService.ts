/**
 * Resumo do arquivo:
 * Serviço da feature de importação de dados de wearables (Samsung Health /
 * Apple Health). Valida os arquivos escolhidos, faz upload para
 * `health-imports/{identityId}/{importId}/...`, cria a linha `HealthImport`
 * e dispara a mutation `startHealthAnalysis`. A UI (useHealthImportStatus,
 * useHealthDashboardData) chama só esta camada.
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { fetchAuthSession } from 'aws-amplify/auth';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import { uploadFileToS3 } from '@/services/upload';
import type { AnalysisSummary, HealthImport, Insights } from '@/types/healthInsights';

const client = generateClient<Schema>();

export type PickedHealthFile = {
  name: string;
  uri: string;
  size: number;
};

export type HealthFileValidationError = {
  field: string;
  message: string;
};

/**
 * Limites do plan.md §3.6: 20 arquivos, 25MB por arquivo avulso, 1 ZIP de
 * até 100MB (o export real do Samsung Health tem 74MB). Validados aqui
 * ANTES de qualquer upload, e revalidados por start-health-analysis no
 * backend (nunca confiar só na validação do cliente).
 */
export const MAX_FILE_COUNT = 20;
export const MAX_STANDALONE_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_ZIP_SIZE_BYTES = 100 * 1024 * 1024;

const ALLOWED_EXTENSIONS = ['csv', 'json', 'zip'];

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

/**
 * Valida a seleção inteira (não arquivo a arquivo) — quantidade, extensão e
 * tamanho de cada um. Mensagens em pt-BR já prontas para `InlineError`.
 */
export function validatePickedFiles(files: PickedHealthFile[]): HealthFileValidationError[] {
  const errors: HealthFileValidationError[] = [];

  if (files.length === 0) {
    errors.push({ field: 'files', message: 'Selecione pelo menos um arquivo para importar.' });
    return errors;
  }

  if (files.length > MAX_FILE_COUNT) {
    errors.push({
      field: 'files',
      message: `Você pode importar no máximo ${MAX_FILE_COUNT} arquivos por vez.`,
    });
  }

  for (const file of files) {
    const extension = getExtension(file.name);

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push({
        field: file.name,
        message: `"${file.name}" não é um formato aceito. Envie arquivos .csv, .json ou .zip.`,
      });
      continue;
    }

    const maxSize = extension === 'zip' ? MAX_ZIP_SIZE_BYTES : MAX_STANDALONE_FILE_SIZE_BYTES;
    if (file.size > maxSize) {
      const maxSizeMb = Math.round(maxSize / (1024 * 1024));
      errors.push({
        field: file.name,
        message: `"${file.name}" é muito grande (máximo ${maxSizeMb} MB).`,
      });
    }
  }

  return errors;
}

/**
 * Sanitiza o nome do arquivo para uso como segmento de chave S3 — remove
 * caracteres fora de um allowlist simples, sem alterar a extensão.
 */
function sanitizeFileName(fileName: string): string {
  const safe = fileName.replace(/[^A-Za-z0-9._-]/g, '_');
  return safe || 'arquivo';
}

async function resolveIdentityId(): Promise<string> {
  const session = await fetchAuthSession();
  const identityId = session.identityId;
  if (!identityId) {
    throw new Error('Não foi possível identificar sua sessão. Faça login novamente.');
  }
  return identityId;
}

export type CreateHealthImportResult = {
  importId: string;
};

/**
 * Orquestra o fluxo completo: gera o importId, sobe cada arquivo para
 * `health-imports/{identityId}/{importId}/{n}-{nome}`, cria a linha
 * `HealthImport` (status PENDING) e dispara `startHealthAnalysis`.
 */
export async function createHealthImport(files: PickedHealthFile[]): Promise<CreateHealthImportResult> {
  const validationErrors = validatePickedFiles(files);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.map((e) => e.message).join('\n'));
  }

  const identityId = await resolveIdentityId();
  const importId = uuidv4();

  const fileKeys: string[] = [];
  const fileNames: string[] = [];

  // Sequencial (não Promise.all): evita competir a banda da conexão do
  // usuário com N uploads simultâneos de arquivos que já podem chegar perto
  // do limite de 25MB/100MB.
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    if (!file) continue;

    const key = `health-imports/${identityId}/${importId}/${index}-${sanitizeFileName(file.name)}`;
    await uploadFileToS3(file.uri, () => key);
    fileKeys.push(key);
    fileNames.push(file.name);
  }

  const { errors: createErrors } = await client.models.HealthImport.create({
    id: importId,
    status: 'PENDING',
    fileKeys,
    fileNames,
  });

  if (createErrors?.length) {
    const message = createErrors.map((e) => e.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível registrar a importação.');
  }

  const { errors: startErrors } = await client.mutations.startHealthAnalysis({ importId });

  if (startErrors?.length) {
    const message = startErrors.map((e) => e.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível iniciar a análise.');
  }

  return { importId };
}

function safeJsonParse<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

type RawHealthImport = NonNullable<Awaited<ReturnType<typeof client.models.HealthImport.get>>['data']>;

function mapHealthImport(raw: RawHealthImport): HealthImport {
  return {
    id: raw.id,
    // a.enum() nunca é .required() — status pode vir null no tipo gerado;
    // tratamos como PENDING (ver amplify/data/schemas/health-import.ts).
    status: raw.status ?? 'PENDING',
    sourceHint: raw.sourceHint ?? null,
    fileNames: (raw.fileNames ?? []).filter((name): name is string => Boolean(name)),
    periodStart: raw.periodStart ?? null,
    periodEnd: raw.periodEnd ?? null,
    dayCount: raw.dayCount ?? null,
    warnings: (raw.warnings ?? []).filter((w): w is string => Boolean(w)),
    errorMessage: raw.errorMessage ?? null,
    startedAt: raw.startedAt ?? null,
    analyzedAt: raw.analyzedAt ?? null,
    modelId: raw.modelId ?? null,
    summary: safeJsonParse<AnalysisSummary>(raw.metricsJson),
    insights: safeJsonParse<Insights>(raw.insightsJson),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/** Busca uma importação pelo id — usado pelo polling (useHealthImportStatus). */
export async function getHealthImport(importId: string): Promise<HealthImport | null> {
  const { data, errors } = await client.models.HealthImport.get({ id: importId });

  if (errors?.length) {
    const message = errors.map((e) => e.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível consultar a importação.');
  }

  return data ? mapHealthImport(data) : null;
}

/**
 * Devolve a importação READY mais recente (para o dashboard) — entre as
 * concluídas, a de `updatedAt` mais alto. `list()` já é escopado pelo dono
 * (allow.owner()), sem necessidade de filtro adicional.
 */
export async function getLatestReadyHealthImport(): Promise<HealthImport | null> {
  const { data, errors } = await client.models.HealthImport.list();

  if (errors?.length) {
    const message = errors.map((e) => e.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível carregar suas importações.');
  }

  const ready = (data ?? []).filter((item) => item.status === 'READY');
  if (ready.length === 0) return null;

  ready.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return mapHealthImport(ready[0]!);
}

/** Lista todas as importações do usuário, mais recentes primeiro (histórico). */
export async function listHealthImports(): Promise<HealthImport[]> {
  const { data, errors } = await client.models.HealthImport.list();

  if (errors?.length) {
    const message = errors.map((e) => e.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível carregar suas importações.');
  }

  return (data ?? []).map(mapHealthImport).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Exclui a importação (linha no DynamoDB) — os arquivos S3 expiram sozinhos (ciclo de vida de 30 dias). */
export async function deleteHealthImport(importId: string): Promise<void> {
  const { errors } = await client.models.HealthImport.delete({ id: importId });

  if (errors?.length) {
    const message = errors.map((e) => e.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível excluir a importação.');
  }
}
