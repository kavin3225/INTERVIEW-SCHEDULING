const express = require('express');
const { Booking, InterviewSlot, User } = require('../models');
const { auth, requireRole } = require('../middleware/auth');
const { sendBookingConfirmation, sendCancellation } = require('../services/emailService');

const router = express.Router();

router.use(auth);

// Candidate books a slot
router.post('/', requireRole('candidate'), async (req, res) => {
  try {
    const { slotId, notes } = req.body;
    if (!slotId) return res.status(400).json({ error: 'slotId is required.' });
    const slot = await InterviewSlot.findByPk(slotId, {
      include: [{ model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] }],
    });
    if (!slot) return res.status(404).json({ error: 'Slot not found.' });
    if (slot.isBooked) return res.status(400).json({ error: 'Slot is already booked.' });
    if (slot.slotDate < new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ error: 'Cannot book past slots.' });
    }
    const booking = await Booking.create({
      slotId,
      candidateId: req.user.id,
      status: 'scheduled',
      notes: notes || null,
    });
    slot.isBooked = true;
    await slot.save();
    const recruiter = slot.Recruiter;
    await sendBookingConfirmation({
      candidateEmail: req.user.email,
      candidateName: req.user.name,
      slotDate: slot.slotDate,
      startTime: slot.startTime,
      recruiterName: recruiter ? recruiter.name : 'Recruiter',
    });
    const full = await Booking.findByPk(booking.id, {
      include: [
        { model: InterviewSlot, include: [{ model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] }] },
        { model: User, as: 'Candidate', attributes: ['id', 'name', 'email'] },
      ],
    });
    const broadcast = req.app.get('broadcast');
    if (broadcast) broadcast('bookings:updated', { message: 'Slot booked successfully' });
    if (broadcast) broadcast('slots:updated', { bookedSlotId: slot.id });
    res.status(201).json(full);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List bookings (candidate: own; recruiter: for own slots only; admin: all)
router.get('/', async (req, res) => {
  try {
    const { slotId, candidateId, status } = req.query;
    const where = {};
    if (req.user.role === 'candidate') {
      where.candidateId = req.user.id;
    }
    if (req.user.role === 'recruiter') {
      const recruiterSlots = await InterviewSlot.findAll({ where: { recruiterId: req.user.id }, attributes: ['id'] });
      where.slotId = recruiterSlots.map((s) => s.id);
    }
    if (slotId) where.slotId = slotId;
    if (candidateId && (req.user.role === 'admin' || req.user.role === 'recruiter')) {
      where.candidateId = candidateId;
    }
    if (status) where.status = status;
    const bookings = await Booking.findAll({
      where,
      include: [
        { model: InterviewSlot, include: [{ model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] }] },
        { model: User, as: 'Candidate', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: InterviewSlot, include: [{ model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] }] },
        { model: User, as: 'Candidate', attributes: ['id', 'name', 'email'] },
      ],
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (req.user.role === 'candidate' && booking.candidateId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update status (scheduled | completed | cancelled)
router.patch('/:id', async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: InterviewSlot, include: [{ model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] }] },
        { model: User, as: 'Candidate', attributes: ['id', 'name', 'email'] },
      ],
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    const canUpdate = req.user.role === 'admin' ||
      (req.user.role === 'recruiter' && booking.InterviewSlot?.recruiterId === req.user.id) ||
      (req.user.role === 'candidate' && booking.candidateId === req.user.id);
    if (!canUpdate) return res.status(403).json({ error: 'Forbidden' });
    const { status } = req.body;
    if (status && ['scheduled', 'completed', 'cancelled'].includes(status)) {
      if (status === 'cancelled') {
        const slot = await InterviewSlot.findByPk(booking.slotId);
        if (slot) {
          slot.isBooked = false;
          await slot.save();
        }
        const candidate = booking.Candidate;
        if (candidate?.email) {
          await sendCancellation({
            to: candidate.email,
            name: candidate.name,
            slotDate: booking.InterviewSlot?.slotDate,
            startTime: booking.InterviewSlot?.startTime,
          });
        }
      }
      booking.status = status;
      await booking.save();
      const broadcast = req.app.get('broadcast');
      const msg = status === 'cancelled' ? 'Booking cancelled' : status === 'completed' ? 'Interview completed' : 'Booking updated';
      if (broadcast) broadcast('bookings:updated', { message: msg });
      if (broadcast) broadcast('slots:updated', status === 'cancelled' ? { freedSlotId: booking.slotId } : {});
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
