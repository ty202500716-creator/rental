// Single place that talks to the PHP backend.  Route example: api('buildings')  ->  index.php?r=buildings
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/index.php';
export async function api(route, data, method) {
  const post = data !== undefined, isFd = data instanceof FormData;
  let res;
  try {
    res = await fetch(`${BASE}?r=${route}`, { method: method || (post ? 'POST' : 'GET'), credentials: 'include',
      headers: post && !isFd ? { 'Content-Type': 'application/json' } : {}, body: post ? (isFd ? data : JSON.stringify(data)) : undefined });
  } catch (error) {
    error.status = null;
    throw error;
  }
  const j = await res.json().catch(() => ({ error: 'Server returned an invalid response.' }));
  if (!res.ok) {
    if ((res.status === 401 || res.status === 403) && route !== 'auth/me' && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ars:auth:refresh', {detail: {status: res.status, message: j.error || 'Request failed'}}));
    }
    const error = new Error(j.error || 'Request failed');
    error.status = res.status;
    throw error;
  }
  return j;
}
export const fileUrl = p => `${BASE}?r=files&path=${encodeURIComponent(p)}`;
export const tenantDocumentUrl = tenantId => `${BASE}?r=tenants/document&tenant_id=${encodeURIComponent(tenantId)}`;
