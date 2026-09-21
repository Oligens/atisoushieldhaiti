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

export default async function handler(req: any, res: any) {
  if (!sql) return json(res, 500, { error: 'DATABASE_URL/NEON_DATABASE_URL absent dans Vercel.' });
  const path = typeof req.query?.path === 'string' ? req.query.path : '';
  const actor = userId(req);
  try {
    if (req.method === 'GET' && path === 'stats') {
      const rows = await sql`SELECT crop, location, predicted_disease, confidence, validation_label, actual_disease FROM agricultural_cases WHERE user_id = ${actor} OR ${actor} = 'anonymous' ORDER BY created_at DESC`;
      const confirmed = rows.filter((r:any)=>r.validation_label==='confirmed').length;
      const rejected = rows.filter((r:any)=>r.validation_label==='rejected').length;
      const uncertain = rows.filter((r:any)=>r.validation_label==='uncertain').length;
      const evaluated = rows.filter((r:any)=>r.actual_disease && (r.validation_label==='confirmed'||r.validation_label==='rejected'));
      const labels = [...new Set(evaluated.flatMap((r:any)=>[String(r.predicted_disease),String(r.actual_disease)]))];
      const confusionMatrix = labels.flatMap(actual => labels.map(predicted => ({ actual, predicted, count: evaluated.filter((r:any)=>String(r.actual_disease)===actual && String(r.predicted_disease)===predicted).length }))).filter(x=>x.count>0);
      const accuracy = evaluated.length ? evaluated.filter((r:any)=>String(r.actual_disease)===String(r.predicted_disease)).length/evaluated.length : 0;
      const scores = labels.map(label=>{ const tp=evaluated.filter((r:any)=>String(r.actual_disease)===label&&String(r.predicted_disease)===label).length; const fp=evaluated.filter((r:any)=>String(r.actual_disease)!==label&&String(r.predicted_disease)===label).length; const fn=evaluated.filter((r:any)=>String(r.actual_disease)===label&&String(r.predicted_disease)!==label).length; const precision=tp+fp?tp/(tp+fp):0; const recall=tp+fn?tp/(tp+fn):0; const f1=precision+recall?2*precision*recall/(precision+recall):0; return {precision,recall,f1}; });
      const avg=(key:'precision'|'recall'|'f1')=>scores.length?scores.reduce((s,x)=>s+x[key],0)/scores.length:0;
      const count=(key:string)=>{const m=new Map<string,number>(); rows.forEach((r:any)=>{const v=String(r[key]||'Non renseigné');m.set(v,(m.get(v)||0)+1)});return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([label,value])=>({label,value}))};
      return json(res,200,{totalCases:rows.length,confirmed,rejected,uncertain,confirmationRate:confirmed+rejected?Math.round(confirmed/(confirmed+rejected)*100):0,averageConfidence:rows.length?Math.round(rows.reduce((s:number,r:any)=>s+Number(r.confidence||0),0)/rows.length):0,byCrop:count('crop'),byDisease:count('predicted_disease'),byLocation:count('location'),metrics:{accuracy,precision:avg('precision'),recall:avg('recall'),f1:avg('f1'),evaluatedCases:evaluated.length,confusionMatrix}});
    }
    if (req.method === 'GET' && path === 'risk-map') {
      const rows=await sql`SELECT location, latitude, longitude, predicted_disease, confidence, validation_label, weather, created_at FROM agricultural_cases WHERE user_id = ${actor} OR ${actor} = 'anonymous' ORDER BY created_at DESC`;
      const grouped=new Map<string,any>(); for(const r of rows as any[]){const key=r.location||'Non renseigné';const p=grouped.get(key)||{location:key,cases:0,confirmed:0,avgConfidence:0,latitude:r.latitude??null,longitude:r.longitude??null};p.cases++;p.confirmed+=r.validation_label==='confirmed'?1:0;p.avgConfidence+=Number(r.confidence||0);if(r.latitude!=null)p.latitude=r.latitude;if(r.longitude!=null)p.longitude=r.longitude;grouped.set(key,p)}
      return json(res,200,[...grouped.values()].map(r=>({...r,avgConfidence:Math.round(r.avgConfidence/r.cases)})).sort((a,b)=>b.cases-a.cases));
    }
    if (req.method === 'GET' && path === 'export') {
      const rows=await sql`SELECT * FROM agricultural_cases WHERE user_id = ${actor} OR ${actor} = 'anonymous' ORDER BY created_at DESC`;
      return json(res,200,rows);
    }
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):req.body||{};
    if (req.method === 'POST' && path === 'cases') {
      const r=await sql`INSERT INTO agricultural_cases (user_id,crop,location,latitude,longitude,predicted_disease,confidence,validation_label,actual_disease,field_outcome,weather,image_reference) VALUES (${actor},${body.crop||'Non renseigné'},${body.location||'Non renseigné'},${body.latitude??null},${body.longitude??null},${body.predicted_disease},${Number(body.confidence||0)},${body.validation_label??null},${body.actual_disease?.trim()||null},${body.field_outcome??null},${body.weather??null},${body.image_reference??null}) RETURNING *`;
      return json(res,201,r[0]);
    }
    if (req.method === 'PATCH' && path === 'cases') {
      if (!body.id) return json(res,400,{error:'Identifiant de cas requis.'});
      const r=await sql`UPDATE agricultural_cases SET validation_label=${body.validation_label??null}, actual_disease=${body.actual_disease?.trim()||null}, field_outcome=${body.field_outcome??null}, weather=COALESCE(${body.weather??null},weather) WHERE id=${body.id} AND (user_id=${actor} OR ${actor}='anonymous') RETURNING *`;
      if(!r.length)return json(res,404,{error:'Cas introuvable.'}); return json(res,200,r[0]);
    }
    if (req.method === 'PATCH' && path === 'cases-weather') {
      if (!body.id) return json(res,400,{error:'Identifiant de cas requis.'});
      const r=await sql`UPDATE agricultural_cases SET weather=${body.weather??null} WHERE id=${body.id} AND (user_id=${actor} OR ${actor}='anonymous') RETURNING *`;
      if(!r.length)return json(res,404,{error:'Cas introuvable.'}); return json(res,200,r[0]);
    }
    if (req.method === 'POST' && path === 'weather-observations') {
      const r=await sql`INSERT INTO weather_observations (user_id,observed_at,latitude,longitude,temperature,humidity,wind_speed,rainfall,weather) VALUES (${actor},${body.observed_at??new Date().toISOString()},${body.latitude},${body.longitude},${body.temperature},${body.humidity},${body.wind_speed},${body.rainfall ?? body.rainfall_mm ?? 0},${body.weather ?? null}) RETURNING *`;
      return json(res,201,r[0]);
    }
    return json(res,404,{error:'Route de recherche inconnue.'});
  } catch(error) { console.error('Neon research API error',error); return json(res,500,{error:error instanceof Error?error.message:'Erreur Neon.'}); }
}
