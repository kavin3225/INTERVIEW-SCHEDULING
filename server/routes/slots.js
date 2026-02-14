const express = require('express');
const { Op } = require('sequelize');
const { InterviewSlot, User, Booking } = require('../models');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Recruiter / Admin: create slot
router.post('/', requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { title, purpose, slotDate, startTime, endTime, durationMinutes, recruiterId: bodyRecruiterId } = req.body;
    const recruiterId = req.user.role === 'admin' ? (bodyRecruiterId || req.user.id) : req.user.id;
    if (!slotDate || !startTime || !endTime) {
      return res.status(400).json({ error: 'slotDate, startTime, and endTime are required.' });
    }
    const duration = durationMinutes ? parseInt(durationMinutes, 10) : 30;
    const slot = await InterviewSlot.create({
      recruiterId,
      title: title || null,
      purpose: purpose || null,
      slotDate,
      startTime,
      endTime,
      durationMinutes: duration,
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
      include: [{ model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] }],
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
    if (title !== undefined) slot.title = title;
    if (purpose !== undefined) slot.purpose = purpose || null;
    if (slotDate !== undefined) slot.slotDate = slotDate;
    if (startTime !== undefined) slot.startTime = startTime;
    if (endTime !== undefined) slot.endTime = endTime;
    if (durationMinutes !== undefined) slot.durationMinutes = parseInt(durationMinutes, 10);
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
    await slot.destroy();
    const broadcast = req.app.get('broadcast');
    if (broadcast) broadcast('slots:updated', { message: 'Slot deleted' });
    res.json({ message: 'Slot deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
