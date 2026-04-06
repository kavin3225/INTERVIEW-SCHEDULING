const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
require('dotenv').config();

const useSqlite = process.env.USE_SQLITE === 'true' || process.env.DB_USE_SQLITE === 'true';

if (useSqlite) {
  const storagePath = process.env.SQLITE_STORAGE_PATH || path.join(__dirname, '..', 'data', 'scheduler.sqlite');
  const dir = path.dirname(storagePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const sequelize = useSqlite
  ? new Sequelize({
      dialect: 'sqlite',
      storage: process.env.SQLITE_STORAGE_PATH || path.join(__dirname, '..', 'data', 'scheduler.sqlite'),
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
    })
  : new Sequelize(
      process.env.DB_NAME || 'interview_scheduler',
      process.env.DB_USER || 'root',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
      }
    );

module.exports = { sequelize };
