import { useCallback, useEffect, useState } from "react";

const KEY = "budgetmate_token";
export const tokenStore = {
  get: () => { try { return localStorage.getItem(KEY) || sessionStorage.getItem(KEY); } catch { return null; } },
  set: (t, remember) => { try { (remember ? localStorage : sessionStorage).setItem(KEY, t); } catch { /* storage unavailable */ } },
  clear: () => { try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch { /* ignore */ } },
};

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function request(method, path, body, { raw } = {}) {
  const headers = {};
  const t = tokenStore.get();
  if (t) headers.Authorization = `Bearer ${t}`;
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch("/api" + path, { method, headers, body: payload }); }
  catch { throw new Error("Can't reach the server. Is it running?"); }
  if (raw && res.ok) return res;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && t && !path.startsWith("/auth/")) onUnauthorized();
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (p) => request("GET", p),
  post: (p, b) => request("POST", p, b ?? {}),
  put: (p, b) => request("PUT", p, b ?? {}),
  del: (p, b) => request("DELETE", p, b ?? {}),
  // Download or open a file that needs the auth header.
  async file(path, filename) {
    const res = await request("GET", path, undefined, { raw: true });
    const url = URL.createObjectURL(await res.blob());
    if (filename) {
      const a = Object.assign(document.createElement("a"), { href: url, download: filename });
      document.body.appendChild(a); a.click(); a.remove();
    } else window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
};

export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: !!path });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!path) return;
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api.get(path).then(
      (data) => live && setState({ data, error: null, loading: false }),
      (error) => live && setState({ data: null, error: error.message, loading: false }));
    return () => { live = false; };
  }, [path, n]);
  const reload = useCallback(() => setN((x) => x + 1), []);
  return { ...state, reload };
}
