import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const generatedRoot = path.join(process.cwd(), ".generated");

export function getGeneratedPath(...segments: string[]): string {
  return path.join(generatedRoot, ...segments);
}

export async function ensureGeneratedDirectory(
  ...segments: string[]
): Promise<string> {
  const target = getGeneratedPath(...segments);
  await mkdir(target, { recursive: true });
  return target;
}

export async function readGeneratedJson<T>(...segments: string[]): Promise<T> {
  const target = getGeneratedPath(...segments);
  return JSON.parse(await readFile(target, "utf8")) as T;
}

export async function writeGeneratedJson(
  value: unknown,
  ...segments: string[]
): Promise<string> {
  const directory = path.dirname(getGeneratedPath(...segments));
  await mkdir(directory, { recursive: true });
  const target = getGeneratedPath(...segments);
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return target;
}
