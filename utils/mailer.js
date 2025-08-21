import nodemailer from 'nodemailer';

export const sendMail = async ({ to, subject, text, html }) => {
  try {
    // ✅ Validate recipient
    if (!to || typeof to !== 'string' || !to.trim()) {
      throw new Error("Recipient email address (to) is missing or invalid.");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_TRAP_SMTP_HOST,
      port: parseInt(process.env.MAIL_TRAP_SMTP_PORT),
      auth: {
        user: process.env.MAIL_TRAP_SMTP_USER,
        pass: process.env.MAIL_TRAP_SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: 'no-reply@demomailtrap.co',
      to: to.trim(),
      subject,
      text,
      html, // ✅ now supported
    });

    console.log("✅ Mail sent:", info.messageId);
    return info.messageId;
  } catch (error) {
    console.error("❌ Mail error:", error.message);
    throw error;
  }
};
