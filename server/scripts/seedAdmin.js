require('dotenv').config();
const { sequelize, User } = require('../models');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Administrator';

async function seed() {
  try {
    await sequelize.sync({ alter: true });
    await sequelize.authenticate();
    const existing = await User.findOne({ where: { role: 'admin' } });
    if (existing) {
      console.log('Admin user already exists:', existing.email);
      process.exit(0);
      return;
    }
    const admin = await User.create({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
      role: 'admin',
    });
    console.log('Admin user created:', admin.email);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
