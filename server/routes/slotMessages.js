const express = require('express');
const { InterviewSlot, User, SlotMessage } = require('../models');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(auth);
router.use(requireRole('admin', 'recruiter'));

async function getSlotForMessaging(slotId) {
  return InterviewSlot.findByPk(slotId, {
    include: [{ model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] }],
  });
}

function canAccessSlotMessages(user, slot) {
  return user.role === 'admin' ||
    (user.role === 'recruiter' && slot.recruiterId === user.id);
}

router.get('/', async (req, res) => {
  try {
    const slot = await getSlotForMessaging(req.params.slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found.' });
    if (!canAccessSlotMessages(req.user, slot)) return res.status(403).json({ error: 'Forbidden' });

    const messages = await SlotMessage.findAll({
      where: { slotId: slot.id },
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
    const slot = await getSlotForMessaging(req.params.slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found.' });
    if (!canAccessSlotMessages(req.user, slot)) return res.status(403).json({ error: 'Forbidden' });

    const message = String(req.body?.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Message is required.' });

    const created = await SlotMessage.create({
      slotId: slot.id,
      senderId: req.user.id,
      message,
    });

    const full = await SlotMessage.findByPk(created.id, {
      include: [{ model: User, as: 'Sender', attributes: ['id', 'name', 'email', 'role'] }],
    });

    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      broadcast('slot-messages:updated', {
        slotId: slot.id,
        senderId: req.user.id,
        senderRole: req.user.role,
        message: 'New slot issue message',
      });
    }

    return res.status(201).json(full);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
