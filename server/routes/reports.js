const express = require('express');
const { Op } = require('sequelize');
const { Booking, InterviewSlot, User } = require('../models');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(auth);
router.use(requireRole('admin', 'recruiter'));

router.get('/overview', async (req, res) => {
  try {
    const { from, to } = req.query;
    const whereSlot = {};
    if (req.user.role === 'recruiter') whereSlot.recruiterId = req.user.id;
    if (from) whereSlot.slotDate = { ...whereSlot.slotDate, [Op.gte]: from };
    if (to) whereSlot.slotDate = { ...whereSlot.slotDate, [Op.lte]: to };
    const slots = await InterviewSlot.findAll({ where: whereSlot, attributes: ['id'] });
    const slotIds = slots.map((s) => s.id);
    const bookings = await Booking.findAll({
      where: { slotId: slotIds },
      include: [
        { model: InterviewSlot, attributes: ['slotDate', 'startTime'] },
        { model: User, as: 'Candidate', attributes: ['name', 'email'] },
      ],
    });
    const scheduled = bookings.filter((b) => b.status === 'scheduled').length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    res.json({
      totalSlots: slots.length,
      totalBookings: bookings.length,
      scheduled,
      completed,
      cancelled,
      bookings: bookings.map((b) => ({
        id: b.id,
        status: b.status,
        slotDate: b.InterviewSlot?.slotDate,
        startTime: b.InterviewSlot?.startTime,
        candidateName: b.Candidate?.name,
        candidateEmail: b.Candidate?.email,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
