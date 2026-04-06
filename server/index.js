require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { Server } = require('socket.io');
const { syncDatabase, InterviewSlot, Booking, User, BlockedDate, BookingMessage, SlotMessage } = require('./models');
const { runDefaultSlotSeed } = require('./scripts/seedSlots');
const { addPurposeColumnIfMissing } = require('./scripts/addPurposeColumn');
const { addMaxCandidatesColumnIfMissing } = require('./scripts/addMaxCandidatesColumn');
const { addResumeColumnsIfMissing } = require('./scripts/addResumeColumns');
const { sendReminder } = require('./services/emailService');

const authRoutes = require('./routes/auth');
const slotRoutes = require('./routes/slots');
const bookingRoutes = require('./routes/bookings');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const blockedDatesRoutes = require('./routes/blockedDates');

const app = express();
const server = http.createServer(app);
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
const uploadsPath = path.join(__dirname, 'uploads');

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'] },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(uploadsPath));

app.use('/api/auth', authRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blocked-dates', blockedDatesRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDistPath));
  app.get(/^\/(?!api|socket\.io|uploads).*/, (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

function broadcastEvent(event, payload) {
  io.emit(event, payload || {});
}

app.set('io', io);
app.set('broadcast', broadcastEvent);

// 24-hour email reminder cron (runs daily at 08:00)
cron.schedule('0 8 * * *', async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const bookings = await Booking.findAll({
      where: { status: 'scheduled' },
      include: [
        { model: InterviewSlot, where: { slotDate: tomorrowStr }, attributes: ['slotDate', 'startTime'] },
        { model: User, as: 'Candidate', attributes: ['name', 'email'] },
      ],
    });
    for (const b of bookings) {
      if (b.Candidate?.email) {
        await sendReminder({
          to: b.Candidate.email,
          name: b.Candidate.name,
          slotDate: b.InterviewSlot.slotDate,
          startTime: b.InterviewSlot.startTime,
        });
      }
    }
    console.log(`[Reminder] Sent ${bookings.length} reminder(s) for ${tomorrowStr}`);
  } catch (err) {
    console.error('[Reminder cron error]', err.message);
  }
});

const PORT = process.env.PORT || 5000;

syncDatabase()
  .then(() => BlockedDate.sync())
  .then(() => BookingMessage.sync())
  .then(() => SlotMessage.sync())
  .then(() => addPurposeColumnIfMissing())
  .then(() => addMaxCandidatesColumnIfMissing())
  .then(() => addResumeColumnsIfMissing())
  .then(() => InterviewSlot.count())
  .then((count) => {
    if (count === 0) return runDefaultSlotSeed();
  })
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Server startup failed:', err);
    process.exit(1);
  });

module.exports = { app, server, io, broadcastEvent };
