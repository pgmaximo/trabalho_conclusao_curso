// =============================================================================
// Arquivo: appointments.ts
// Descrição: Mock data para consultas médicas e compromissos
// =============================================================================
//
// Este arquivo contém dados simulados (mock) para consultas médicas e
// compromissos do aplicativo. É usado durante o desenvolvimento e testes
// para fornecer dados realistas sem depender de uma API real.
//
// Estrutura de Dados:
// - dates: Array de dias do mês com indicação de consultas
// - appointmentsByDay: Objeto mapeando dia → array de consultas
//
// Tipos de Consultas:
// - consulta: Consulta médica regular
// - retorno: Retorno de consulta
// - exame: Exame ou procedimento
//
// Período Coberto:
// - Dias 22 a 28 de abril
// - Consultas distribuídas ao longo do período
//
// =============================================================================

// Importação do tipo para tipagem segura
import type { AppointmentsSnapshot } from '@/types/models';

// Mock data completo para consultas médicas
export const APPOINTMENTS_SNAPSHOT: AppointmentsSnapshot = {
  // Array de dias do calendário com indicação de consultas
  dates: [
    { day: 22, month: 'abr', hasAppointments: true },  // Dia 22 tem consultas
    { day: 23, month: 'abr', hasAppointments: false }, // Dia 23 sem consultas
    { day: 24, month: 'abr', hasAppointments: true },  // Dia 24 tem consultas
    { day: 25, month: 'abr', hasAppointments: true },  // Dia 25 tem consultas
    { day: 26, month: 'abr', hasAppointments: true },  // Dia 26 tem consultas
    { day: 27, month: 'abr', hasAppointments: false }, // Dia 27 sem consultas
    { day: 28, month: 'abr', hasAppointments: true },  // Dia 28 tem consultas
  ],
  
  // Objeto mapeando dia → array de consultas médicas
  appointmentsByDay: {
    // Consultas do dia 25 (exemplo detalhado)
    25: [
      {
        id: 1,                           // ID único da consulta
        time: 'Amanhã - 10h00',          // Data e hora formatada
        title: 'Cardiologia — Dr. Gomes', // Título com especialista
        location: 'Clínica IMT — Av. Principal, 100', // Local completo
        type: 'consulta',                // Tipo: consulta médica
      },
      {
        id: 2,                           // ID único da consulta
        time: '30 mar - 07h30',          // Data e hora (data diferente)
        title: 'Coleta de sangue',        // Título do procedimento
        location: 'Lab Central — Jejum obrigatório', // Local com observação
        type: 'exame',                   // Tipo: exame
      },
      {
        id: 3,                           // ID único da consulta
        time: '25 abr - 14h00',          // Data e hora
        title: 'Retorno Clínico Geral',  // Título do retorno
        location: 'UBS Central — Dra. Aparecida', // Local e médico
        type: 'retorno',                 // Tipo: retorno
      },
      {
        id: 4,                           // ID único da consulta
        time: '10 abr - 03h00',          // Data e hora (data anterior)
        title: 'Dermatologista',         // Título da especialidade
        location: 'Clínica SkinCare',     // Local da consulta
        type: 'consulta',                // Tipo: consulta médica
      },
    ],
  },
};
