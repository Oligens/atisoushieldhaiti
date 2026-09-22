import { neon } from '@neondatabase/serverless';

const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const databaseUrl = env.DATABASE_URL || env.NEON_DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json').json(body);
}

function userId(req: any): string | null {
  const value = req.headers?.['x-atisou-user-id'];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function bodyOf(req: any) {
  if (!req.body) return {};
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return req.body;
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function validCrop(value: unknown): string {
  return ['Épices', 'Tomates', 'Riz', 'Autre'].includes(String(value)) ? String(value) : 'Autre';
}

export default async function handler(req: any, res: any) {
  if (!sql) return json(res, 500, { error: 'DATABASE_URL/NEON_DATABASE_URL absent dans Vercel.' });

  try {
    const actor = userId(req);
    const body = bodyOf(req);
    const tankId = typeof req.query?.tankId === 'string' ? req.query.tankId : '';

    if (req.method === 'GET' && req.query?.resource === 'tanks') {
      if (!actor) return json(res, 401, { error: 'Utilisateur non identifié.' });
      const tanks = await sql`SELECT t.*, r.observed_at AS last_update, r.ph, r.ec, r.water_temperature AS water_temp, r.air_temperature AS air_temp, r.humidity, r.water_level, r.dissolved_oxygen FROM hydroponic_tanks t LEFT JOIN LATERAL (SELECT * FROM iot_readings WHERE tank_id=t.id ORDER BY observed_at DESC LIMIT 1) r ON TRUE WHERE t.user_id=${actor} ORDER BY t.created_at DESC`;
      return json(res, 200, tanks);
    }

    if (req.method === 'POST' && req.query?.resource === 'tanks') {
      if (!actor) return json(res, 401, { error: 'Utilisateur non identifié.' });
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) return json(res, 400, { error: 'Nom du bac requis.' });
      const id = `BAC-${crypto.randomUUID()}`;
      const location = typeof body.location === 'string' && body.location.trim() ? body.location.trim() : 'Emplacement non renseigné';
      const sensorId = typeof body.sensorId === 'string' && body.sensorId.trim() ? body.sensorId.trim() : null;
      const crop = validCrop(body.crop);
      const rows = await sql`INSERT INTO hydroponic_tanks (id,user_id,name,crop,location,sensor_id) VALUES (${id},${actor},${name},${crop},${location},${sensorId}) RETURNING *`;
      return json(res, 201, rows[0]);
    }

    if (req.method === 'DELETE' && req.query?.resource === 'tanks') {
      if (!actor) return json(res, 401, { error: 'Utilisateur non identifié.' });
      if (!tankId) return json(res, 400, { error: 'Identifiant de bac requis.' });
      const rows = await sql`DELETE FROM hydroponic_tanks WHERE id=${tankId} AND user_id=${actor} RETURNING id`;
      if (!rows.length) return json(res, 404, { error: 'Bac introuvable.' });
      return json(res, 200, { deleted: rows[0].id });
    }

    if (req.method === 'GET' && req.query?.resource === 'readings') {
      if (!actor) return json(res, 401, { error: 'Utilisateur non identifié.' });
      if (!tankId) return json(res, 400, { error: 'Identifiant de bac requis.' });
      const ownership = await sql`SELECT id FROM hydroponic_tanks WHERE id=${tankId} AND user_id=${actor}`;
      if (!ownership.length) return json(res, 404, { error: 'Bac introuvable.' });
      const limit = Math.min(Math.max(Number(req.query?.limit || 50), 1), 500);
      const rows = await sql`SELECT * FROM iot_readings WHERE tank_id=${tankId} ORDER BY observed_at DESC LIMIT ${limit}`;
      return json(res, 200, rows);
    }

    if (req.method === 'POST') {
      const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
      const submittedTankId = typeof body.tankId === 'string' ? body.tankId.trim() : '';
      const observedAt = validTimestamp(body.timestamp);
      if (!deviceId || !submittedTankId || !observedAt) return json(res, 400, { error: 'deviceId, tankId et timestamp ISO valides sont requis.' });

      const deviceToken = req.headers?.['x-atisou-device-token'];
      const configuredToken = env.ATISOU_IOT_DEVICE_TOKEN;
      if (configuredToken && deviceToken !== configuredToken) return json(res, 401, { error: 'Authentification IoT invalide.' });

      const tanks = await sql`SELECT id, sensor_id FROM hydroponic_tanks WHERE id=${submittedTankId}`;
      if (!tanks.length) return json(res, 404, { error: 'Bac IoT introuvable.' });
      if (tanks[0].sensor_id && tanks[0].sensor_id !== deviceId) return json(res, 403, { error: 'Ce dispositif n’est pas associé à ce bac.' });

      const ph = finiteNumber(body.ph);
      const ec = finiteNumber(body.ec);
      const waterTemperature = finiteNumber(body.waterTemperature);
      const airTemperature = finiteNumber(body.airTemperature);
      const humidity = finiteNumber(body.humidity);
      const waterLevel = finiteNumber(body.waterLevel);
      const dissolvedOxygen = finiteNumber(body.dissolvedOxygen);
      const payload = JSON.stringify(body);
      if (payload.length > 32_000) return json(res, 413, { error: 'Charge IoT trop volumineuse.' });

      const rows = await sql`INSERT INTO iot_readings (tank_id,device_id,observed_at,ph,ec,water_temperature,air_temperature,humidity,water_level,dissolved_oxygen,raw_payload) VALUES (${submittedTankId},${deviceId},${observedAt},${ph},${ec},${waterTemperature},${airTemperature},${humidity},${waterLevel},${dissolvedOxygen},${payload}::jsonb) RETURNING *`;
      return json(res, 201, rows[0]);
    }

    return json(res, 404, { error: 'Route IoT inconnue.' });
  } catch (error) {
    console.error('AtisouShield IoT API error', error);
    return json(res, 500, { error: error instanceof Error ? error.message : 'Erreur Neon IoT.' });
  }
}
