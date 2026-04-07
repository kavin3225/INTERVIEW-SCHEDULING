const express = require('express');
const { Op } = require('sequelize');
const { User, InterviewSlot, Booking, RecoveryRequest, RecoveryRequestMessage, sequelize } = require('../models');
const { auth, requireRole } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/emailService');

const router = express.Router();

router.use(auth);
router.use(requireRole('admin', 'recruiter'));

async function removeUserAndRelatedData(user, actorId) {
  if (!user) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  if (user.id === actorId) {
    const err = new Error('You cannot remove your own account.');
    err.status = 400;
    throw err;
  }

  return sequelize.transaction(async (tx) => {
    let slotIdsToFree = [];

    if (user.role === 'candidate') {
      const bookings = await Booking.findAll({
        where: { candidateId: user.id },
        attributes: ['slotId'],
        transaction: tx,
      });

      slotIdsToFree = [...new Set(bookings.map((b) => b.slotId))];

      if (slotIdsToFree.length) {
        await InterviewSlot.update(
          { isBooked: false },
          { where: { id: { [Op.in]: slotIdsToFree } }, transaction: tx }
        );
      }

      await Booking.destroy({ where: { candidateId: user.id }, transaction: tx });
    }

    if (user.role === 'recruiter') {
      const recruiterSlots = await InterviewSlot.findAll({
        where: { recruiterId: user.id },
        attributes: ['id'],
        transaction: tx,
      });

      const recruiterSlotIds = recruiterSlots.map((s) => s.id);
      if (recruiterSlotIds.length) {
        await Booking.destroy({ where: { slotId: { [Op.in]: recruiterSlotIds } }, transaction: tx });
        await InterviewSlot.destroy({ where: { id: { [Op.in]: recruiterSlotIds } }, transaction: tx });
      }
    }

    if (user.role === 'admin') {
      const adminCount = await User.count({ where: { role: 'admin' }, transaction: tx });
      if (adminCount <= 1) {
        const err = new Error('Cannot remove the last admin account.');
        err.status = 400;
        throw err;
      }
    }

    await user.destroy({ transaction: tx });

    return {
      removedUser: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      freedSlotIds: slotIdsToFree,
    };
  });
}

router.get('/', async (req, res) => {
  try {
    const query = {
      attributes: ['id', 'email', 'name', 'mobileNumber', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']],
    };

    if (req.user.role === 'recruiter') {
      query.where = { role: 'candidate' };
    }

    const users = await User.findAll(query);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function createPrivilegedUser(req, res, role) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: `Only admins can create ${role} accounts.` });
  }

  try {
    const email = req.body?.email?.trim().toLowerCase();
    const password = req.body?.password;
    const name = req.body?.name?.trim();

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const existingName = await User.findOne({
      where: sequelize.where(sequelize.fn('lower', sequelize.col('name')), name.toLowerCase()),
    });
    if (existingName) {
      return res.status(400).json({ error: 'Name already registered. Please use a different name.' });
    }

    const user = await User.create({
      email,
      password,
      name,
      role,
    });

    await sendWelcomeEmail({
      to: user.email,
      name: user.name,
      role: user.role,
    });

    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      broadcast('users:updated', { message: `${role} created: ${user.email}` });
    }

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        mobileNumber: user.mobileNumber,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

router.post('/admin', async (req, res) => {
  return createPrivilegedUser(req, res, 'admin');
});

router.post('/recruiter', async (req, res) => {
  return createPrivilegedUser(req, res, 'recruiter');
});

router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can remove users.' });
  }

  try {
    const user = await User.findByPk(req.params.id);
    const result = await removeUserAndRelatedData(user, req.user.id);

    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      broadcast('users:updated', { message: `User removed: ${result.removedUser.email}` });
      broadcast('bookings:updated', { message: 'Bookings updated after user removal' });
      broadcast('slots:updated', { message: 'Slots updated after user removal' });
    }

    res.json({ message: 'User removed successfully.', user: result.removedUser });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/kick', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can kick users.' });
  }

  try {
    const email = req.body?.email?.trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await User.findOne({ where: { email } });
    const result = await removeUserAndRelatedData(user, req.user.id);

    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      broadcast('users:updated', { message: `User kicked: ${result.removedUser.email}` });
      broadcast('bookings:updated', { message: 'Bookings updated after user kick' });
      broadcast('slots:updated', { message: 'Slots updated after user kick' });
    }

    res.json({ message: 'User kicked successfully.', user: result.removedUser });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.patch('/:id/recovery', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || user.role !== 'candidate') {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    const nextEmail = req.body?.email?.trim().toLowerCase();
    const nextPassword = req.body?.password;

    if (!nextEmail && !nextPassword) {
      return res.status(400).json({ error: 'Provide a new email or password.' });
    }

    if (nextEmail && nextEmail !== user.email) {
      const existing = await User.findOne({ where: { email: nextEmail } });
      if (existing && existing.id !== user.id) {
        return res.status(400).json({ error: 'Email already registered.' });
      }
      user.email = nextEmail;
    }

    if (nextPassword) {
      if (nextPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      user.password = nextPassword;
    }

    await user.save({ hooks: true });

    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      broadcast('users:updated', { message: `Candidate account updated: ${user.email}` });
    }

    res.json({
      message: 'Candidate account recovery details updated successfully.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        mobileNumber: user.mobileNumber,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recovery-requests/all', async (req, res) => {
  try {
    const requests = await RecoveryRequest.findAll({
      include: [
        { model: User, as: 'Candidate', attributes: ['id', 'name', 'email'], required: false },
        {
          model: RecoveryRequestMessage,
          as: 'Messages',
          required: false,
          include: [{ model: User, as: 'Sender', attributes: ['id', 'name', 'email', 'role'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recovery-requests/:id/messages', async (req, res) => {
  try {
    const request = await RecoveryRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Recovery request not found.' });
    }

    const message = String(req.body?.message || '').trim();
    if (!message) {
      return res.status(400).json({ error: 'Reply message is required.' });
    }

    const created = await RecoveryRequestMessage.create({
      recoveryRequestId: request.id,
      senderId: req.user.id,
      message,
    });

    const full = await RecoveryRequestMessage.findByPk(created.id, {
      include: [{ model: User, as: 'Sender', attributes: ['id', 'name', 'email', 'role'] }],
    });

    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      broadcast('users:updated', { message: `New recovery reply for ${request.candidateName}` });
    }

    res.status(201).json(full);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unable to send recovery reply.' });
  }
});

router.patch('/recovery-requests/:id', async (req, res) => {
  try {
    const request = await RecoveryRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Recovery request not found.' });
    }

    const status = req.body?.status === 'resolved' ? 'resolved' : 'pending';
    request.status = status;
    await request.save();

    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      broadcast('users:updated', { message: `Recovery request ${status}: ${request.candidateName}` });
    }

    res.json({ message: 'Recovery request updated successfully.', request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
