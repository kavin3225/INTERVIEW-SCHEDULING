const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Op } = require('sequelize');
const { Booking, InterviewSlot, User, BookingMessage, sequelize } = require('../models');
const { auth, requireRole } = require('../middleware/auth');
const { sendBookingConfirmation, sendCancellation } = require('../services/emailService');
const bookingMessagesRoutes = require('./bookingMessages');

const router = express.Router();

router.use(auth);
router.use('/:bookingId/messages', bookingMessagesRoutes);

const resumesDir = path.join(__dirname, '..', 'uploads', 'resumes');
fs.mkdirSync(resumesDir, { recursive: true });

const resumeUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, resumesDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const base = path.basename(file.originalname || 'resume', ext).replace(/[^a-zA-Z0-9-_]/g, '_');
      cb(null, `${Date.now()}-${base || 'resume'}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMime = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExt = ['.pdf', '.doc', '.docx'];
    if (allowedMime.includes(file.mimetype) || allowedExt.includes(ext)) return cb(null, true);
    return cb(new Error('Only PDF, DOC, and DOCX files are allowed.'));
  },
});

function handleResumeUpload(req, res, next) {
  resumeUpload.single('resume')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Resume file too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: err.message || 'Invalid resume upload.' });
  });
}

function removeUploadedFile(file) {
  if (!file?.path) return;
  fs.unlink(file.path, () => {});
}

async function getBookingWithRelations(bookingId) {
  return Booking.findByPk(bookingId, {
    include: [
      { model: InterviewSlot, include: [{ model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] }] },
      { model: User, as: 'Candidate', attributes: ['id', 'name', 'email'] },
    ],
  });
}

function sanitizeBookingForViewer(viewer, booking) {
  if (viewer.role === 'candidate' && booking.candidateId === viewer.id) {
    return booking;
  }

  const plain = typeof booking.toJSON === 'function' ? booking.toJSON() : { ...booking };
  plain.Candidate = {
    id: plain.candidateId || plain.Candidate?.id || null,
    name: 'Private Candidate',
    email: null,
  };
  plain.resumeUrl = null;
  plain.resumeFileName = null;
  return plain;
}

function canAccessBooking(user, booking) {
  return user.role === 'admin' ||
    (user.role === 'recruiter' && booking.InterviewSlot?.recruiterId === user.id) ||
    (user.role === 'candidate' && booking.candidateId === user.id);
}

function canViewCandidateResume(user, booking) {
  return user.role === 'candidate' && booking.candidateId === user.id;
}

// Candidate books a slot
router.post('/', requireRole('candidate'), handleResumeUpload, async (req, res) => {
  try {
    const slotId = Number(req.body.slotId);
    const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : '';
    if (!slotId) return res.status(400).json({ error: 'slotId is required.' });
    const slot = await InterviewSlot.findByPk(slotId, {
      include: [{ model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] }],
    });
    if (!slot) {
      removeUploadedFile(req.file);
      return res.status(404).json({ error: 'Slot not found.' });
    }
    if (slot.slotDate < new Date().toISOString().slice(0, 10)) {
      removeUploadedFile(req.file);
      return res.status(400).json({ error: 'Cannot book past slots.' });
    }
    const existingSlotBooking = await Booking.findOne({
      where: {
        slotId,
        candidateId: req.user.id,
        status: { [Op.ne]: 'cancelled' },
      },
    });
    if (existingSlotBooking) {
      removeUploadedFile(req.file);
      return res.status(409).json({ error: 'You have already booked this slot.' });
    }

    const existingScheduledBooking = await Booking.findOne({
      where: {
        candidateId: req.user.id,
        status: 'scheduled',
      },
      include: [{
        model: InterviewSlot,
        where: {
          slotDate: slot.slotDate,
          startTime: slot.startTime,
        },
        attributes: ['id'],
      }],
    });
    if (existingScheduledBooking) {
      removeUploadedFile(req.file);
      return res.status(409).json({ error: 'You already have an interview booked at this time.' });
    }

    // Group slot capacity check
    const max = slot.maxCandidates || 1;
    const activeCount = await Booking.count({ where: { slotId, status: { [Op.ne]: 'cancelled' } } });
    if (activeCount >= max) {
      removeUploadedFile(req.file);
      return res.status(400).json({ error: max === 1 ? 'Slot is already booked.' : 'This slot is fully booked.' });
    }
    const booking = await Booking.create({
      slotId,
      candidateId: req.user.id,
      status: 'scheduled',
      notes: notes || null,
      resumeUrl: req.file ? `/uploads/resumes/${req.file.filename}` : null,
      resumeFileName: req.file?.originalname || null,
    });
    slot.isBooked = (activeCount + 1) >= max;
    await slot.save();
    const recruiter = slot.Recruiter;
    await sendBookingConfirmation({
      candidateEmail: req.user.email,
      candidateName: req.user.name,
      slotDate: slot.slotDate,
      startTime: slot.startTime,
      recruiterName: recruiter ? recruiter.name : 'Recruiter',
    });
    const full = await getBookingWithRelations(booking.id);
    const broadcast = req.app.get('broadcast');
    if (broadcast) broadcast('bookings:updated', { message: 'Slot booked successfully' });
    if (broadcast) broadcast('slots:updated', { bookedSlotId: slot.id });
    res.status(201).json(full);
  } catch (err) {
    removeUploadedFile(req.file);
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
    res.json(bookings.map((booking) => sanitizeBookingForViewer(req.user, booking)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const booking = await getBookingWithRelations(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (!canAccessBooking(req.user, booking)) return res.status(403).json({ error: 'Forbidden' });
    res.json(sanitizeBookingForViewer(req.user, booking));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stream resume file for authorized users
router.get('/:id/resume', async (req, res) => {
  try {
    const booking = await getBookingWithRelations(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (!canViewCandidateResume(req.user, booking)) return res.status(403).json({ error: 'Forbidden' });
    if (!booking.resumeUrl) return res.status(404).json({ error: 'Resume not uploaded for this booking.' });

    const fileName = path.basename(booking.resumeUrl);
    const filePath = path.join(resumesDir, fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Resume file not found.' });

    res.setHeader('Content-Disposition', `inline; filename="${booking.resumeFileName || fileName}"`);
    return res.sendFile(filePath);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/reschedule', async (req, res) => {
  const tx = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: InterviewSlot, include: [{ model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] }] },
        { model: User, as: 'Candidate', attributes: ['id', 'name', 'email'] },
      ],
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    if (!booking) { await tx.rollback(); return res.status(404).json({ error: 'Booking not found.' }); }
    if (!canAccessBooking(req.user, booking)) { await tx.rollback(); return res.status(403).json({ error: 'Forbidden' }); }
    if (booking.status !== 'scheduled') { await tx.rollback(); return res.status(400).json({ error: 'Only scheduled bookings can be rescheduled.' }); }

    const newSlotId = Number(req.body?.newSlotId);
    if (!newSlotId) { await tx.rollback(); return res.status(400).json({ error: 'newSlotId is required.' }); }
    if (newSlotId === booking.slotId) { await tx.rollback(); return res.status(400).json({ error: 'Choose a different slot to reschedule.' }); }

    const [currentSlot, newSlot] = await Promise.all([
      InterviewSlot.findByPk(booking.slotId, { transaction: tx, lock: tx.LOCK.UPDATE }),
      InterviewSlot.findByPk(newSlotId, {
        include: [{ model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] }],
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      }),
    ]);

    if (!currentSlot) { await tx.rollback(); return res.status(404).json({ error: 'Current slot not found.' }); }
    if (!newSlot) { await tx.rollback(); return res.status(404).json({ error: 'New slot not found.' }); }
    if (newSlot.isBooked) { await tx.rollback(); return res.status(400).json({ error: 'Selected slot is already booked.' }); }
    if (newSlot.slotDate < new Date().toISOString().slice(0, 10)) { await tx.rollback(); return res.status(400).json({ error: 'Cannot reschedule to a past slot.' }); }

    // Free up current slot
    const currentActiveCount = await Booking.count({
      where: { slotId: currentSlot.id, status: { [Op.ne]: 'cancelled' }, id: { [Op.ne]: booking.id } },
      transaction: tx,
    });
    currentSlot.isBooked = currentActiveCount >= (currentSlot.maxCandidates || 1);

    // Fill new slot
    const newActiveCount = await Booking.count({ where: { slotId: newSlot.id, status: { [Op.ne]: 'cancelled' } }, transaction: tx });
    newSlot.isBooked = (newActiveCount + 1) >= (newSlot.maxCandidates || 1);
    booking.slotId = newSlot.id;

    await Promise.all([
      currentSlot.save({ transaction: tx }),
      newSlot.save({ transaction: tx }),
      booking.save({ transaction: tx }),
    ]);
    await tx.commit();

    const recruiter = newSlot.Recruiter;
    const candidate = booking.Candidate;
    if (candidate?.email) {
      await sendBookingConfirmation({
        candidateEmail: candidate.email,
        candidateName: candidate.name,
        slotDate: newSlot.slotDate,
        startTime: newSlot.startTime,
        recruiterName: recruiter ? recruiter.name : 'Recruiter',
      });
    }

    const full = await getBookingWithRelations(booking.id);
    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      broadcast('bookings:updated', { message: 'Booking rescheduled' });
      broadcast('slots:updated', { message: 'Slot availability changed after reschedule' });
    }
    return res.json(sanitizeBookingForViewer(req.user, full));
  } catch (err) {
    await tx.rollback();
    return res.status(500).json({ error: err.message });
  }
});

// Update status (scheduled | completed | cancelled)
router.patch('/:id', async (req, res) => {
  try {
    const booking = await getBookingWithRelations(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (!canAccessBooking(req.user, booking)) return res.status(403).json({ error: 'Forbidden' });
    const { status } = req.body;
    if (status && ['scheduled', 'completed', 'cancelled'].includes(status)) {
      if (status === 'cancelled') {
        const slot = await InterviewSlot.findByPk(booking.slotId);
        if (slot) {
          const remaining = await Booking.count({
            where: { slotId: slot.id, status: { [Op.ne]: 'cancelled' }, id: { [Op.ne]: booking.id } },
          });
          slot.isBooked = remaining >= (slot.maxCandidates || 1);
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
    res.json(sanitizeBookingForViewer(req.user, booking));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const tx = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: InterviewSlot, include: [{ model: User, as: 'Recruiter', attributes: ['id', 'name', 'email'] }] },
        { model: User, as: 'Candidate', attributes: ['id', 'name', 'email'] },
      ],
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    if (!booking) {
      await tx.rollback();
      return res.status(404).json({ error: 'Booking not found.' });
    }
    if (!canAccessBooking(req.user, booking)) {
      await tx.rollback();
      return res.status(403).json({ error: 'Forbidden' });
    }

    const slot = await InterviewSlot.findByPk(booking.slotId, {
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    await BookingMessage.destroy({
      where: { bookingId: booking.id },
      transaction: tx,
    });

    await booking.destroy({ transaction: tx });

    if (slot) {
      const remaining = await Booking.count({
        where: { slotId: slot.id, status: { [Op.ne]: 'cancelled' } },
        transaction: tx,
      });
      slot.isBooked = remaining >= (slot.maxCandidates || 1);
      await slot.save({ transaction: tx });
    }

    await tx.commit();

    removeUploadedFile(booking.resumeUrl ? { path: path.join(resumesDir, path.basename(booking.resumeUrl)) } : null);

    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      broadcast('bookings:updated', { message: 'Booking deleted' });
      broadcast('slots:updated', { message: 'Slot availability changed after booking deletion' });
    }

    return res.json({ message: 'Booking deleted successfully.' });
  } catch (err) {
    await tx.rollback();
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
