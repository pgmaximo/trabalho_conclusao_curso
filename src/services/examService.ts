/**
 * Resumo do arquivo:
 * Serviço para gerenciar documentos médicos (exames e receitas).
 * Valida dados, formata datas, gerencia uploads para S3 e salva metadados no DynamoDB.
 * A UI chama apenas esta camada para lógica de negócios.
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { uploadData, remove, getUrl } from 'aws-amplify/storage';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { getUserId } from '@/services/auth';
import { invalidateExamsCache } from '@/hooks/useExamsData';

const client = generateClient<Schema>();

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

export interface MedicalDocumentMetadata extends FileMetadata {
  /** Database ID for updates/deletes */
  id: string;
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
 * Carrega um arquivo para o S3 usando Amplify Storage
 */
async function uploadFileToS3(
  filePath: string,
  s3FileName: string,
): Promise<string> {
  try {
    let blobData: Blob;

    // Handle web vs native platforms
    if (Platform.OS === 'web') {
      // On web, filePath is a blob URI or file URI from the document picker
      // Fetch it as a blob
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      blobData = await response.blob();
    } else {
      // On native, filePath is a file system path
      // Read the file from the path as base64
      const base64Data = await readAsStringAsync(filePath, {
        encoding: EncodingType.Base64,
      });

      // Convert base64 to blob
      const response = await fetch(`data:application/octet-stream;base64,${base64Data}`);
      blobData = await response.blob();
    }

    // Upload para S3 usando Amplify Storage
    const result = await uploadData({
      path: `medical-documents/{owner}/${s3FileName}`,
      data: blobData,
    }).result;

    console.log(`Arquivo enviado para S3: ${result.path}`);
    return result.path;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao fazer upload do arquivo';
    throw new Error(`Falha no upload para S3: ${message}`);
  }
}

/**
 * Retorna URL assinada para download do documento no S3
 */
export async function getDocumentDownloadUrl(s3FileName: string): Promise<string> {
  try {
    const result = await getUrl({
      path: `medical-documents/{owner}/${s3FileName}`,
    });

    return typeof result === 'string' ? result : (result as { url: string }).url;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter o link de download';
    throw new Error(`Falha ao obter URL de download: ${message}`);
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
 * Salva os metadados do documento no DynamoDB via Amplify Data
 */
async function saveDocumentMetadata(metadata: FileMetadata): Promise<FileMetadata> {
  try {
    const { data, errors } = await client.models.MedicalDocument.create({
      documentType: metadata.documentType as Schema['MedicalDocument']['type']['documentType'],
      s3FileName: metadata.s3FileName,
      documentName: metadata.documentName,
      documentDate: metadata.documentDate,
      expirationDate: metadata.expirationDate || null,
    });

    if (errors?.length) {
      const message = errors
        .map((error) => error.message)
        .filter(Boolean)
        .join('; ');
      throw new Error(message || 'Não foi possível salvar os metadados.');
    }

    console.log('Documento salvo no banco de dados:', data);
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

    // 4. Invalidate cache so next fetch gets fresh data
    await invalidateExamsCache();

    return savedMetadata;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    throw new Error(`Erro ao criar documento: ${message}`);
  }
}

export interface UpdateExamDocumentInput {
  id: string;
  documentType?: DocumentType;
  documentName?: string;
  documentDate?: string;
  expirationDate?: string;
}

/**
 * Update an existing document metadata (does not update the S3 file itself)
 */
export async function updateExamDocument(input: UpdateExamDocumentInput) {
  try {
    const updateData: Record<string, unknown> = {};

    if (input.documentType !== undefined) {
      updateData.documentType = input.documentType;
    }
    if (input.documentName !== undefined) {
      updateData.documentName = input.documentName;
    }
    if (input.documentDate !== undefined) {
      updateData.documentDate = input.documentDate;
    }
    if (input.expirationDate !== undefined) {
      updateData.expirationDate = input.expirationDate || null;
    }

    const { data, errors } = await client.models.MedicalDocument.update({
      id: input.id,
      ...updateData,
    });

    if (errors?.length) {
      const message = errors
        .map((error) => error.message)
        .filter(Boolean)
        .join('; ');
      throw new Error(message || 'Não foi possível atualizar o documento.');
    }

    console.log('Documento atualizado:', data);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    throw new Error(`Erro ao atualizar documento: ${message}`);
  }
}

/**
 * Delete a document from S3 and DynamoDB
 */
export async function deleteExamDocument(documentId: string, s3FileName: string) {
  try {
    // 1. Delete from S3
    console.log('Deleting from S3:', s3FileName);
    await remove({
      path: `medical-documents/{owner}/${s3FileName}`,
    });
    console.log('File deleted from S3');

    // 2. Delete from DynamoDB
    console.log('Deleting from DynamoDB:', documentId);
    const { data, errors } = await client.models.MedicalDocument.delete({
      id: documentId,
    });

    if (errors?.length) {
      const message = errors
        .map((error) => error.message)
        .filter(Boolean)
        .join('; ');
      throw new Error(message || 'Não foi possível deletar o documento.');
    }

    console.log('Documento deletado:', data);
    
    // 3. Invalidate cache so list updates
    await invalidateExamsCache();
    
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    throw new Error(`Erro ao deletar documento: ${message}`);
  }
}
