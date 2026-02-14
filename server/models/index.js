const { sequelize } = require('../config/database');
const User = require('./User');
const InterviewSlot = require('./InterviewSlot');
const Booking = require('./Booking');

// Associations
User.hasMany(InterviewSlot, { foreignKey: 'recruiterId' });
InterviewSlot.belongsTo(User, { foreignKey: 'recruiterId', as: 'Recruiter' });

InterviewSlot.hasMany(Booking, { foreignKey: 'slotId' });
Booking.belongsTo(InterviewSlot, { foreignKey: 'slotId' });

User.hasMany(Booking, { foreignKey: 'candidateId' });
Booking.belongsTo(User, { foreignKey: 'candidateId', as: 'Candidate' });

async function syncDatabase() {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database synced.');
  } catch (err) {
    console.error('Database sync failed:', err.message);
  }
}

module.exports = { sequelize, User, InterviewSlot, Booking, syncDatabase };
