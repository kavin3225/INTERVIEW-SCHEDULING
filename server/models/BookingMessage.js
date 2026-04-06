const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BookingMessage = sequelize.define('BookingMessage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  bookingId: { type: DataTypes.INTEGER, allowNull: false },
  senderId: { type: DataTypes.INTEGER, allowNull: false },
  visibility: {
    type: DataTypes.ENUM('participant', 'admin'),
    allowNull: false,
    defaultValue: 'participant',
  },
  message: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: 'booking_messages',
  timestamps: true,
});

module.exports = BookingMessage;
