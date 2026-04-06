require('dotenv').config();
const { sequelize, User } = require('../models');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kavin.admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Administrator';

async function seed() {
  try {
    await sequelize.authenticate();
    await User.sync();
    const existingByEmail = await User.findOne({ where: { email: ADMIN_EMAIL } });
    if (existingByEmail) {
      existingByEmail.password = ADMIN_PASSWORD;
      existingByEmail.name = ADMIN_NAME;
      existingByEmail.role = 'admin';
      await existingByEmail.save({ hooks: true });
      console.log('Admin user updated:', existingByEmail.email);
      process.exit(0);
      return;
    }

    const existingAdmin = await User.findOne({ where: { role: 'admin' } });
    if (existingAdmin) {
      existingAdmin.email = ADMIN_EMAIL;
      existingAdmin.password = ADMIN_PASSWORD;
      existingAdmin.name = ADMIN_NAME;
      await existingAdmin.save({ hooks: true });
      console.log('Admin user updated:', existingAdmin.email);
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
