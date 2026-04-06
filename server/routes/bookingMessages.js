const express = require('express');
const { Booking, InterviewSlot, User, BookingMessage } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(auth);

async function getBookingForMessaging(bookingId) {
  return Booking.findByPk(bookingId, {
    include: [
      { model: InterviewSlot, include: [{ model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] }] },
      { model: User, as: 'Candidate', attributes: ['id', 'name', 'email'] },
    ],
  });
}

function canAccessBookingMessages(user, booking) {
  return user.role === 'admin' ||
    (user.role === 'recruiter' && booking.InterviewSlot?.recruiterId === user.id) ||
    (user.role === 'candidate' && booking.candidateId === user.id);
}

function canSendVisibility(user, visibility) {
  if (visibility === 'participant') return user.role === 'candidate' || user.role === 'recruiter';
  if (visibility === 'admin') return user.role === 'recruiter';
  return false;
}

router.get('/', async (req, res) => {
  try {
    const booking = await getBookingForMessaging(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (!canAccessBookingMessages(req.user, booking)) return res.status(403).json({ error: 'Forbidden' });

    const where = { bookingId: booking.id };
    if (req.user.role === 'candidate') where.visibility = 'participant';
    if (req.user.role === 'admin') where.visibility = 'admin';

    const messages = await BookingMessage.findAll({
      where,
      include: [{ model: User, as: 'Sender', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['createdAt', 'ASC']],
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const booking = await getBookingForMessaging(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (!canAccessBookingMessages(req.user, booking)) return res.status(403).json({ error: 'Forbidden' });

    const message = String(req.body?.message || '').trim();
    const visibility = req.body?.visibility === 'admin' ? 'admin' : 'participant';
    if (!message) return res.status(400).json({ error: 'Message is required.' });
    if (!canSendVisibility(req.user, visibility)) {
      return res.status(403).json({ error: 'You cannot send this type of message.' });
    }

    const created = await BookingMessage.create({
      bookingId: booking.id,
      senderId: req.user.id,
      visibility,
      message,
    });

    const full = await BookingMessage.findByPk(created.id, {
      include: [{ model: User, as: 'Sender', attributes: ['id', 'name', 'email', 'role'] }],
    });

    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      broadcast('messages:updated', {
        bookingId: booking.id,
        senderId: req.user.id,
        senderRole: req.user.role,
        visibility,
        message: visibility === 'admin' ? 'Recruiter pushed an issue to admin' : 'New booking message',
      });
    }

    return res.status(201).json(full);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
