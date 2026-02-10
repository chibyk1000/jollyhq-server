import nodemailer from "nodemailer";
import { generateOtp, generatePass } from "@hixbe/otp-pass-kit";
// Initialize nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export function generateVerificationCode(): string {
  return generateOtp();
}

export function verificationEmailTemplate(
  firstName: string,
  code: string,
): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f9f9f9;
        padding: 0;
        margin: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        padding: 24px;
        border-radius: 8px;
        text-align: center;
      }
      h1 {
        font-size: 24px;
        margin-bottom: 16px;
      }
      p {
        font-size: 16px;
        color: #555;
      }
      .code {
        font-size: 32px;
        font-weight: bold;
        letter-spacing: 6px;
        background: #f1f5f9;
        padding: 16px;
        border-radius: 6px;
        margin: 24px 0;
      }
      footer {
        font-size: 12px;
        color: #999;
        margin-top: 24px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Verify Your Email</h1>
      <p>Hi ${firstName},</p>
      <p>Use the code below to verify your email address:</p>

      <div class="code">${code}</div>

      <p>This code expires in <strong>10 minutes</strong>.</p>

      <footer>
        <p>If you didn’t create this account, you can ignore this email.</p>
      </footer>
    </div>
  </body>
  </html>
  `;
}

export async function sendVerificationEmail(email: string, firstName: string, otp:string) {
 

  // TODO:
  // - hash code before saving
  // - store expiry (e.g. 10 mins)

 const res = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Email Verification Code",
    html: verificationEmailTemplate(firstName, otp),
  });

  return res; // return plain code ONLY if you need it temporarily
}