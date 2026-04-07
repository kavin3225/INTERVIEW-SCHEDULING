/**
 * Adds the `mobileNumber` column to recovery_requests if it doesn't exist.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

async function addRecoveryRequestMobileNumberColumnIfMissing() {
  try {
    const dialect = sequelize.getDialect();
    const columnName = 'mobileNumber';

    if (dialect === 'sqlite') {
      const [results] = await sequelize.query('PRAGMA table_info(recovery_requests)');
      const hasColumn = results.some((column) => column.name === columnName);
      if (!hasColumn) {
        await sequelize.query('ALTER TABLE recovery_requests ADD COLUMN mobileNumber VARCHAR(20)');
        console.log('Added "mobileNumber" column to recovery_requests.');
      }
      return;
    }

    const tableDescription = await sequelize.getQueryInterface().describeTable('recovery_requests');
    if (!tableDescription[columnName]) {
      await sequelize.getQueryInterface().addColumn('recovery_requests', columnName, {
        type: DataTypes.STRING(20),
        allowNull: true,
      });
      console.log('Added "mobileNumber" column to recovery_requests.');
    }
  } catch (err) {
    console.error('Unable to ensure recovery_requests.mobileNumber column exists:', err.message);
    throw err;
  }
}

module.exports = { addRecoveryRequestMobileNumberColumnIfMissing };

if (require.main === module) {
  require('dotenv').config();
  addRecoveryRequestMobileNumberColumnIfMissing()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
