function appPath(path: string) {
  if (path.startsWith("http")) return path;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(appPath(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Request failed");
  }
  return response.json();
}
