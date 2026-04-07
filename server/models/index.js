const { sequelize } = require('../config/database');
const User = require('./User');
const InterviewSlot = require('./InterviewSlot');
const Booking = require('./Booking');
const BlockedDate = require('./BlockedDate');
const BookingMessage = require('./BookingMessage');
const SlotMessage = require('./SlotMessage');
const RecoveryRequest = require('./RecoveryRequest');
const RecoveryRequestMessage = require('./RecoveryRequestMessage');

// Associations
User.hasMany(InterviewSlot, { foreignKey: 'recruiterId' });
InterviewSlot.belongsTo(User, { foreignKey: 'recruiterId', as: 'Recruiter' });

InterviewSlot.hasMany(Booking, { foreignKey: 'slotId' });
Booking.belongsTo(InterviewSlot, { foreignKey: 'slotId' });

User.hasMany(Booking, { foreignKey: 'candidateId' });
Booking.belongsTo(User, { foreignKey: 'candidateId', as: 'Candidate' });

User.hasMany(BlockedDate, { foreignKey: 'recruiterId' });
BlockedDate.belongsTo(User, { foreignKey: 'recruiterId', as: 'Recruiter' });

Booking.hasMany(BookingMessage, { foreignKey: 'bookingId' });
BookingMessage.belongsTo(Booking, { foreignKey: 'bookingId' });

User.hasMany(BookingMessage, { foreignKey: 'senderId' });
BookingMessage.belongsTo(User, { foreignKey: 'senderId', as: 'Sender' });

InterviewSlot.hasMany(SlotMessage, { foreignKey: 'slotId' });
SlotMessage.belongsTo(InterviewSlot, { foreignKey: 'slotId' });

User.hasMany(SlotMessage, { foreignKey: 'senderId' });
SlotMessage.belongsTo(User, { foreignKey: 'senderId', as: 'Sender' });

User.hasMany(RecoveryRequest, { foreignKey: 'candidateId' });
RecoveryRequest.belongsTo(User, { foreignKey: 'candidateId', as: 'Candidate' });

RecoveryRequest.hasMany(RecoveryRequestMessage, { foreignKey: 'recoveryRequestId', as: 'Messages' });
RecoveryRequestMessage.belongsTo(RecoveryRequest, { foreignKey: 'recoveryRequestId' });

User.hasMany(RecoveryRequestMessage, { foreignKey: 'senderId' });
RecoveryRequestMessage.belongsTo(User, { foreignKey: 'senderId', as: 'Sender' });

async function syncDatabase() {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database synced.');
  } catch (err) {
    console.error('Database sync failed:', err.message);
  }
}

module.exports = {
  sequelize,
  User,
  InterviewSlot,
  Booking,
  BlockedDate,
  BookingMessage,
  SlotMessage,
  RecoveryRequest,
  RecoveryRequestMessage,
  syncDatabase,
};
