const AI_SIDECAR_URL = process.env.AI_SIDECAR_URL ?? "http://localhost:8000";

export async function callSidecar<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${AI_SIDECAR_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sidecar error (${res.status}): ${err}`);
  }

  return res.json();
}
