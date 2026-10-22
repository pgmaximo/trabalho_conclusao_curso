// Semeia as duas contas de teste: A (E1-E8, E10-E12) e B (E9).
import { CREDS, login, create, list, remove } from './lib.mjs';

const MODELOS = ['Medicine', 'MedicineDoseLog', 'Appointment', 'VaccineDose', 'MedicalDocument', 'LabResult', 'PrescriptionItem', 'UserProfile'];

async function limpar(tk) {
  for (const m of MODELOS) for (const { id } of await list(tk, m)) await remove(tk, m, id);
}

async function contaA() {
  const tk = await login(CREDS.A.email, CREDS.A.password);
  await limpar(tk);
  await create(tk, 'UserProfile', { fullName: 'Teste SDD', birthDate: '1972-05-10', sex: 'Feminino', weightKg: 70, heightCm: 165, isSmoker: false });

  const med = (i) => create(tk, 'Medicine', { form: 'PILL', startDate: '2026-09-01', active: true, ...i });
  const losartana = await med({ name: 'Losartana', dosage: '50 mg', unit: 'COMP', frequencyType: 'EVERY_X_HOURS', intervalHours: 8, times: ['08:00'], currentStock: 20, initialStock: 30, lowStockThreshold: 10 });
  await med({ name: 'Metformina', dosage: '500 mg', unit: 'COMP', frequencyType: 'DAILY', times: ['08:00', '20:00'], currentStock: 5, initialStock: 60, lowStockThreshold: 10 });
  await med({ name: 'Omeprazol', dosage: '20 mg', unit: 'CAPS', frequencyType: 'SPECIFIC_DAYS', weekDays: ['MON', 'WED', 'FRI'], times: ['07:00'], currentStock: 14, initialStock: 28, lowStockThreshold: 5, notes: 'tomar em jejum, 30 min antes do café' });
  await med({ name: 'Vitamina D', dosage: '1 gota', frequencyType: 'DAILY', times: ['12:00'], currentStock: 1, initialStock: 1 });

  // E3: doses marcadas (manha de hoje e alguns dias da semana; faltam outras de proposito)
  const dose = (data, hora) => create(tk, 'MedicineDoseLog', { id: `${losartana}#${data}#${hora}`, medicineId: losartana, scheduledDate: data, scheduledTime: hora, takenAt: `${data}T${hora}:05.000-03:00`, stockAdjusted: false });
  for (const d of ['2026-10-14', '2026-10-15', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']) await dose(d, '08:00');
  await dose('2026-10-19', '16:00');

  // E1/E5: agenda (hoje e 2026-10-20, terca)
  const ag = (i) => create(tk, 'Appointment', { appointmentType: 'CONSULTA', ...i });
  await ag({ appointmentName: 'Cardiologista', professionalName: 'Dra. Ana', scheduledAt: '2026-10-21T14:00:00.000-03:00', address: 'Rua das Flores, 100', observations: 'levar os exames de sangue' });
  await ag({ appointmentName: 'Exame de sangue', appointmentType: 'EXAME', scheduledAt: '2026-10-23T07:30:00.000-03:00', observations: 'jejum de 12 horas, levar pedido médico' });
  await ag({ appointmentName: 'Ortopedista', professionalName: 'Dr. Paulo', scheduledAt: '2026-10-15T15:00:00.000-03:00', observations: 'pediu ressonância do joelho e fisioterapia' });
  await ag({ appointmentName: 'Dermatologista', scheduledAt: '2026-11-12T10:00:00.000-03:00' });
  await ag({ appointmentName: 'Clínico geral', scheduledAt: '2026-09-10T10:00:00.000-03:00' });

  const vac = (i) => create(tk, 'VaccineDose', { isCampaign: false, ...i });
  await vac({ name: 'Influenza (gripe)', appliedDate: '2026-04-15', location: 'UBS Centro', isCampaign: true, lot: 'FLU2026-AB12', manufacturer: 'Butantan', notes: 'braço esquerdo dolorido por 2 dias' });
  await vac({ name: 'Hepatite B', doseNumber: 2, seriesTotal: 3, appliedDate: '2026-03-02', location: 'UBS Centro' });
  await vac({ name: 'Dupla adulto (dT)', appliedDate: '2019-06-01', recommendedIntervalYears: 10 });
  await vac({ name: 'Febre amarela', dueDate: '2026-12-01' });

  // E1/E10: exame de sangue com colesterol, dentro do periodo do wearable (2026-08-01 a 2026-10-12)
  const doc = (i) => create(tk, 'MedicalDocument', { s3FileName: `teste-${Math.random().toString(36).slice(2)}.pdf`, ...i });
  const sangue = await doc({ documentType: 'exam', documentName: 'Exame de sangue', laboratorio: 'Lab Teste', documentDate: '2026-09-25', extractionStatus: 'SUCCEEDED', extractedAt: '2026-09-25T15:00:00.000Z' });
  const lab = (i) => create(tk, 'LabResult', { documentId: sangue, collectedAt: '2026-09-25', reviewStatus: 'AUTO', confidence: 0.95, ...i });
  await lab({ analyteCode: '2093-3', analyteLabel: 'Cholesterol [Mass/volume] in Serum or Plasma', projectLabel: 'Colesterol total', value: 232, unit: 'mg/dL', rawValue: '232', rawUnit: 'mg/dL', referenceHigh: 190, rawReferenceText: 'Desejável: < 190 mg/dL' });
  await lab({ analyteCode: '13457-7', analyteLabel: 'Cholesterol in LDL [Mass/volume] in Serum or Plasma by calculation', projectLabel: 'Colesterol LDL', value: 151, unit: 'mg/dL', rawValue: '151', rawUnit: 'mg/dL', referenceHigh: 130 });
  await lab({ analyteCode: '2345-7', analyteLabel: 'Glucose [Mass/volume] in Serum or Plasma', projectLabel: 'Glicose', value: 98, unit: 'mg/dL', rawValue: '98', rawUnit: 'mg/dL', referenceLow: 70, referenceHigh: 99 });

  // E4: receita lida (AAS 100 e Paracetamol com posologia), exame em leitura, exame descritivo
  const receita = await doc({ documentType: 'prescription', documentName: 'Receita clínico', documentDate: '2026-10-10', expirationDate: '2026-11-10', extractionStatus: 'SUCCEEDED', extractedAt: '2026-10-10T13:00:00.000Z' });
  await create(tk, 'PrescriptionItem', { documentId: receita, medicationLabel: 'AAS 100', dose: '100', unit: 'mg', frequency: '1x ao dia', rawText: 'AAS 100 mg 1 cp ao dia', confidence: 0.9, reviewStatus: 'AUTO' });
  await create(tk, 'PrescriptionItem', { documentId: receita, medicationLabel: 'Paracetamol 750', dose: '750', unit: 'mg', frequency: '8/8h', rawText: 'Paracetamol 750 1cp 8/8h', confidence: 0.9, reviewStatus: 'AUTO' });
  await doc({ documentType: 'exam', documentName: 'Raio-X de tórax', documentDate: '2026-10-05', extractionStatus: 'NO_RESULTS', extractedAt: '2026-10-05T12:00:00.000Z' });
  await doc({ documentType: 'exam', documentName: 'Hemograma', documentDate: '2026-10-20', extractionStatus: 'PROCESSING', extractionStartedAt: new Date().toISOString() });
  console.log('conta A ok');
}

async function contaB() {
  const tk = await login(CREDS.B.email, CREDS.B.password);
  await limpar(tk);
  await create(tk, 'UserProfile', { fullName: 'Teste SDD B', birthDate: '1960-02-02', sex: 'Masculino', weightKg: 82, heightCm: 175 });
  const med = (i) => create(tk, 'Medicine', { form: 'PILL', unit: 'COMP', frequencyType: 'DAILY', times: ['08:00'], startDate: '2026-08-01', currentStock: 30, initialStock: 30, active: true, ...i });
  await med({ name: 'Marevan 5mg', dosage: '5 mg' });
  await med({ name: 'Losartana', dosage: '50 mg' });
  await med({ name: 'Metformina', dosage: '500 mg', startDate: '2026-01-01', endDate: '2026-06-30', active: false });
  console.log('conta B ok');
}

await contaA();
await contaB();
