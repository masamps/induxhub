import { z } from "zod";

export const trackEventSchema = z.object({
  companyId: z.string().uuid(),
  event: z.enum(["view", "whatsapp", "quote_click"]),
});

export type TrackEventInput = z.infer<typeof trackEventSchema>;
