export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok(): { ok: true; data: undefined };
export function ok<T>(data: T): { ok: true; data: T };
export function ok<T>(data?: T): { ok: true; data: T | undefined } {
  return { ok: true, data };
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export const INVALID_INPUT = "Confira os campos destacados.";
export const UNEXPECTED = "Algo deu errado. Tente de novo.";
