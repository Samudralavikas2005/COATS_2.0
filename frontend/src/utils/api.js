const BASE = "https://127.0.0.1:8000";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",  // ← always send cookies cross-origin
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.clear();
    window.location.href = "/login";
    return null;
  }

  return res;
}

export async function apiGet(path) {
  return apiFetch(path, { method: "GET" });
}

export async function apiPost(path, body) {
  return apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPatch(path, body) {
  return apiFetch(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function logout() {
  await apiFetch("/api/logout/", { method: "POST" });
  localStorage.clear();
  window.location.href = "/login";
}
