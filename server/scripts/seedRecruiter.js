require('dotenv').config();
const { sequelize, User } = require('../models');

const RECRUITER_EMAIL = process.env.RECRUITER_EMAIL || 'kavin.recruiter@gmail.com';
const RECRUITER_PASSWORD = process.env.RECRUITER_PASSWORD || '123456';
const RECRUITER_NAME = process.env.RECRUITER_NAME || 'Kavin Recruiter';

async function seed() {
  try {
    await sequelize.authenticate();
    await User.sync();

    const existing = await User.findOne({ where: { email: RECRUITER_EMAIL } });
    if (existing) {
      existing.password = RECRUITER_PASSWORD;
      existing.role = 'recruiter';
      existing.name = RECRUITER_NAME;
      await existing.save({ hooks: true });
      console.log('Recruiter updated:', existing.email);
    } else {
      const recruiter = await User.create({
        email: RECRUITER_EMAIL,
        password: RECRUITER_PASSWORD,
        name: RECRUITER_NAME,
        role: 'recruiter',
      });
      console.log('Recruiter created:', recruiter.email);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
