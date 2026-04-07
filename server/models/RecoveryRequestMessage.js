const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RecoveryRequestMessage = sequelize.define('RecoveryRequestMessage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  recoveryRequestId: { type: DataTypes.INTEGER, allowNull: false },
  senderId: { type: DataTypes.INTEGER, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: 'recovery_request_messages',
  timestamps: true,
});

module.exports = RecoveryRequestMessage;
