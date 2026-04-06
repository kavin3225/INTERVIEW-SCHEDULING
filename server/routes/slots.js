const express = require('express');
const { Op } = require('sequelize');
const { InterviewSlot, User, Booking, BlockedDate } = require('../models');
const { auth, requireRole } = require('../middleware/auth');
const slotMessagesRoutes = require('./slotMessages');

const router = express.Router();

router.use(auth);
router.use('/:slotId/messages', slotMessagesRoutes);

// Recruiter / Admin: create slot
router.post('/', requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { title, purpose, slotDate, startTime, endTime, durationMinutes, maxCandidates, recruiterId: bodyRecruiterId } = req.body;
    const recruiterId = req.user.role === 'admin' ? (bodyRecruiterId || req.user.id) : req.user.id;

    // ── Required fields ──
    if (!slotDate || !startTime || !endTime) {
      return res.status(400).json({ error: 'slotDate, startTime, and endTime are required.' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    // ── Date format & not in the past ──
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(slotDate)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (slotDate < today) {
      return res.status(400).json({ error: 'Slot date cannot be in the past.' });
    }

    // ── Time format ──
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:MM (24-hour).' });
    }

    // ── End must be after start ──
    if (endTime <= startTime) {
      return res.status(400).json({ error: 'End time must be after start time.' });
    }

    // ── Duration: min 15 min, max 8 hours ──
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (diffMinutes < 15) {
      return res.status(400).json({ error: 'Slot duration must be at least 15 minutes.' });
    }
    if (diffMinutes > 480) {
      return res.status(400).json({ error: 'Slot duration cannot exceed 8 hours.' });
    }

    // ── Business hours: 07:00 – 22:00 ──
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    if (startMinutes < 7 * 60 || endMinutes > 22 * 60) {
      return res.status(400).json({ error: 'Slots must be within business hours (07:00 – 22:00).' });
    }

    // ── Check recruiter availability blocker ──
    const blocked = await BlockedDate.findOne({ where: { recruiterId, blockedDate: slotDate } });
    if (blocked) {
      return res.status(400).json({ error: `You have marked ${slotDate} as unavailable${blocked.reason ? ': ' + blocked.reason : '.'}.` });
    }

    // ── No overlapping slots for same recruiter on same date ──
    const overlapping = await InterviewSlot.findOne({
      where: {
        recruiterId,
        slotDate,
        startTime: { [Op.lt]: endTime },
        endTime:   { [Op.gt]: startTime },
      },
    });
    if (overlapping) {
      return res.status(409).json({
        error: `Time conflict: you already have a slot from ${overlapping.startTime.slice(0,5)} to ${overlapping.endTime.slice(0,5)} on this date.`,
      });
    }

    const duration = durationMinutes ? parseInt(durationMinutes, 10) : diffMinutes;
    const max = maxCandidates ? Math.min(Math.max(parseInt(maxCandidates, 10), 1), 20) : 1;
    const slot = await InterviewSlot.create({
      recruiterId,
      title: title.trim(),
      purpose: purpose?.trim() || null,
      slotDate,
      startTime,
      endTime,
      durationMinutes: duration,
      maxCandidates: max,
      isBooked: false,
    });
    const withRecruiter = await InterviewSlot.findByPk(slot.id, {
      include: [{ model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] }],
    });
    const broadcast = req.app.get('broadcast');
    if (broadcast) broadcast('slots:updated', { message: 'New slot created' });
    res.status(201).json(withRecruiter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List slots (recruiter: own; candidate: available only; admin: all)
router.get('/', async (req, res) => {
  try {
    const { availableOnly, recruiterId, from, to } = req.query;
    const where = {};
    if (req.user.role === 'recruiter') {
      where.recruiterId = req.user.id;
    } else if (req.user.role === 'admin' && recruiterId) {
      where.recruiterId = recruiterId;
    }
    if (availableOnly === 'true') {
      where.isBooked = false;
      where.slotDate = { [Op.gte]: new Date().toISOString().slice(0, 10) };
    }
    if (from) where.slotDate = { ...where.slotDate, [Op.gte]: from };
    if (to) where.slotDate = { ...where.slotDate, [Op.lte]: to };
    const slots = await InterviewSlot.findAll({
      where,
      include: [
        { model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] },
        { model: Booking, include: [{ model: User, as: 'Candidate', attributes: ['id', 'name', 'email'] }] },
      ],
      order: [['slotDate', 'ASC'], ['startTime', 'ASC']],
    });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const slot = await InterviewSlot.findByPk(req.params.id, {
      include: [
        { model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] },
        { model: Booking, include: [{ model: User, as: 'Candidate', attributes: ['id', 'name', 'email'] }] },
      ],
    });
    if (!slot) return res.status(404).json({ error: 'Slot not found.' });
    if (req.user.role === 'recruiter' && slot.recruiterId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(slot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const slot = await InterviewSlot.findByPk(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found.' });
    if (req.user.role === 'recruiter' && slot.recruiterId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { title, purpose, slotDate, startTime, endTime, durationMinutes } = req.body;
    if (title !== undefined) slot.title = title?.trim() || slot.title;
    if (purpose !== undefined) slot.purpose = purpose?.trim() || null;

    const newDate  = slotDate   || slot.slotDate;
    const newStart = startTime  || slot.startTime;
    const newEnd   = endTime    || slot.endTime;

    if (newEnd <= newStart) {
      return res.status(400).json({ error: 'End time must be after start time.' });
    }
    const [sh, sm] = newStart.split(':').map(Number);
    const [eh, em] = newEnd.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 15) return res.status(400).json({ error: 'Slot duration must be at least 15 minutes.' });
    if (diff > 480) return res.status(400).json({ error: 'Slot duration cannot exceed 8 hours.' });
    if (sh * 60 + sm < 7 * 60 || eh * 60 + em > 22 * 60) {
      return res.status(400).json({ error: 'Slots must be within business hours (07:00 – 22:00).' });
    }

    const overlap = await InterviewSlot.findOne({
      where: {
        recruiterId: slot.recruiterId,
        slotDate: newDate,
        id: { [Op.ne]: slot.id },
        startTime: { [Op.lt]: newEnd },
        endTime:   { [Op.gt]: newStart },
      },
    });
    if (overlap) {
      return res.status(409).json({
        error: `Time conflict: slot ${overlap.startTime.slice(0,5)}–${overlap.endTime.slice(0,5)} already exists on this date.`,
      });
    }

    if (slotDate !== undefined) slot.slotDate = slotDate;
    if (startTime !== undefined) slot.startTime = startTime;
    if (endTime !== undefined) slot.endTime = endTime;
    if (durationMinutes !== undefined) slot.durationMinutes = parseInt(durationMinutes, 10);
    else slot.durationMinutes = diff;
    await slot.save();
    const broadcast = req.app.get('broadcast');
    if (broadcast) broadcast('slots:updated', { message: 'Slot updated' });
    res.json(slot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const slot = await InterviewSlot.findByPk(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found.' });
    if (req.user.role === 'recruiter' && slot.recruiterId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const linkedBookings = await Booking.findAll({
      where: { slotId: slot.id },
      attributes: ['id', 'status'],
    });
    const hasActiveBooking = linkedBookings.some((b) => b.status === 'scheduled');
    if (slot.isBooked || hasActiveBooking) {
      return res.status(400).json({ error: 'Slots with active bookings cannot be deleted.' });
    }

    if (linkedBookings.length > 0) {
      await Booking.destroy({ where: { slotId: slot.id } });
    }

    await slot.destroy();
    const broadcast = req.app.get('broadcast');
    if (broadcast) broadcast('slots:updated', { message: 'Slot deleted' });
    if (broadcast && linkedBookings.length > 0) {
      broadcast('bookings:updated', { message: 'Bookings updated after slot deletion' });
    }
    res.json({ message: 'Slot deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
