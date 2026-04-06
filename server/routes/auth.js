const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, RecoveryRequest, sequelize } = require('../models');
const { auth } = require('../middleware/auth');
const { sendWelcomeEmail, sendPasswordReset } = require('../services/emailService');

const router = express.Router();
const DIRECT_ADMIN_EMAIL = 'kavin.admin@gmail.com';
const DIRECT_ADMIN_PASSWORD = '123';
const DIRECT_ADMIN_NAME = 'Administrator';
const CANDIDATE_EMAIL_REGEX = /^[a-z0-9]+(?:[._][a-z0-9]+)*\.candidate@gmail\.com$/;
const MOBILE_NUMBER_REGEX = /^\+?[0-9]{10,15}$/;

// in-memory store: token -> { userId, expires }
const resetTokens = new Map();

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, mobileNumber } = req.body;
    if (!email || !password || !name || !mobileNumber) {
      return res.status(400).json({ error: 'Email, password, name, and mobile number are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = role?.toLowerCase?.() || 'candidate';
    const normalizedMobileNumber = String(mobileNumber).trim();

    if (normalizedRole === 'candidate' && !CANDIDATE_EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Candidate email must be in the format name.candidate@gmail.com.' });
    }

    if (!MOBILE_NUMBER_REGEX.test(normalizedMobileNumber)) {
      return res.status(400).json({ error: 'Mobile number must contain 10 to 15 digits and may start with +.' });
    }

    if (normalizedRole !== 'candidate') {
      return res.status(403).json({ error: 'Public registration only supports candidate accounts.' });
    }

    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const trimmedName = name.trim();
    const existingName = await User.findOne({
      where: sequelize.where(sequelize.fn('lower', sequelize.col('name')), trimmedName.toLowerCase()),
    });
    if (existingName) {
      return res.status(400).json({ error: 'Name already registered. Please use a different name.' });
    }

    const user = await User.create({
      email: normalizedEmail,
      password,
      name: trimmedName,
      mobileNumber: normalizedMobileNumber,
      role: normalizedRole,
    });

    await sendWelcomeEmail({
      to: user.email,
      name: user.name,
      role: user.role
    });

    const token = generateToken(user);
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, mobileNumber: user.mobileNumber, role: user.role },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ where: { email: normalizedEmail } });

    if (normalizedEmail === DIRECT_ADMIN_EMAIL && password === DIRECT_ADMIN_PASSWORD) {
      if (!user) {
        user = await User.create({
          email: DIRECT_ADMIN_EMAIL,
          password: DIRECT_ADMIN_PASSWORD,
          name: DIRECT_ADMIN_NAME,
          role: 'admin',
        });
      } else {
        if (user.role !== 'admin' || user.name !== DIRECT_ADMIN_NAME || !(await user.comparePassword(DIRECT_ADMIN_PASSWORD))) {
          user.role = 'admin';
          user.name = DIRECT_ADMIN_NAME;
          user.password = DIRECT_ADMIN_PASSWORD;
          await user.save({ hooks: true });
        }
      }

      const token = generateToken(user);
      return res.json({
        user: { id: user.id, email: user.email, name: user.name, mobileNumber: user.mobileNumber, role: user.role },
        token,
      });
    }

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = generateToken(user);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, mobileNumber: user.mobileNumber, role: user.role },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

router.get('/me', auth, (req, res) => {
  const u = req.user;
  res.json({ user: { id: u.id, email: u.email, name: u.name, mobileNumber: u.mobileNumber, role: u.role } });
});

// Forgot password — send reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    // always respond OK to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(token, { userId: user.id, expires: Date.now() + 15 * 60 * 1000 });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    await sendPasswordReset({ to: user.email, name: user.name, resetUrl });
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recovery-request', async (req, res) => {
  try {
    const candidateName = String(req.body?.candidateName || '').trim();
    const simpleEmail = String(req.body?.email || '').trim().toLowerCase();
    const currentEmail = String(req.body?.currentEmail || simpleEmail).trim().toLowerCase();
    const contactEmail = String(req.body?.contactEmail || simpleEmail).trim().toLowerCase();
    const requestedEmail = String(req.body?.requestedEmail || '').trim().toLowerCase();
    const requestedPassword = String(req.body?.requestedPassword || '').trim();
    const note = String(req.body?.note || '').trim();

    if (!candidateName) {
      return res.status(400).json({ error: 'Candidate name is required.' });
    }
    if (!currentEmail && !contactEmail) {
      return res.status(400).json({ error: 'Provide the current email or a contact email.' });
    }

    let matchedCandidate = null;
    if (currentEmail) {
      matchedCandidate = await User.findOne({ where: { email: currentEmail, role: 'candidate' } });
    }

    await RecoveryRequest.create({
      candidateId: matchedCandidate?.id || null,
      candidateName,
      currentEmail: currentEmail || null,
      contactEmail: contactEmail || null,
      requestedEmail: requestedEmail || null,
      requestedPassword: requestedPassword || null,
      note: note || null,
      status: 'pending',
    });

    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      broadcast('users:updated', { message: `New candidate recovery request from ${candidateName}` });
    }

    res.status(201).json({
      message: 'Your request has been sent to the recruiter. They can now help update your email or password.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unable to submit recovery request.' });
  }
});

// Reset password — verify token and update password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const entry = resetTokens.get(token);
    if (!entry) return res.status(400).json({ error: 'Invalid or expired reset link.' });
    if (Date.now() > entry.expires) {
      resetTokens.delete(token);
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    const user = await User.findByPk(entry.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.password = password; // beforeCreate hook hashes it
    await user.save({ hooks: true });
    resetTokens.delete(token);
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
