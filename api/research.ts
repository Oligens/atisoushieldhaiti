import { neon } from '@neondatabase/serverless';

const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const databaseUrl = env.DATABASE_URL || env.NEON_DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json').json(body);
}

function userId(req: any) {
  const value = req.headers?.['x-atisou-user-id'];
  return typeof value === 'string' && value.trim() ? value.trim() : 'anonymous';
}

function buildMetrics(rows: any[]) {
  const confirmed = rows.filter((r) => r.validation_label === 'confirmed').length;
  const rejected = rows.filter((r) => r.validation_label === 'rejected').length;
  const uncertain = rows.filter((r) => r.validation_label === 'uncertain').length;
  const evaluated = rows.filter((r) =>
    typeof r.actual_disease === 'string' && r.actual_disease.trim().length > 0 &&
    (r.validation_label === 'confirmed' || r.validation_label === 'rejected')
  );
  const labels = [...new Set(evaluated.flatMap((r) => [String(r.predicted_disease), String(r.actual_disease)]))];
  const confusionMatrix = labels.flatMap((actual) => labels.map((predicted) => ({
    actual, predicted,
    count: evaluated.filter((r) => String(r.actual_disease) === actual && String(r.predicted_disease) === predicted).length,
  }))).filter((cell) => cell.count > 0);
  const accuracy = evaluated.length
    ? evaluated.filter((r) => String(r.actual_disease) === String(r.predicted_disease)).length / evaluated.length : 0;
  const scores = labels.map((label) => {
    const tp = evaluated.filter((r) => String(r.actual_disease) === label && String(r.predicted_disease) === label).length;
    const fp = evaluated.filter((r) => String(r.actual_disease) !== label && String(r.predicted_disease) === label).length;
    const fn = evaluated.filter((r) => String(r.actual_disease) === label && String(r.predicted_disease) !== label).length;
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    return { precision, recall, f1: precision + recall ? 2 * precision * recall / (precision + recall) : 0 };
  });
  const average = (key: 'precision' | 'recall' | 'f1') =>
    scores.length ? scores.reduce((sum, score) => sum + score[key], 0) / scores.length : 0;
  return {
    confirmed, rejected, uncertain,
    confirmationRate: confirmed + rejected ? Math.round(confirmed / (confirmed + rejected) * 100) : 0,
    evaluatedCases: evaluated.length, confusionMatrix, accuracy,
    precision: average('precision'), recall: average('recall'), f1: average('f1'),
  };
}

