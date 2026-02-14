require('dotenv').config();
const { sequelize, User, InterviewSlot } = require('../models');

const DEFAULT_RECRUITER_EMAIL = process.env.DEFAULT_RECRUITER_EMAIL || 'recruiter@example.com';
const DEFAULT_RECRUITER_PASSWORD = process.env.DEFAULT_RECRUITER_PASSWORD || 'recruiter123';
const DEFAULT_RECRUITER_NAME = process.env.DEFAULT_RECRUITER_NAME || 'Default Recruiter';

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Creates default recruiter (if none) and default slots. Call when slot count is 0. */
async function runDefaultSlotSeed() {
  let recruiter = await User.findOne({ where: { role: 'recruiter' } });
  if (!recruiter) {
    recruiter = await User.findOne({ where: { role: 'admin' } });
  }
  if (!recruiter) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(DEFAULT_RECRUITER_PASSWORD, 10);
    recruiter = await User.create({
      email: DEFAULT_RECRUITER_EMAIL,
      password: hashedPassword,
      name: DEFAULT_RECRUITER_NAME,
      role: 'recruiter',
    });
    console.log('Default recruiter created:', recruiter.email);
  }

  const today = new Date().toISOString().slice(0, 10);
  const defaultSlots = [
    { slotDate: addDays(today, 1), startTime: '09:00', endTime: '09:30', title: 'Technical Round', purpose: 'Frontend / React discussion' },
    { slotDate: addDays(today, 1), startTime: '10:00', endTime: '10:30', title: 'Technical Round', purpose: 'Backend / Node.js discussion' },
    { slotDate: addDays(today, 1), startTime: '14:00', endTime: '14:30', title: 'HR Round', purpose: 'Culture fit and expectations' },
    { slotDate: addDays(today, 2), startTime: '09:00', endTime: '09:30', title: 'Technical Round', purpose: 'System design and problem solving' },
    { slotDate: addDays(today, 2), startTime: '11:00', endTime: '11:30', title: 'HR Round', purpose: 'Compensation and benefits' },
    { slotDate: addDays(today, 3), startTime: '10:00', endTime: '10:30', title: 'Technical Round', purpose: 'Full-stack interview' },
    { slotDate: addDays(today, 3), startTime: '15:00', endTime: '15:30', title: 'Final Round', purpose: 'Manager conversation' },
  ];

  for (const s of defaultSlots) {
    await InterviewSlot.create({
      recruiterId: recruiter.id,
      title: s.title,
      purpose: s.purpose,
      slotDate: s.slotDate,
      startTime: s.startTime,
      endTime: s.endTime,
      durationMinutes: 30,
      isBooked: false,
    });
  }
  console.log('Default slots created:', defaultSlots.length);
}

async function seedDefaultSlots() {
  await sequelize.sync({ alter: true });
  const slotCount = await InterviewSlot.count();
  if (slotCount > 0) {
    console.log('Slots already exist, skipping default slot seed.');
    return;
  }
  await runDefaultSlotSeed();
}

module.exports = { seedDefaultSlots, runDefaultSlotSeed };

if (require.main === module) {
  seedDefaultSlots()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
