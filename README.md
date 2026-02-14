# Interview Scheduler (Realtime)

A web-based **Interview Scheduling** app as per the SRS: recruiters create slots, candidates book them, with real-time updates, email notifications, and role-based dashboards.

## Tech Stack

- **Frontend:** React (Vite), React Router, Socket.io-client
- **Backend:** Node.js, Express
- **Database:** MySQL with Sequelize
- **Realtime:** Socket.io

## Features

- **User roles:** Admin, Recruiter, Candidate (register/login)
- **Recruiters:** Create and manage interview slots; view bookings; reports
- **Candidates:** View available slots; book and reschedule; view my bookings
- **Admins:** Users list; reports
- **Realtime:** Slots and bookings refresh when others create/update/cancel
- **Notifications:** Email on booking confirmation and cancellation (when SMTP is configured)
- **Interview status:** Scheduled, Completed, Cancelled

## Setup

### 1. MySQL

- Install MySQL and start the server.
- Create a database and (if needed) a user:

```sql
CREATE DATABASE interview_scheduler;
-- If your MySQL root has a password, set DB_PASSWORD in .env (see step 2).
-- Or create a user: CREATE USER 'scheduler'@'localhost' IDENTIFIED BY 'yourpassword';
-- GRANT ALL ON interview_scheduler.* TO 'scheduler'@'localhost'; FLUSH PRIVILEGES;
```

### 2. Environment

A `.env` file is already created. **Option A – use SQLite (no MySQL):** set `USE_SQLITE=true` in `.env`. The app will use `server/data/scheduler.sqlite`. **Option B – use MySQL:** set `USE_SQLITE=false` or remove it, then set `DB_PASSWORD` (and `DB_USER` if needed). Also set `JWT_SECRET`; optional: `SMTP_*`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`.

### 3. Install and run

Dependencies are installed. Run:

```bash
npm run seed:admin   # creates first admin (default admin@example.com / admin123)
npm run dev          # starts backend on :5000 and frontend on :5173
```

- **Backend:** http://localhost:5000  
- **Frontend:** http://localhost:5173  

Open http://localhost:5173, sign in as admin or register as Recruiter/Candidate.

### If seed or server fails with "Access denied"

- Set **`DB_PASSWORD`** in `.env` to your MySQL password (and `DB_USER` if you use a different user).
- Ensure the database `interview_scheduler` exists and the user has access to it.

## Scripts

| Script           | Description                    |
|------------------|--------------------------------|
| `npm run server` | Start backend only             |
| `npm run client` | Start frontend only            |
| `npm run dev`    | Start both (concurrently)      |
| `npm run seed:admin` | Create first admin user   |

## Default admin

After `npm run seed:admin` (with default env):

- **Email:** admin@example.com  
- **Password:** admin123  

Change via `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` in `.env`.

---

Prepared per SRS – Interview Scheduling (KAVIN RAJA M · 7376241EC511).
"# interview-scheduling-app" 
