export interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
}

export function parseSSELine(lines: string[]): SSEEvent | null {
  if (lines.length === 0) return null;

  let event = "";
  let dataStr = "";

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      event = line.slice(7);
    } else if (line.startsWith("data: ")) {
      dataStr = line.slice(6);
    }
  }

  if (!event || !dataStr) return null;

  try {
    return { event, data: JSON.parse(dataStr) };
  } catch {
    return null;
  }
}

export interface StreamCallbacks {
  onToken: (text: string) => void;
  onSources: (sources: { type: string; id: string; title: string }[], routedTo: string) => void;
  onSuggestions: (suggestions: string[]) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export async function readSSEStream(
  response: Response,
  callbacks: StreamCallbacks
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const lines = part.split("\n").filter((l) => l.length > 0);
        const parsed = parseSSELine(lines);
        if (!parsed) continue;

        switch (parsed.event) {
          case "token":
            callbacks.onToken(parsed.data.text as string);
            break;
          case "sources":
            callbacks.onSources(
              parsed.data.sources as { type: string; id: string; title: string }[],
              parsed.data.routed_to as string
            );
            break;
          case "suggestions":
            callbacks.onSuggestions(parsed.data.suggestions as string[]);
            break;
          case "done":
            callbacks.onDone();
            break;
          case "error":
            callbacks.onError(parsed.data.message as string);
            break;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
