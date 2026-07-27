/**
 * Stubbed transactional email sender. Swapping in Resend/SES later is a
 * one-file change — nothing else in the app should import a mail provider
 * directly.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}) {
  console.log(`[email:stub] to=${params.to} subject="${params.subject}"`);
  console.log(params.body);
}
