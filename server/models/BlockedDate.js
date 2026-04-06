const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BlockedDate = sequelize.define('BlockedDate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  recruiterId: { type: DataTypes.INTEGER, allowNull: false },
  blockedDate: { type: DataTypes.DATEONLY, allowNull: false },
  reason: { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'blocked_dates',
  timestamps: true,
  indexes: [{ unique: true, fields: ['recruiterId', 'blockedDate'] }],
});

module.exports = BlockedDate;
