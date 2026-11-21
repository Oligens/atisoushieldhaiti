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

function isVisibleToActor(row: any, actor: string) {
  return actor === 'anonymous' || String(row.user_id) === actor;
}

function buildMetrics(rows: any[]) {
  const confirmed = rows.filter((r) => r.validation_label === 'confirmed').length;
  const rejected = rows.filter((r) => r.validation_label === 'rejected').length;
  const uncertain = rows.filter((r) => r.validation_label === 'uncertain').length;
  // Une référence terrain est obligatoire : un simple clic Oui/Non sans nom de maladie
  // ne suffit pas pour mesurer les performances du modèle.
  const evaluated = rows.filter((r) =>
    typeof r.actual_disease === 'string' &&
    r.actual_disease.trim().length > 0 &&
    (r.validation_label === 'confirmed' || r.validation_label === 'rejected')
  );
  const labels = [...new Set(evaluated.flatMap((r) => [String(r.predicted_disease), String(r.actual_disease)]))];
  const confusionMatrix = labels.flatMap((actual) =>
    labels.map((predicted) => ({
      actual,
      predicted,
      count: evaluated.filter((r) =>
        String(r.actual_disease) === actual && String(r.predicted_disease) === predicted
      ).length,
    }))
  ).filter((cell) => cell.count > 0);
  const accuracy = evaluated.length
    ? evaluated.filter((r) => String(r.actual_disease) === String(r.predicted_disease)).length / evaluated.length
    : 0;
  const scores = labels.map((label) => {
    const tp = evaluated.filter((r) => String(r.actual_disease) === label && String(r.predicted_disease) === label).length;
    const fp = evaluated.filter((r) => String(r.actual_disease) !== label && String(r.predicted_disease) === label).length;
    const fn = evaluated.filter((r) => String(r.actual_disease) === label && String(r.predicted_disease) !== label).length;
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
    return { precision, recall, f1 };
  });
  const average = (key: 'precision' | 'recall' | 'f1') =>
    scores.length ? scores.reduce((sum, score) => sum + score[key], 0) / scores.length : 0;
  return {
    confirmed,
    rejected,
    uncertain,
    confirmationRate: confirmed + rejected ? Math.round(confirmed / (confirmed + rejected) * 100) : 0,
    evaluatedCases: evaluated.length,
    confusionMatrix,
    accuracy,
    precision: average('precision'),
    recall: average('recall'),
    f1: average('f1'),
  };
}

