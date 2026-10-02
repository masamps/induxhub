/** Aceita só caminhos internos ("/x"), nunca "//host" ou URL absoluta. */
export function safeNext(value: unknown, fallback = "/painel") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
