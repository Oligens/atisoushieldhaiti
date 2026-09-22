export interface DatabaseUser { id: string; }

export function getLocalUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('atisou_user');
    if (!raw) return null;
    const user = JSON.parse(raw) as DatabaseUser;
    return typeof user?.id === 'string' && user.id ? user.id : null;
  } catch {
    return null;
  }
}

export async function researchRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const userId = getLocalUserId();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (userId) headers.set('x-atisou-user-id', userId);
  const response = await fetch(path, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Erreur de communication avec Neon.');
  return payload as T;
}


export async function iotRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return researchRequest<T>(path, init);
}
