import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create transporter with explicit timeouts so a slow/unreachable
// SMTP server never hangs the HTTP request for 30+ seconds.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Hard caps — if Gmail doesn't respond in 10s, fail fast
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

/**
 * Send an email.
 * In development: always logs the OTP to the terminal regardless of
 * whether the SMTP send succeeds — so you can test without real email.
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, html, text } = options;

  // In dev: always print to terminal so OTP is visible even if Gmail fails
  if (process.env.NODE_ENV === 'development') {
    console.log('\n─────────────────────────────────────────');
    console.log('📧  DEV EMAIL');
    console.log('  To     :', to);
    console.log('  Subject:', subject);
    // Extract just the OTP code from the HTML for quick reading
    const otpMatch = html.match(/font-size: 36px[^>]*>[\s\n]*(\d{6})/);
    if (otpMatch) console.log('  OTP    :', otpMatch[1]);
    else console.log('  Body   :', html.replace(/<[^>]*>/g, '').trim().slice(0, 200));
    console.log('─────────────────────────────────────────\n');
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'NestMates <noreply@nestmates.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    // In dev we already logged the OTP above — swallow the error so
    // the signup/reset flow completes instantly without an SMTP dependency.
    if (process.env.NODE_ENV !== 'development') {
      throw error;
    }
  }
}

/**
 * Send notification email
 */
export async function sendNotificationEmail(
  to: string,
  title: string,
  message: string,
  actionUrl?: string
): Promise<void> {
  // Escape HTML entities to prevent injection if these strings ever include
  // user-derived content (e.g. post titles used in chat notifications).
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const safeTitle = esc(title);
  const safeMessage = esc(message);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0284c7 0%, #075985 100%); padding: 24px 28px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px; letter-spacing: -0.3px;">NestMates</h1>
        <p style="color: #bae6fd; margin: 4px 0 0; font-size: 13px;">Your trusted housing platform</p>
      </div>
      <div style="background: #ffffff; padding: 32px 28px; border: 1px solid #e0f2fe; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #0c4a6e; margin-top: 0;">${safeTitle}</h2>
        <p style="color: #475569; line-height: 1.7;">${safeMessage}</p>
        ${actionUrl ? `
          <a href="${esc(actionUrl)}" style="display: inline-block; background: #0284c7; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 600;">
            View Details
          </a>
        ` : ''}
      </div>
      <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">You're receiving this because you're a NestMates member.</p>
        <p style="margin: 6px 0 0;">© ${new Date().getFullYear()} NestMates. All rights reserved.</p>
      </div>
    </div>
  `;

  await sendEmail({ to, subject: title, html });
}
