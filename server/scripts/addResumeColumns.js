/**
 * Adds resume-related columns to bookings if they don't exist.
 * Fixes: SQLITE_ERROR: table bookings has no column named resumeUrl
 */
const { sequelize } = require('../config/database');

async function addResumeColumnsIfMissing() {
  try {
    const [results] = await sequelize.query('PRAGMA table_info(bookings)');
    const hasResumeUrl = results.some((col) => col.name === 'resumeUrl');
    const hasResumeFileName = results.some((col) => col.name === 'resumeFileName');

    if (!hasResumeUrl) {
      await sequelize.query('ALTER TABLE bookings ADD COLUMN resumeUrl TEXT');
      console.log('Added "resumeUrl" column to bookings.');
    }

    if (!hasResumeFileName) {
      await sequelize.query('ALTER TABLE bookings ADD COLUMN resumeFileName VARCHAR(255)');
      console.log('Added "resumeFileName" column to bookings.');
    }
  } catch (err) {
    console.error('addResumeColumnsIfMissing failed:', err.message);
    throw err;
  }
}

module.exports = { addResumeColumnsIfMissing };

if (require.main === module) {
  require('dotenv').config();
  addResumeColumnsIfMissing()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
