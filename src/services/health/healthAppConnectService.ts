export type HealthConnectStatus = 'unavailable';

/**
 * Nenhum pacote de integração de saúde (HealthKit/Health Connect/Google Fit) está
 * instalado no projeto hoje. Este serviço isola essa pendência atrás de um nome
 * explícito em vez de simular uma conexão bem-sucedida (constituição §2).
 */
export function getHealthConnectStatus(): HealthConnectStatus {
  return 'unavailable';
}