export default async function handler(req: any, res: any) {
  if (!sql) return json(res, 500, { error: 'DATABASE_URL/NEON_DATABASE_URL absent dans Vercel.' });
  const path = typeof req.query?.path === 'string' ? req.query.path : '';
  const actor = userId(req);
  try {
    if (req.method === 'GET' && path === 'stats') {
      const [caseRows, observationRows, surveyRows, eventRows] = await Promise.all([
        sql`SELECT crop, location, predicted_disease, confidence, validation_label, actual_disease
            FROM agricultural_cases
            WHERE user_id = ${actor} OR ${actor} = 'anonymous'
            ORDER BY created_at DESC`,
        sql`SELECT user_id FROM weather_observations
            WHERE user_id = ${actor} OR ${actor} = 'anonymous'`,
        sql`SELECT id FROM agricultural_field_surveys
            WHERE user_id = ${actor} OR ${actor} = 'anonymous'`,
        sql`SELECT id, event_type FROM agricultural_research_events
            WHERE user_id = ${actor} OR ${actor} = 'anonymous'`,
      ]);
      const rows = caseRows as any[];
      const metrics = buildMetrics(rows);
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
        confirmed: metrics.confirmed,
        rejected: metrics.rejected,
        uncertain: metrics.uncertain,
        confirmationRate: metrics.confirmationRate,
        averageConfidence: rows.length
          ? Math.round(rows.reduce((sum, row) => sum + Number(row.confidence || 0), 0) / rows.length)
          : 0,
        weatherObservations: observationRows.length,
        fieldSurveys: surveyRows.length,
        aiConsultations: (eventRows as any[]).filter((row: any) => row.event_type === 'ai_consultation').length,
        researchEvents: eventRows.length,
        byCrop: count('crop'),
        byDisease: count('predicted_disease'),
        byLocation: count('location'),
        metrics: {
          accuracy: metrics.accuracy,
          precision: metrics.precision,
          recall: metrics.recall,
          f1: metrics.f1,
          evaluatedCases: metrics.evaluatedCases,
          confusionMatrix: metrics.confusionMatrix,
        },
      });
    }

    if (req.method === 'GET' && path === 'cases') {
      const rows = await sql`SELECT id, created_at, crop, location, latitude, longitude, predicted_disease, confidence, validation_label, actual_disease
        FROM agricultural_cases
        WHERE user_id = ${actor} OR ${actor} = 'anonymous'
        ORDER BY created_at DESC LIMIT 250`;
      return json(res, 200, rows);
    }

    if (req.method === 'GET' && path === 'field-surveys') {
      const rows = await sql`SELECT * FROM agricultural_field_surveys
        WHERE user_id = ${actor} OR ${actor} = 'anonymous'
        ORDER BY visit_date DESC LIMIT 250`;
      return json(res, 200, rows);
    }

    if (req.method === 'GET' && path === 'events') {
      const rows = await sql`SELECT id, source, event_type, prompt, ai_response, crop, location, latitude, longitude, weather, metadata, created_at
        FROM agricultural_research_events
        WHERE user_id = ${actor} OR ${actor} = 'anonymous'
        ORDER BY created_at DESC LIMIT 250`;
      return json(res, 200, rows);
    }

    if (req.method === 'GET' && path === 'observations') {
      const rows = await sql`SELECT id, observed_at, latitude, longitude, temperature, humidity, wind_speed, rainfall, weather
        FROM weather_observations
        WHERE user_id = ${actor} OR ${actor} = 'anonymous'
        ORDER BY observed_at DESC LIMIT 50`;
      return json(res, 200, rows);
    }

    if (req.method === 'GET' && path === 'risk-map') {
      const [caseRows, observationRows] = await Promise.all([
        sql`SELECT location, latitude, longitude, confidence, validation_label
            FROM agricultural_cases
            WHERE user_id = ${actor} OR ${actor} = 'anonymous'
            ORDER BY created_at DESC`,
        sql`SELECT latitude, longitude, observed_at, weather
            FROM weather_observations
            WHERE user_id = ${actor} OR ${actor} = 'anonymous'
            ORDER BY observed_at DESC`,
      ]);
      const grouped = new Map<string, any>();
      for (const row of caseRows as any[]) {
        const key = row.location || 'Lieu non renseigné';
        const point = grouped.get(key) || {
          location: key, cases: 0, observations: 0, confirmed: 0,
          avgConfidence: 0, latitude: row.latitude ?? null, longitude: row.longitude ?? null,
        };
        point.cases += 1;
        point.confirmed += row.validation_label === 'confirmed' ? 1 : 0;
        point.avgConfidence += Number(row.confidence || 0);
        if (row.latitude != null) point.latitude = row.latitude;
        if (row.longitude != null) point.longitude = row.longitude;
        grouped.set(key, point);
      }
      for (const row of observationRows as any[]) {
        if (row.latitude == null || row.longitude == null) continue;
        const latitude = Number(row.latitude);
        const longitude = Number(row.longitude);
        // Regroupement spatial à environ 1 km, sans prétendre représenter une commune.
        const metadata = row.weather && typeof row.weather === 'object' ? row.weather : {};
        const placeLabel = [metadata.commune, metadata.department, metadata.country].filter(Boolean).join(', ');
        const key = placeLabel || ('Observation météo · ' + latitude.toFixed(2) + ', ' + longitude.toFixed(2));
        const point = grouped.get(key) || {
          location: key, cases: 0, observations: 0, confirmed: 0,
          avgConfidence: 0, latitude, longitude,
        };
        point.observations += 1;
        grouped.set(key, point);
      }
      return json(res, 200, [...grouped.values()].map((point) => ({
        ...point,
        avgConfidence: point.cases ? Math.round(point.avgConfidence / point.cases) : 0,
      })).sort((a, b) => (b.cases + b.observations) - (a.cases + a.observations)));
    }

    if (req.method === 'GET' && path === 'export') {
      const [cases, weatherObservations, fieldSurveys, researchEvents] = await Promise.all([
        sql`SELECT * FROM agricultural_cases
            WHERE user_id = ${actor} OR ${actor} = 'anonymous'
            ORDER BY created_at DESC`,
        sql`SELECT * FROM weather_observations
            WHERE user_id = ${actor} OR ${actor} = 'anonymous'
            ORDER BY observed_at DESC`,
        sql`SELECT * FROM agricultural_field_surveys
            WHERE user_id = ${actor} OR ${actor} = 'anonymous'
            ORDER BY visit_date DESC`,
        sql`SELECT * FROM agricultural_research_events
            WHERE user_id = ${actor} OR ${actor} = 'anonymous'
            ORDER BY created_at DESC`,
      ]);
      return json(res, 200, {
        generated_at: new Date().toISOString(),
        cases,
        weather_observations: weatherObservations,
        field_surveys: fieldSurveys,
        research_events: researchEvents,
        totals: { cases: cases.length, weather_observations: weatherObservations.length, field_surveys: fieldSurveys.length, research_events: researchEvents.length },
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (req.method === 'POST' && path === 'events') {
      if (!['ai_assistant', 'location_analysis', 'plant_scan'].includes(body.source) || !body.event_type) {
        return json(res, 400, { error: 'Source et type d’événement requis.' });
      }
      const r = await sql`INSERT INTO agricultural_research_events
        (user_id,source,event_type,prompt,ai_response,crop,location,latitude,longitude,weather,metadata)
        VALUES (${actor},${body.source},${body.event_type},${body.prompt ?? null},${body.ai_response ?? null},
          ${body.crop ?? null},${body.location ?? null},${body.latitude ?? null},${body.longitude ?? null},
          ${body.weather ?? null},${body.metadata ?? {}})
        RETURNING *`;
      return json(res, 201, r[0]);
    }

    if (req.method === 'POST' && path === 'field-surveys') {
      const required = ['crop', 'observer_name', 'observer_role', 'visit_date', 'location', 'assessment'];
      const missing = required.filter((key) => !String(body[key] ?? '').trim());
      if (missing.length) return json(res, 400, { error: 'Champs obligatoires manquants : ' + missing.join(', ') });
      if (!['confirmed', 'rejected', 'uncertain', 'observation_only'].includes(body.assessment)) {
        return json(res, 400, { error: 'Statut de validation terrain invalide.' });
      }
      if (['confirmed', 'rejected'].includes(body.assessment) && !String(body.field_diagnosis ?? '').trim()) {
        return json(res, 400, { error: 'Le diagnostic de référence est obligatoire pour confirmer ou rejeter un diagnostic IA.' });
      }
      const r = await sql`INSERT INTO agricultural_field_surveys
        (user_id,linked_case_id,crop,symptoms,field_diagnosis,assessment,observer_name,observer_role,observer_organization,
         visit_date,location,latitude,longitude,treatment_applied,treatment_date,follow_up_date,follow_up_result,expert_notes)
        VALUES (${actor},${body.linked_case_id || null},${body.crop},${Array.isArray(body.symptoms) ? body.symptoms : []},
         ${body.field_diagnosis?.trim() || null},${body.assessment},${body.observer_name},${body.observer_role},
         ${body.observer_organization || null},${body.visit_date},${body.location},${body.latitude ?? null},${body.longitude ?? null},
         ${body.treatment_applied || null},${body.treatment_date || null},${body.follow_up_date || null},
         ${body.follow_up_result || null},${body.expert_notes || null})
        RETURNING *`;
      if (body.linked_case_id) {
        await sql`UPDATE agricultural_cases
          SET validation_label=${body.assessment === 'observation_only' ? null : body.assessment},
              actual_disease=${body.field_diagnosis?.trim() || null},
              field_outcome=${body.follow_up_result || body.treatment_applied || null},
              updated_at=now()
          WHERE id=${body.linked_case_id} AND (user_id=${actor} OR ${actor}='anonymous')`;
      }
      return json(res, 201, r[0]);
    }

    if (req.method === 'POST' && path === 'cases') {
      if (!body.predicted_disease) return json(res, 400, { error: 'Le diagnostic prédit est obligatoire.' });
      const r = await sql`INSERT INTO agricultural_cases
        (user_id,crop,location,latitude,longitude,predicted_disease,confidence,validation_label,actual_disease,field_outcome,weather,image_reference)
        VALUES (${actor},${body.crop || 'Non renseigné'},${body.location || 'Non renseigné'},${body.latitude ?? null},${body.longitude ?? null},
          ${body.predicted_disease},${Number(body.confidence || 0)},${body.validation_label ?? null},
          ${body.actual_disease?.trim() || null},${body.field_outcome ?? null},${body.weather ?? null},${body.image_reference ?? null})
        RETURNING *`;
      return json(res, 201, r[0]);
    }
    if (req.method === 'PATCH' && path === 'cases') {
      if (!body.id) return json(res, 400, { error: 'Identifiant de cas requis.' });
      const r = await sql`UPDATE agricultural_cases
        SET validation_label=${body.validation_label ?? null}, actual_disease=${body.actual_disease?.trim() || null},
            field_outcome=${body.field_outcome ?? null}, weather=COALESCE(${body.weather ?? null},weather)
        WHERE id=${body.id} AND (user_id=${actor} OR ${actor}='anonymous') RETURNING *`;
      if (!r.length) return json(res, 404, { error: 'Cas introuvable.' });
      return json(res, 200, r[0]);
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