export default async function handler(req: any, res: any) {
  if (!sql) return json(res, 500, { error: 'DATABASE_URL/NEON_DATABASE_URL absent dans Vercel.' });
  const path = typeof req.query?.path === 'string' ? req.query.path : '';
  const actor = userId(req);
  try {
    if (req.method === 'GET' && path === 'stats') {
      const [caseRows, observationRows, interactionRows, fieldRows, verifiedRows] = await Promise.all([
        sql`SELECT crop, location, predicted_disease, confidence FROM agricultural_cases
            WHERE user_id = ${actor} OR ${actor} = 'anonymous' ORDER BY created_at DESC`,
        sql`SELECT id FROM weather_observations WHERE user_id = ${actor} OR ${actor} = 'anonymous'`,
        sql`SELECT id FROM research_ai_interactions WHERE user_id = ${actor} OR ${actor} = 'anonymous'`,
        sql`SELECT id, professional_verified FROM field_research_records
            WHERE user_id = ${actor} OR ${actor} = 'anonymous'`,
        sql`SELECT DISTINCT ON (fr.case_id)
              fr.validation_status AS validation_label,
              fr.reference_diagnosis AS actual_disease,
              c.predicted_disease, c.confidence
            FROM field_research_records fr
            JOIN agricultural_cases c ON c.id = fr.case_id
            WHERE fr.professional_verified = true
              AND (fr.user_id = ${actor} OR ${actor} = 'anonymous')
            ORDER BY fr.case_id, fr.verified_at DESC NULLS LAST, fr.created_at DESC`,
      ]);
      const rows = caseRows as any[];
      const metrics = buildMetrics(verifiedRows as any[]);
      const count = (key: string) => {
        const values = new Map<string, number>();
        rows.forEach((row) => {
          const value = String(row[key] || 'Non renseigné');
          values.set(value, (values.get(value) || 0) + 1);
        });
        return [...values.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
          .map(([label, value]) => ({ label, value }));
      };
      return json(res, 200, {
        totalCases: rows.length,
        confirmed: metrics.confirmed, rejected: metrics.rejected, uncertain: metrics.uncertain,
        confirmationRate: metrics.confirmationRate,
        averageConfidence: rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.confidence || 0), 0) / rows.length) : 0,
        weatherObservations: observationRows.length,
        aiInteractions: interactionRows.length,
        fieldRecords: fieldRows.length,
        verifiedFieldRecords: (fieldRows as any[]).filter((row) => row.professional_verified).length,
        byCrop: count('crop'), byDisease: count('predicted_disease'), byLocation: count('location'),
        metrics: {
          accuracy: metrics.accuracy, precision: metrics.precision, recall: metrics.recall,
          f1: metrics.f1, evaluatedCases: metrics.evaluatedCases, confusionMatrix: metrics.confusionMatrix,
        },
      });
    }

    if (req.method === 'GET' && path === 'observations') {
      const rows = await sql`SELECT id, observed_at, latitude, longitude, temperature, humidity, wind_speed, rainfall, weather
        FROM weather_observations WHERE user_id = ${actor} OR ${actor} = 'anonymous'
        ORDER BY observed_at DESC LIMIT 50`;
      return json(res, 200, rows);
    }

    if (req.method === 'GET' && path === 'field-records') {
      const rows = await sql`SELECT fr.*, c.crop AS case_crop, c.location AS case_location,
          c.predicted_disease, c.confidence
        FROM field_research_records fr JOIN agricultural_cases c ON c.id = fr.case_id
        WHERE fr.user_id = ${actor} OR ${actor} = 'anonymous'
        ORDER BY fr.created_at DESC LIMIT 100`;
      return json(res, 200, rows);
    }

    if (req.method === 'GET' && path === 'ai-interactions') {
      const rows = await sql`SELECT id, question, answer, crop, location, created_at
        FROM research_ai_interactions WHERE user_id = ${actor} OR ${actor} = 'anonymous'
        ORDER BY created_at DESC LIMIT 100`;
      return json(res, 200, rows);
    }

    if (req.method === 'GET' && path === 'risk-map') {
      const [caseRows, observationRows] = await Promise.all([
        sql`SELECT location, latitude, longitude, confidence, validation_label FROM agricultural_cases
            WHERE user_id = ${actor} OR ${actor} = 'anonymous' ORDER BY created_at DESC`,
        sql`SELECT latitude, longitude, observed_at FROM weather_observations
            WHERE user_id = ${actor} OR ${actor} = 'anonymous' ORDER BY observed_at DESC`,
      ]);
      const grouped = new Map<string, any>();
      for (const row of caseRows as any[]) {
        const key = row.location || 'Lieu non renseigné';
        const point = grouped.get(key) || { location: key, cases: 0, observations: 0, confirmed: 0, avgConfidence: 0, latitude: row.latitude ?? null, longitude: row.longitude ?? null };
        point.cases += 1; point.avgConfidence += Number(row.confidence || 0);
        if (row.latitude != null) point.latitude = row.latitude;
        if (row.longitude != null) point.longitude = row.longitude;
        grouped.set(key, point);
      }
      for (const row of observationRows as any[]) {
        if (row.latitude == null || row.longitude == null) continue;
        const latitude = Number(row.latitude), longitude = Number(row.longitude);
        const key = 'Observation météo · ' + latitude.toFixed(2) + ', ' + longitude.toFixed(2);
        const point = grouped.get(key) || { location: key, cases: 0, observations: 0, confirmed: 0, avgConfidence: 0, latitude, longitude };
        point.observations += 1; grouped.set(key, point);
      }
      return json(res, 200, [...grouped.values()].map((point) => ({
        ...point, avgConfidence: point.cases ? Math.round(point.avgConfidence / point.cases) : 0,
      })).sort((a, b) => (b.cases + b.observations) - (a.cases + a.observations)));
    }

    if (req.method === 'GET' && path === 'export') {
      const [cases, weatherObservations, fieldRecords, aiInteractions] = await Promise.all([
        sql`SELECT * FROM agricultural_cases WHERE user_id = ${actor} OR ${actor} = 'anonymous' ORDER BY created_at DESC`,
        sql`SELECT * FROM weather_observations WHERE user_id = ${actor} OR ${actor} = 'anonymous' ORDER BY observed_at DESC`,
        sql`SELECT * FROM field_research_records WHERE user_id = ${actor} OR ${actor} = 'anonymous' ORDER BY created_at DESC`,
        sql`SELECT * FROM research_ai_interactions WHERE user_id = ${actor} OR ${actor} = 'anonymous' ORDER BY created_at DESC`,
      ]);
      return json(res, 200, {
        generated_at: new Date().toISOString(),
        cases, weather_observations: weatherObservations, field_records: fieldRecords, ai_interactions: aiInteractions,
        totals: { cases: cases.length, weather_observations: weatherObservations.length, field_records: fieldRecords.length, ai_interactions: aiInteractions.length },
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    if (req.method === 'POST' && path === 'ai-interactions') {
      if (!String(body.question || '').trim() || !String(body.answer || '').trim())
        return json(res, 400, { error: 'La question et la réponse sont obligatoires.' });
      const rows = await sql`INSERT INTO research_ai_interactions (user_id, question, answer, crop, location)
        VALUES (${actor}, ${String(body.question).slice(0, 12000)}, ${String(body.answer).slice(0, 30000)},
          ${body.crop || null}, ${body.location || null}) RETURNING id, created_at`;
      return json(res, 201, rows[0]);
    }

    if (req.method === 'POST' && path === 'field-records') {
      const required = ['case_id', 'professional_name', 'professional_qualification', 'symptoms', 'severity', 'reference_diagnosis', 'validation_status'];
      const missing = required.filter((key) => !String(body[key] ?? '').trim());
      if (missing.length) return json(res, 400, { error: 'Champs obligatoires manquants : ' + missing.join(', ') });
      if (!['low','moderate','high','critical'].includes(body.severity))
        return json(res, 400, { error: 'Niveau de gravité invalide.' });
      if (!['confirmed','rejected','uncertain'].includes(body.validation_status))
        return json(res, 400, { error: 'Statut de validation invalide.' });
      const caseRows = await sql`SELECT id FROM agricultural_cases WHERE id = ${body.case_id}
        AND (user_id = ${actor} OR ${actor} = 'anonymous') LIMIT 1`;
      if (!caseRows.length) return json(res, 404, { error: 'Cas agricole introuvable pour ce compte.' });
      const rows = await sql`INSERT INTO field_research_records (
          case_id, user_id, professional_name, professional_qualification, institution, registration_number,
          visited_at, crop, crop_variety, growth_stage, symptoms, observed_plant_parts, severity,
          reference_diagnosis, validation_status, treatment_applied, treatment_start_date,
          followup_date, followup_outcome, field_notes, latitude, longitude
        ) VALUES (
          ${body.case_id}, ${actor}, ${body.professional_name}, ${body.professional_qualification},
          ${body.institution || null}, ${body.registration_number || null}, ${body.visited_at || new Date().toISOString().slice(0,10)},
          ${body.crop || null}, ${body.crop_variety || null}, ${body.growth_stage || null}, ${body.symptoms},
          ${Array.isArray(body.observed_plant_parts) ? body.observed_plant_parts : []}, ${body.severity},
          ${body.reference_diagnosis}, ${body.validation_status}, ${body.treatment_applied || null},
          ${body.treatment_start_date || null}, ${body.followup_date || null}, ${body.followup_outcome || null},
          ${body.field_notes || null}, ${body.latitude ?? null}, ${body.longitude ?? null}
        ) RETURNING *`;
      // La fiche est "en attente" : elle ne modifie pas les métriques scientifiques avant vérification.
      return json(res, 201, { ...rows[0], verification_state: 'pending' });
    }

    if (req.method === 'POST' && path === 'cases') {
      if (!body.predicted_disease) return json(res, 400, { error: 'Le diagnostic prédit est obligatoire.' });
      const r = await sql`INSERT INTO agricultural_cases
        (user_id,crop,location,latitude,longitude,predicted_disease,confidence,validation_label,actual_disease,field_outcome,weather,image_reference)
        VALUES (${actor},${body.crop || 'Non renseigné'},${body.location || 'Non renseigné'},${body.latitude ?? null},${body.longitude ?? null},
          ${body.predicted_disease},${Number(body.confidence || 0)},NULL,NULL,${body.field_outcome ?? null},${body.weather ?? null},${body.image_reference ?? null})
        RETURNING *`;
      return json(res, 201, r[0]);
    }

    if (req.method === 'PATCH' && path === 'cases-weather') {
      if (!body.id) return json(res, 400, { error: 'Identifiant de cas requis.' });
      const r = await sql`UPDATE agricultural_cases SET weather=${body.weather ?? null}
        WHERE id=${body.id} AND (user_id=${actor} OR ${actor}='anonymous') RETURNING *`;
      if (!r.length) return json(res, 404, { error: 'Cas introuvable.' });
      return json(res, 200, r[0]);
    }

    if (req.method === 'POST' && path === 'weather-observations') {
      const r = await sql`INSERT INTO weather_observations
        (user_id,observed_at,latitude,longitude,temperature,humidity,wind_speed,rainfall,weather)
        VALUES (${actor},${body.observed_at ?? new Date().toISOString()},${body.latitude},${body.longitude},
          ${body.temperature},${body.humidity},${body.wind_speed},${body.rainfall ?? body.rainfall_mm ?? 0},${body.weather ?? null})
        RETURNING *`;
      return json(res, 201, r[0]);
    }

    return json(res, 404, { error: 'Route de recherche inconnue.' });
  } catch (error) {
    console.error('Neon research API error', error);
    return json(res, 500, { error: error instanceof Error ? error.message : 'Erreur Neon.' });
  }
}
