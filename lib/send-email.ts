import 'server-only';

import { Resend } from 'resend';

type EmailPayload = {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
};

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM ?? 'onboarding@resend.dev';

function getResendClient() {
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY is not set.');
    }

    console.warn(
      '[send-email] RESEND_API_KEY is not set. Emails will be logged to console in development.'
    );
    return null;
  }

  return new Resend(apiKey);
}

export async function sendEmail({ to, subject, html }: EmailPayload): Promise<void> {
  const client = getResendClient();

  if (!client) {
    console.log('--- DEV EMAIL ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html}`);
    console.log('--- END EMAIL ---');
    return;
  }

  const { error } = await client.emails.send({
    from: fromAddress,
    to,
    subject,
    html,
  });

  if (error) {
    console.error('[send-email] Failed to send email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
