/**
 * Adds the `maxCandidates` column to interview_slots if it doesn't exist.
 * Fixes: SQLITE_ERROR: no such column: maxCandidates
 */
const { sequelize } = require('../config/database');

async function addMaxCandidatesColumnIfMissing() {
  try {
    const [results] = await sequelize.query('PRAGMA table_info(interview_slots)');
    const hasMaxCandidates = results.some((col) => col.name === 'maxCandidates');
    if (!hasMaxCandidates) {
      await sequelize.query('ALTER TABLE interview_slots ADD COLUMN maxCandidates INTEGER NOT NULL DEFAULT 1');
      console.log('Added "maxCandidates" column to interview_slots.');
    }
  } catch (err) {
    console.error('addMaxCandidatesColumnIfMissing failed:', err.message);
    throw err;
  }
}

module.exports = { addMaxCandidatesColumnIfMissing };

if (require.main === module) {
  require('dotenv').config();
  addMaxCandidatesColumnIfMissing()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
