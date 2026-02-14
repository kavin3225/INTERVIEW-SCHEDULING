/**
 * Adds the `purpose` column to interview_slots if it doesn't exist.
 * Run once to fix: SQLITE_ERROR: table interview_slots has no column named purpose
 */
const { sequelize } = require('../config/database');

async function addPurposeColumnIfMissing() {
  try {
    const [results] = await sequelize.query("PRAGMA table_info(interview_slots)");
    const hasPurpose = results.some((col) => col.name === 'purpose');
    if (!hasPurpose) {
      await sequelize.query('ALTER TABLE interview_slots ADD COLUMN purpose VARCHAR(500)');
      console.log('Added "purpose" column to interview_slots.');
    }
  } catch (err) {
    console.error('addPurposeColumn failed:', err.message);
    throw err;
  }
}

module.exports = { addPurposeColumnIfMissing };

if (require.main === module) {
  require('dotenv').config();
  addPurposeColumnIfMissing()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
