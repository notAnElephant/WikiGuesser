import { createHash } from "node:crypto";

export function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(value, replacer);
}

function replacer(_key: string, currentValue: unknown): unknown {
  if (Array.isArray(currentValue)) {
    return currentValue;
  }

  if (currentValue && typeof currentValue === "object") {
    return Object.fromEntries(
      Object.entries(currentValue as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    );
  }

  return currentValue;
}
