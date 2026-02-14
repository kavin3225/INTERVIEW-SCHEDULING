const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn('Email not configured (SMTP_*). Notifications will be logged only.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: { user, pass },
  });
  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  const transport = getTransporter();
  const from = process.env.EMAIL_FROM || 'Interview Scheduler <noreply@example.com>';
  const payload = { from, to, subject, text: text || undefined, html: html || undefined };
  if (transport) {
    try {
      await transport.sendMail(payload);
      return { sent: true };
    } catch (err) {
      console.error('Email send failed:', err.message);
      return { sent: false, error: err.message };
    }
  }
  console.log('[Email (no SMTP)]', { to, subject, text: (text || html || '').slice(0, 100) });
  return { sent: true };
}

async function sendBookingConfirmation({ candidateEmail, candidateName, slotDate, startTime, recruiterName }) {
  const subject = 'Interview Scheduled – Confirmation';
  const text = `Hi ${candidateName},\n\nYour interview has been scheduled on ${slotDate} at ${startTime} with ${recruiterName}.\n\nBest regards,\nInterview Scheduler`;
  return sendEmail({ to: candidateEmail, subject, text });
}

async function sendReminder({ to, name, slotDate, startTime }) {
  const subject = 'Reminder: Interview Tomorrow';
  const text = `Hi ${name},\n\nThis is a reminder that your interview is scheduled on ${slotDate} at ${startTime}.\n\nBest regards,\nInterview Scheduler`;
  return sendEmail({ to, subject, text });
}

async function sendCancellation({ to, name, slotDate, startTime }) {
  const subject = 'Interview Cancelled';
  const text = `Hi ${name},\n\nYour interview scheduled on ${slotDate} at ${startTime} has been cancelled.\n\nBest regards,\nInterview Scheduler`;
  return sendEmail({ to, subject, text });
}

module.exports = { sendEmail, sendBookingConfirmation, sendReminder, sendCancellation };
