require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { syncDatabase, InterviewSlot } = require('./models');
const { runDefaultSlotSeed } = require('./scripts/seedSlots');
const { addPurposeColumnIfMissing } = require('./scripts/addPurposeColumn');

const authRoutes = require('./routes/auth');
const slotRoutes = require('./routes/slots');
const bookingRoutes = require('./routes/bookings');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'] },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Realtime: broadcast slot/booking changes so all clients can refresh
function broadcastEvent(event, payload) {
  io.emit(event, payload || {});
}

// Attach io and broadcast to req so routes can emit
app.set('io', io);
app.set('broadcast', broadcastEvent);

const PORT = process.env.PORT || 5000;

syncDatabase()
  .then(() => addPurposeColumnIfMissing())
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
