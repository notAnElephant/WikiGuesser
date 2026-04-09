const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_DELAY_MS = 1500;

const wikimediaHeaders = {
  Accept: "application/json",
  "User-Agent":
    "WikiGuesser/1.0 (https://wiki-guesser-nine.vercel.app; contact: project runtime)",
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(response: Response | null, attempt: number): number {
  const retryAfter = response?.headers.get("retry-after");

  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10);

    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }

  return DEFAULT_BASE_DELAY_MS * 2 ** attempt;
}

function shouldRetry(response: Response | null): boolean {
  if (!response) {
    return true;
  }

  return response.status === 429 || response.status >= 500;
}

export async function fetchWikimediaJson<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= DEFAULT_MAX_RETRIES; attempt += 1) {
    let response: Response | null = null;

    try {
      response = await fetch(input, {
        ...init,
        headers: {
          ...wikimediaHeaders,
          ...(init?.headers ?? {}),
        },
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      lastError = new Error(
        `Wikimedia request failed: ${response.status} ${response.statusText}`,
      );
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Unknown Wikimedia request failure");
    }

    if (attempt === DEFAULT_MAX_RETRIES || !shouldRetry(response)) {
      throw lastError;
    }

    await sleep(getRetryDelayMs(response, attempt));
  }

  throw lastError ?? new Error("Wikimedia request failed");
}
