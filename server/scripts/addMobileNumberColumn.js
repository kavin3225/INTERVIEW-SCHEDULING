/**
 * Adds the `mobileNumber` column to users if it doesn't exist.
 */
const { sequelize } = require('../config/database');

async function addMobileNumberColumnIfMissing() {
  try {
    const dialect = sequelize.getDialect();
    const columnName = 'mobileNumber';

    if (dialect === 'sqlite') {
      const [results] = await sequelize.query('PRAGMA table_info(users)');
      const hasColumn = results.some((column) => column.name === columnName);
      if (!hasColumn) {
        await sequelize.query('ALTER TABLE users ADD COLUMN mobileNumber VARCHAR(20)');
        console.log('Added "mobileNumber" column to users.');
      }
      return;
    }

    const tableDescription = await sequelize.getQueryInterface().describeTable('users');
    if (!tableDescription[columnName]) {
      await sequelize.getQueryInterface().addColumn('users', columnName, {
        type: require('sequelize').DataTypes.STRING(20),
        allowNull: true,
      });
      console.log('Added "mobileNumber" column to users.');
    }
  } catch (err) {
    console.error('Unable to ensure mobileNumber column exists:', err.message);
    throw err;
  }
}

module.exports = { addMobileNumberColumnIfMissing };

if (require.main === module) {
  require('dotenv').config();
  addMobileNumberColumnIfMissing()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
