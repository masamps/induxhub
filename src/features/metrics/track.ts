import type { TrackEventInput } from "./schema";

export const TRACK_EVENT_ENDPOINT = "/api/events";

/**
 * Envia o evento sem bloquear a navegação. `sendBeacon` sobrevive à troca de página,
 * o que importa nos cliques que abrem o WhatsApp ou levam ao formulário.
 */
export function trackEvent(input: TrackEventInput) {
  const body = JSON.stringify(input);
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(TRACK_EVENT_ENDPOINT, new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch(TRACK_EVENT_ENDPOINT, { method: "POST", body, keepalive: true });
}
