import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const database = DynamoDBDocumentClient.from(new DynamoDBClient({}));

type Medicine = {
  id: string;
  owner: string;
  name: string;
  dosage: string;
  times?: string[];
  frequencyType?: 'DAILY' | 'SPECIFIC_DAYS' | 'EVERY_X_HOURS';
  weekDays?: string[];
  intervalHours?: number;
  startDate: string;
  endDate?: string | null;
  active?: boolean;
};

type PushDevice = {
  id: string;
  owner: string;
  expoPushToken: string;
  timeZone: string;
  active?: boolean;
};

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function localParts(now: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(now).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  const weekdayMap: Record<string, string> = { Sun: 'SUN', Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT' };
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    weekday: weekdayMap[values.weekday] ?? WEEKDAYS[new Date(now).getUTCDay()],
  };
}

function isDue(medicine: Medicine, date: string, time: string, weekday: string): boolean {
  if (medicine.active === false || medicine.startDate > date || (medicine.endDate && medicine.endDate < date)) return false;
  if (medicine.frequencyType === 'SPECIFIC_DAYS' && !(medicine.weekDays ?? []).includes(weekday)) return false;
  // Para intervalos, a primeira hora cadastrada e a ancora. O calculo por
  // minutos em UTC e suficiente porque as datas/hora chegam ja no fuso do aparelho.
  if (medicine.frequencyType === 'EVERY_X_HOURS') {
    const anchor = medicine.times?.[0];
    if (!anchor || !medicine.intervalHours) return false;
    const localStart = new Date(`${medicine.startDate}T${anchor}:00Z`).getTime();
    const localNow = new Date(`${date}T${time}:00Z`).getTime();
    const interval = medicine.intervalHours * 60 * 60 * 1000;
    return localNow >= localStart && (localNow - localStart) % interval === 0;
  }
  return (medicine.times ?? []).includes(time);
}

async function scanAll<T>(tableName: string): Promise<T[]> {
  const items: T[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await database.send(new ScanCommand({ TableName: tableName, ExclusiveStartKey }));
    items.push(...((result.Items ?? []) as T[]));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

export const handler = async () => {
  const [medicines, devices] = await Promise.all([
    scanAll<Medicine>(process.env.MEDICINE_TABLE_NAME!),
    scanAll<PushDevice>(process.env.PUSH_DEVICE_TABLE_NAME!),
  ]);
  const now = new Date();
  let delivered = 0;

  for (const device of devices.filter((item) => item.active !== false)) {
    const local = localParts(now, device.timeZone || 'America/Sao_Paulo');
    const dueMedicines = medicines.filter((medicine) => medicine.owner === device.owner && isDue(medicine, local.date, local.time, local.weekday));
    for (const medicine of dueMedicines) {
      const id = `${medicine.id}#${device.id}#${local.date}T${local.time}`;
      try {
        await database.send(new PutCommand({
          TableName: process.env.DELIVERY_TABLE_NAME!,
          Item: {
            id,
            medicineId: medicine.id,
            deviceId: device.id,
            scheduledAt: `${local.date}T${local.time}:00.000Z`,
            owner: medicine.owner,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            __typename: 'MedicineNotificationDelivery',
          },
          ConditionExpression: 'attribute_not_exists(id)',
        }));
      } catch (error: unknown) {
        if ((error as { name?: string }).name === 'ConditionalCheckFailedException') continue;
        throw error;
      }

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          to: device.expoPushToken,
          sound: 'default',
          title: 'Hora do medicamento',
          body: `${medicine.name} · ${medicine.dosage}`,
          data: { medicineId: medicine.id },
          channelId: 'medicine-reminders',
        }),
      });
      if (!response.ok) throw new Error(`Expo Push respondeu ${response.status}`);
      delivered += 1;
    }
  }
  return { delivered };
};
