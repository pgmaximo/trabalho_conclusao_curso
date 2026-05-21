/**
 * Resumo do arquivo:
 * Serviço para gerenciar documentos médicos (exames e receitas).
 * Valida dados, formata datas, gerencia uploads para S3 e salva metadados no DynamoDB.
 * A UI chama apenas esta camada para lógica de negócios.
 */

// Descomenta quando o schema estiver pronto e o serviço for integrado ao Amplify Data:
// import { generateClient } from 'aws-amplify/data';
// import type { Schema } from '../../amplify/data/resource';
// const client = generateClient<Schema>();

import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { getUserId } from '@/services/auth';

export type DocumentType = 'exam' | 'prescription';

export interface FileMetadata {
  /** ID único gerado (UUID) */
  fileId: string;
  /** Nome do arquivo no S3 (UUID + timestamp) */
  s3FileName: string;
  /** Nome original do arquivo enviado pelo usuário */
  originalFileName: string;
  /** ID do usuário proprietário do arquivo */
  userId: string;
  /** Tipo de documento (exame ou receita) */
  documentType: DocumentType;
  /** Nome customizado para o documento (ex: "Hemograma") */
  documentName: string;
  /** Data do documento (YYYY-MM-DD) */
  documentDate: string;
  /** Data de validade para receitas (YYYY-MM-DD) */
  expirationDate?: string;
  /** Tamanho do arquivo em bytes */
  fileSize: number;
  /** Timestamp de criação */
  createdAt: string;
}

export interface CreateExamDocumentInput {
  fileName: string;
  filePath: string;
  fileSize: number;
  documentType: DocumentType;
  documentName: string;
  documentDate: string; // YYYY-MM-DD format
  expirationDate?: string; // YYYY-MM-DD format (only for prescriptions)
}

export interface ExamValidationError {
  field: string;
  message: string;
}

/**
 * Gera um nome único para o arquivo no S3 combinando UUID com timestamp
 * Garante que não há conflitos mesmo se arquivos forem enviados simultaneamente
 */
export function generateS3FileName(originalFileName: string): string {
  const fileId = uuidv4();
  const timestamp = Date.now();
  const extension = originalFileName.split('.').pop() || 'bin';
  return `exams/${fileId}-${timestamp}.${extension}`;
}

/**
 * Cria um ID único para o documento
 */
export function generateFileId(): string {
  return uuidv4();
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD
 */
export function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formata uma data de YYYY-MM-DD para DD/MM/YYYY para exibição
 */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return 'DD/MM/YYYY';
  try {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return 'DD/MM/YYYY';
  }
}

/**
 * Converte uma data de DD/MM/YYYY para YYYY-MM-DD para armazenamento
 */
export function formatDateForStorage(displayDate: string): string {
  try {
    const [day, month, year] = displayDate.split('/');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Valida os dados do documento antes de salvar
 */
export function validateExamDocument(
  input: CreateExamDocumentInput,
): ExamValidationError[] {
  const errors: ExamValidationError[] = [];

  if (!input.documentType) {
    errors.push({
      field: 'documentType',
      message: 'Por favor, selecione o tipo de documento',
    });
  }

  if (!input.documentName?.trim()) {
    errors.push({
      field: 'documentName',
      message: 'Por favor, insira um nome para o documento',
    });
  }

  if (!input.documentDate) {
    errors.push({
      field: 'documentDate',
      message: 'Por favor, selecione a data',
    });
  }

  if (input.documentType === 'prescription' && !input.expirationDate) {
    errors.push({
      field: 'expirationDate',
      message: 'Por favor, insira a data de validade para a receita',
    });
  }

  return errors;
}

/**
 * Carrega um arquivo para o S3
 * TODO: Implementar quando storage estiver configurado no Amplify backend
 */
async function uploadFileToS3(
  filePath: string,
  s3FileName: string,
): Promise<string> {
  try {
    // import { uploadData } from 'aws-amplify/storage';
    // const result = await uploadData({
    //   path: s3FileName,
    //   data: await readFileAsBlob(filePath),
    // }).result;
    // return result.path;

    // Por enquanto, apenas loga o upload (mock)
    console.log(`[Mock] Uploading file to S3: ${s3FileName}`);
    return `s3://seus-saude-exams/${s3FileName}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao fazer upload do arquivo';
    throw new Error(`Falha no upload para S3: ${message}`);
  }
}

/**
 * Cria metadados do documento para armazenar no DynamoDB
 */
async function buildDocumentMetadata(
  input: CreateExamDocumentInput,
): Promise<FileMetadata> {
  const userId = await getUserId();
  const fileId = generateFileId();
  const s3FileName = generateS3FileName(input.fileName);

  return {
    fileId,
    s3FileName,
    originalFileName: input.fileName,
    userId,
    documentType: input.documentType,
    documentName: input.documentName,
    documentDate: input.documentDate,
    expirationDate: input.documentType === 'prescription' ? input.expirationDate : undefined,
    fileSize: input.fileSize,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Salva os metadados do documento no DynamoDB
 * TODO: Implementar quando schema MedicalDocument estiver pronto
 */
async function saveDocumentMetadata(metadata: FileMetadata): Promise<FileMetadata> {
  try {
    // import { generateClient } from 'aws-amplify/data';
    // import type { Schema } from '../../amplify/data/resource';
    // const client = generateClient<Schema>();
    // const { data, errors } = await client.models.MedicalDocument.create({
    //   id: metadata.fileId,
    //   userId: metadata.userId,
    //   s3FileName: metadata.s3FileName,
    //   originalFileName: metadata.originalFileName,
    //   documentType: metadata.documentType,
    //   documentName: metadata.documentName,
    //   documentDate: metadata.documentDate,
    //   expirationDate: metadata.expirationDate || null,
    //   fileSize: metadata.fileSize,
    //   createdAt: metadata.createdAt,
    // });
    //
    // if (errors?.length) {
    //   const message = errors
    //     .map((error) => error.message)
    //     .filter(Boolean)
    //     .join('; ');
    //   throw new Error(message || 'Não foi possível salvar os metadados.');
    // }
    //
    // return metadata;

    // Por enquanto, apenas loga os metadados (mock)
    console.log('Metadados do documento:', metadata);
    return metadata;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar metadados';
    throw new Error(message);
  }
}

/**
 * Cria um novo documento de exame/receita no backend
 * Processa: validação -> upload para S3 -> salvar metadados no DynamoDB
 */
export async function createExamDocument(input: CreateExamDocumentInput) {
  // Validar dados
  const validationErrors = validateExamDocument(input);
  if (validationErrors.length > 0) {
    const message = validationErrors
      .map((error) => error.message)
      .join('\n');
    throw new Error(message);
  }

  try {
    // 1. Construir metadados do documento
    const metadata = await buildDocumentMetadata(input);
    console.log('Metadados construídos:', metadata);

    // 2. Fazer upload do arquivo para S3
    const s3Path = await uploadFileToS3(input.filePath, metadata.s3FileName);
    console.log('Arquivo enviado para S3:', s3Path);

    // 3. Salvar metadados no DynamoDB
    const savedMetadata = await saveDocumentMetadata(metadata);
    console.log('Documento salvo:', savedMetadata);

    return savedMetadata;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    throw new Error(`Erro ao criar documento: ${message}`);
  }
}
