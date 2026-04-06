# Interview Scheduler Premium (Realtime)

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
npm run seed:admin   # creates first admin (default kavin.admin@gmail.com / 123)
npm run dev          # starts backend on :5000 and frontend on :5173
```

- **Backend:** http://localhost:5000  
- **Frontend:** http://localhost:5173  

Open http://localhost:5173, sign in as admin or register as Recruiter/Candidate.

### If seed or server fails with "Access denied"

- Set **`DB_PASSWORD`** in `.env` to your MySQL password (and `DB_USER` if you use a different user).
- Ensure the database `interview_scheduler` exists and the user has access to it.

## Theme (primeum)

The frontend uses a custom "primeum" colour theme defined in `client/src/theme/primeum.css`.
Core colours are exposed as CSS custom properties (variables) so that the look
and feel can be changed globally. Most component styles (layout, cards,
tables, badges, buttons) reference those variables.

Styles have been enhanced to provide a more premium experience:

- gradient body background and header
- Google font (`Poppins`) for cleaner typography
- premium badges and accents built with the theme

The theme is imported automatically by `src/index.css` and applied to
`body` via the `ThemeProvider` in `src/context/ThemeContext.jsx`. A toggle button
in the header allows switching between the default primeum theme and light/dark
variants (the body gets a class such as `primeum`, `light` or `dark` which can be
used for additional overrides). To customise colours, edit or extend `primeum.css`
and/or create a new theme file and update the context/provider accordingly.

A possibly simpler alternative is to drop the theme file and hard‑code colours –
but the current setup makes it easier to create a "premium" skin or ship
multiple themes later.

## Running the project

New convenience scripts have been added so the project boots with a single
command:

```bash
# install everything (root + client)
npm install

# start both backend and frontend, with live reload on the server
npm start          # alias for npm run dev
```

The `postinstall` hook will run `npm run install:all` automatically after any
`npm install` in the root, which ensures the client deps are pulled in too.

`nodemon` is used for the backend during development, so edits to server files
restart the API automatically. Production deployments should invoke
`node server/index.js` (or build the client and serve it using a static host).

### Alternative modes

```bash
# backend only
npm run server

# frontend only (from root)
npm run client
```

For convenience there are also launcher scripts at the repository root:

- `start-project.bat` – Windows double‑click or run in cmd
- `start-project.sh` – Unix/macOS shell (make executable with `chmod +x`)

Both simply change to the project directory and invoke `npm start` for you.

## Deployment

This project is now prepared for a single-service deployment where the Node server
serves the built React frontend in production.

### Render

A ready-to-use [render.yaml](/c:/Users/kavin%20raja%20m/Desktop/Interview%20Scheduler/render.yaml) file is included.

Steps:

1. Push this repository to GitHub.
2. In Render, create a new Blueprint deployment from the repo.
3. Confirm the generated web service settings.
4. Set `CLIENT_URL` to your final Render app URL.
5. After first deploy, open the app and sign in with:
   - Email: `kavin.admin@gmail.com`
   - Password: `123`

Render uses persistent SQLite storage through:

- `USE_SQLITE=true`
- `SQLITE_STORAGE_PATH=/opt/render/project-data/scheduler.sqlite`

### Manual production run

```bash
npm install
npm run build
npm run serve
```

The backend will serve the frontend build from `client/dist` when `NODE_ENV=production`.

---

## Scripts

| Script           | Description                    |
|------------------|--------------------------------|
| `npm run server` | Start backend only             |
| `npm run client` | Start frontend only            |
| `npm run dev`    | Start both (concurrently)      |
| `npm run seed:admin` | Create first admin user   |

## Default admin

After `npm run seed:admin` (with default env):

- **Email:** kavin.admin@gmail.com  
- **Password:** 123  

Change via `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` in `.env`.

---

Prepared per SRS – Interview Scheduling (KAVIN RAJA M · 7376241EC511).
"# interview-scheduling-app" 
