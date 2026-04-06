const express = require('express');
const { BlockedDate } = require('../models');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Get blocked dates for the logged-in recruiter (or all for admin)
router.get('/', async (req, res) => {
  try {
    const where = req.user.role === 'admin' ? {} : { recruiterId: req.user.id };
    const dates = await BlockedDate.findAll({ where, order: [['blockedDate', 'ASC']] });
    res.json(dates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Block a date
router.post('/', requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { blockedDate, reason } = req.body;
    if (!blockedDate) return res.status(400).json({ error: 'blockedDate is required.' });
    const today = new Date().toISOString().slice(0, 10);
    if (blockedDate < today) return res.status(400).json({ error: 'Cannot block a past date.' });
    const [record, created] = await BlockedDate.findOrCreate({
      where: { recruiterId: req.user.id, blockedDate },
      defaults: { reason: reason?.trim() || null },
    });
    if (!created) return res.status(409).json({ error: 'This date is already blocked.' });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unblock a date
router.delete('/:id', requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const record = await BlockedDate.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: 'Blocked date not found.' });
    if (req.user.role === 'recruiter' && record.recruiterId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await record.destroy();
    res.json({ message: 'Date unblocked.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
