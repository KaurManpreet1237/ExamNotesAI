import nodemailer from "nodemailer";

/**
 * Creates a reusable Nodemailer transporter using Gmail SMTP.
 * Requires EMAIL_USER and EMAIL_PASS in your .env file.
 *
 * How to get Gmail App Password:
 * 1. Go to https://myaccount.google.com/security
 * 2. Enable 2-Step Verification
 * 3. Search "App passwords" and create one for "Mail"
 * 4. Copy the 16-character password into EMAIL_PASS in .env
 */
const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

/**
 * Sends a 6-digit OTP to the given email address.
 * @param {string} toEmail   - Recipient email
 * @param {string} otp       - 6-digit OTP string
 */
export const sendOtpEmail = async (toEmail, otp) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"ExamNotes AI" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your ExamNotes AI Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #111; color: #fff; border-radius: 12px; padding: 32px;">
        <h2 style="color:#fff; margin-top:0;">🔐 Password Reset OTP</h2>
        <p style="color:#ccc;">Use the code below to reset your ExamNotes AI password. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px; text-align: center; margin: 24px 0; background:#222; padding:16px; border-radius:8px;">
          ${otp}
        </div>
        <p style="color:#888; font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#888; font-size:12px;">— ExamNotes AI Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
