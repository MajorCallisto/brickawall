import { VeilMail } from "@resonia/veilmail-sdk";

/**
 * Transactional email via Veil Mail. Server-only: never import from client
 * components. Created lazily so that VEILMAIL_API_KEY is only required when
 * an email is actually sent.
 */
let cached: VeilMail | undefined;

export function getMailer() {
  if (!cached) {
    const apiKey = process.env.VEILMAIL_API_KEY;
    if (!apiKey) {
      throw new Error("VEILMAIL_API_KEY is not set. See .env.example.");
    }
    cached = new VeilMail(apiKey);
  }
  return cached;
}

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "runwall@example.com";
