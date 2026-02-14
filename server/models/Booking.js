const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Booking = sequelize.define('Booking', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  slotId: { type: DataTypes.INTEGER, allowNull: false },
  candidateId: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM('scheduled', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'scheduled',
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'bookings',
  timestamps: true,
});

module.exports = Booking;
