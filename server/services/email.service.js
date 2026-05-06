/**
 * email.service.js — Resend API (HTTP-based, works on ALL hosting platforms)
 *
 * WHY NOT NODEMAILER + GMAIL SMTP:
 *   Render's free tier blocks ALL outbound SMTP ports (25, 465, 587).
 *   Gmail SMTP connections time out immediately in production.
 *   Resend sends email via HTTPS REST API — no port restrictions.
 *
 * SETUP (one-time, 2 minutes):
 *   1. Go to https://resend.com — create free account (100 emails/day free)
 *   2. Settings → API Keys → Create API Key → copy it
 *   3. Add to Render env vars:  RESEND_API_KEY=re_xxxxxxxxxxxx
 *   4. Add to local server/.env: RESEND_API_KEY=re_xxxxxxxxxxxx
 *
 * IMPORTANT — sender domain:
 *   Free Resend accounts can only send FROM "onboarding@resend.dev"
 *   unless you verify your own domain.
 *   So FROM address is hardcoded to onboarding@resend.dev below.
 *   Users will still RECEIVE the OTP at their own email address.
 */

/**
 * Sends a 6-digit OTP email via Resend API.
 * @param {string} toEmail  - Recipient email address
 * @param {string} otp      - 6-digit OTP string
 */
export const sendOtpEmail = async (toEmail, otp) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set in environment variables. " +
      "Get a free API key at https://resend.com"
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: "ExamCraft <onboarding@resend.dev>",
      to:   [toEmail],
      subject: "Your ExamCraft Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px;
          margin: 0 auto; background: #111; color: #fff;
          border-radius: 12px; padding: 32px;">

          <h2 style="color:#fff; margin-top:0;">🔐 Password Reset OTP</h2>

          <p style="color:#ccc;">
            Use the code below to reset your ExamCraft password.
            It expires in <strong>10 minutes</strong>.
          </p>

          <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px;
            text-align: center; margin: 24px 0; background: #222;
            padding: 16px; border-radius: 8px; color: #fff;">
            ${otp}
          </div>

          <p style="color:#888; font-size:12px;">
            If you didn't request this, you can safely ignore this email.
          </p>
          <p style="color:#888; font-size:12px;">— ExamCraft Team</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API error ${response.status}: ${errorBody}`);
  }

  return response.json();
};