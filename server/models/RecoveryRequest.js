const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RecoveryRequest = sequelize.define('RecoveryRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  candidateName: { type: DataTypes.STRING(255), allowNull: false },
  currentEmail: { type: DataTypes.STRING(255), allowNull: true },
  contactEmail: { type: DataTypes.STRING(255), allowNull: true },
  requestedEmail: { type: DataTypes.STRING(255), allowNull: true },
  requestedPassword: { type: DataTypes.STRING(255), allowNull: true },
  note: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'resolved'),
    allowNull: false,
    defaultValue: 'pending',
  },
}, {
  tableName: 'recovery_requests',
  timestamps: true,
});

module.exports = RecoveryRequest;
