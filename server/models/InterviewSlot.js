const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InterviewSlot = sequelize.define('InterviewSlot', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  recruiterId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: true },
  purpose: { type: DataTypes.STRING(500), allowNull: true },
  slotDate: { type: DataTypes.DATEONLY, allowNull: false },
  startTime: { type: DataTypes.TIME, allowNull: false },
  endTime: { type: DataTypes.TIME, allowNull: false },
  durationMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
  maxCandidates: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  isBooked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: 'interview_slots',
  timestamps: true,
});

module.exports = InterviewSlot;
