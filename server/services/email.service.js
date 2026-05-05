import nodemailer from "nodemailer";

export const sendOtpEmail = async (toEmail, otp) => {
  // Guard: catch missing env vars before nodemailer crashes
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "EMAIL_USER and EMAIL_PASS must be set in .env to send OTP emails. " +
      "See SETUP_GUIDE.md for Gmail App Password instructions."
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"ExamNotes AI" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your ExamNotes AI Password Reset OTP",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;
                  background:#111;color:#fff;border-radius:12px;padding:32px;">
        <h2 style="color:#fff;margin-top:0;">🔐 Password Reset OTP</h2>
        <p style="color:#ccc;">
          Use the code below to reset your ExamNotes AI password.
          It expires in <strong>10 minutes</strong>.
        </p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:10px;
                    text-align:center;margin:24px 0;background:#222;
                    padding:16px;border-radius:8px;">
          ${otp}
        </div>
        <p style="color:#888;font-size:12px;">
          If you didn't request this, ignore this email.
        </p>
        <p style="color:#888;font-size:12px;">— ExamNotes AI Team</p>
      </div>
    `,
  });
};