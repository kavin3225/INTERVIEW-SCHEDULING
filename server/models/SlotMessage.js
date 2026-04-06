const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SlotMessage = sequelize.define('SlotMessage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  slotId: { type: DataTypes.INTEGER, allowNull: false },
  senderId: { type: DataTypes.INTEGER, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: 'slot_messages',
  timestamps: true,
});

module.exports = SlotMessage;
