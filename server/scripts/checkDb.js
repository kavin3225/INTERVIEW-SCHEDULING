require('dotenv').config();
const { sequelize } = require('../config/database');

async function check() {
  try {
    await sequelize.authenticate();
    console.log('Database connection OK.');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Database connection failed:', err.message);
    if (err.original?.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nTip: Set DB_USER and DB_PASSWORD in .env to match your MySQL user.');
    }
    process.exit(1);
  }
}

check();
