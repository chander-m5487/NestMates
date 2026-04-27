import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, html, text } = options;

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
    // In development, log the email instead of throwing
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Development Email:');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Content:', html);
    } else {
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
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">NestMates</h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e7e5e4; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1c1917; margin-top: 0;">${title}</h2>
        <p style="color: #44403c; line-height: 1.6;">${message}</p>
        ${actionUrl ? `
          <a href="${actionUrl}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
            View Details
          </a>
        ` : ''}
      </div>
      <div style="text-align: center; padding: 20px; color: #78716c; font-size: 12px;">
        <p>You're receiving this because you're a NestMates member.</p>
        <p>© ${new Date().getFullYear()} NestMates. All rights reserved.</p>
      </div>
    </div>
  `;

  await sendEmail({ to, subject: title, html });
}

