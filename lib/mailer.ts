export interface EmailMessage {
  to: string
  subject: string
  text: string
}

/**
 * No email provider is wired up yet (there is no SMTP/Resend/SendGrid config
 * in this project). Until one is added, log the full message so links are
 * usable in development, and make the gap loud in production logs. API
 * responses that depend on this must stay uniform either way, so a missing
 * provider never leaks account existence.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    console.warn(
      `[mailer] No email provider configured — email to ${message.to} (${message.subject}) was not sent.`,
    )
    return
  }

  console.info(
    [
      "[mailer] ── outgoing email ──────────────────────────",
      `To:      ${message.to}`,
      `Subject: ${message.subject}`,
      "",
      message.text,
      "─────────────────────────────────────────────────────",
    ].join("\n"),
  )
}
