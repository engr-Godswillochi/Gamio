import { apiUrl } from './api';
export async function api(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.body && typeof options.body === 'string' ? {'Content-Type':'application/json'} : {}), ...options.headers },
  });
  const data = await res.json().catch(() => ({error:'The server returned an invalid response'}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export const post = (path, body) => api(path, {method:'POST',body:JSON.stringify(body)});
export function navigate(path) {
  history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}
export function safeNext() {
  const next = new URLSearchParams(location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/dashboard';
}
export async function shareLink(path, title) {
  const url = new URL(path, location.origin).href;
  if (navigator.share) {
    try { await navigator.share({title,text:title,url}); return 'Shared'; }
    catch(e) { if(e.name==='AbortError') return ''; }
  }
  if (navigator.clipboard) { await navigator.clipboard.writeText(url); return 'Link copied — send it to a friend!'; }
  return url;
}
