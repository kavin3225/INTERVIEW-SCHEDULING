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
  const from = process.env.EMAIL_FROM || 'Interview Scheduler Premium <noreply@example.com>';
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
  const text = `Hi ${candidateName},\n\nYour interview has been scheduled on ${slotDate} at ${startTime} with ${recruiterName}.\n\nBest regards,\nInterview Scheduler Premium`;
  return sendEmail({ to: candidateEmail, subject, text });
}

async function sendReminder({ to, name, slotDate, startTime }) {
  const subject = 'Reminder: Interview Tomorrow';
  const text = `Hi ${name},\n\nThis is a reminder that your interview is scheduled on ${slotDate} at ${startTime}.\n\nBest regards,\nInterview Scheduler Premium`;
  return sendEmail({ to, subject, text });
}

async function sendCancellation({ to, name, slotDate, startTime }) {
  const subject = 'Interview Cancelled';
  const text = `Hi ${name},\n\nYour interview scheduled on ${slotDate} at ${startTime} has been cancelled.\n\nBest regards,\nInterview Scheduler Premium`;
  return sendEmail({ to, subject, text });
}

async function sendWelcomeEmail({ to, name, role }) {
  const subject = '🎉 Welcome to Interview Scheduler!';
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { margin: 0; padding: 0; background: #0f172a; font-family: 'Segoe UI', sans-serif; }
      .wrapper { max-width: 560px; margin: 40px auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid rgba(102,126,234,0.3); }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 36px 32px; text-align: center; }
      .header h1 { margin: 0; color: #fff; font-size: 24px; letter-spacing: -0.5px; }
      .header p { margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px; }
      .body { padding: 32px; }
      .body p { color: #cbd5e1; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
      .role-badge { display: inline-block; background: rgba(102,126,234,0.2); color: #818cf8; border: 1px solid rgba(102,126,234,0.4); border-radius: 999px; padding: 4px 16px; font-size: 13px; font-weight: 700; text-transform: capitalize; margin-bottom: 20px; }
      .info-box { background: rgba(15,23,42,0.6); border: 1px solid rgba(100,116,139,0.3); border-radius: 12px; padding: 20px 24px; margin: 20px 0; }
      .info-box p { margin: 6px 0; color: #94a3b8; font-size: 14px; }
      .info-box span { color: #f1f5f9; font-weight: 600; }
      .btn { display: inline-block; margin: 24px 0 8px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; }
      .footer { padding: 20px 32px; border-top: 1px solid rgba(100,116,139,0.2); text-align: center; }
      .footer p { color: #475569; font-size: 12px; margin: 0; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header">
        <h1>🎉 Welcome Aboard!</h1>
        <p>Interview Scheduler Premium</p>
      </div>
      <div class="body">
        <p>Hi <strong style="color:#f1f5f9">${name}</strong>,</p>
        <p>Your account has been successfully created!</p>
        <div class="role-badge">${role}</div>
        <div class="info-box">
          <p>📧 Email: <span>${to}</span></p>
          <p>👤 Role: <span style="text-transform:capitalize">${role}</span></p>
          <p>✅ Status: <span style="color:#10b981">Active</span></p>
        </div>
        <p>${role === 'candidate' ? '🗓️ You can now browse available interview slots and book your interview.' : '📋 You can now create and manage interview slots for candidates.'}</p>
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" class="btn">Go to Dashboard →</a>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Interview Scheduler Premium · All rights reserved</p>
      </div>
    </div>
  </body>
  </html>`;
  return sendEmail({ to, subject, html });
}

async function sendPasswordReset({ to, name, resetUrl }) {
  const subject = '🔐 Reset Your Password';
  const html = `
  <!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body { margin:0; padding:0; background:#0f172a; font-family:'Segoe UI',sans-serif; }
    .wrapper { max-width:520px; margin:40px auto; background:#1e293b; border-radius:16px; overflow:hidden; border:1px solid rgba(102,126,234,0.3); }
    .header { background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); padding:32px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:22px; }
    .body { padding:32px; }
    .body p { color:#cbd5e1; font-size:15px; line-height:1.7; margin:0 0 16px; }
    .btn { display:inline-block; margin:8px 0; background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; text-decoration:none; padding:14px 32px; border-radius:10px; font-weight:700; font-size:15px; }
    .note { color:#64748b; font-size:13px; margin-top:20px; }
    .footer { padding:16px 32px; border-top:1px solid rgba(100,116,139,0.2); text-align:center; }
    .footer p { color:#475569; font-size:12px; margin:0; }
  </style></head><body>
  <div class="wrapper">
    <div class="header"><h1>🔐 Password Reset</h1></div>
    <div class="body">
      <p>Hi <strong style="color:#f1f5f9">${name}</strong>,</p>
      <p>We received a request to reset your password. Click the button below — this link expires in <strong style="color:#f1f5f9">15 minutes</strong>.</p>
      <a href="${resetUrl}" class="btn">Reset Password →</a>
      <p class="note">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
    </div>
    <div class="footer"><p>© ${new Date().getFullYear()} Interview Scheduler Premium</p></div>
  </div></body></html>`;
  return sendEmail({ to, subject, html });
}

module.exports = { sendEmail, sendBookingConfirmation, sendReminder, sendCancellation, sendWelcomeEmail, sendPasswordReset };
