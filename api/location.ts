function json(res: any, status: number, body: unknown) {
  return res.status(status).setHeader('Content-Type', 'application/json').json(body);
}
function getHeader(req: any, name: string): string | undefined {
  const value = req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : typeof value === 'string' ? value : undefined;
}
function decode(value?: string): string | undefined {
  if (!value) return undefined;
  try { return decodeURIComponent(value); } catch { return value; }
}
export default function handler(req: any, res: any) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Méthode non autorisée.' });
  const latitude = Number(getHeader(req, 'x-vercel-ip-latitude'));
  const longitude = Number(getHeader(req, 'x-vercel-ip-longitude'));
  const city = decode(getHeader(req, 'x-vercel-ip-city'));
  const countryCode = getHeader(req, 'x-vercel-ip-country')?.toUpperCase();
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return json(res, 503, { error: 'Les coordonnées réseau ne sont pas disponibles.' });
  }
  return res.setHeader('Cache-Control', 'private, no-store, max-age=0').setHeader('Vary', 'X-Vercel-IP-City, X-Vercel-IP-Country').status(200).json({ latitude, longitude, city, country: countryCode, accuracy: 25000, source: 'ip' });
}