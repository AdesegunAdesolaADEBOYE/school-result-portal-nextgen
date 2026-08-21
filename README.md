# Results Portal

A result-management portal for Nigerian schools. Admins set up classes,
subjects, teachers, and students; teachers enter continuous-assessment and
exam scores for their own subject and class; students and parents check
results instantly with an admission number and PIN — no more waiting on a
staff room to release a printed sheet.

**Stack:** React (Vite) · Node/Express · PostgreSQL · JWT auth

---

## 1. Features

- **Admin**: manage teachers, classes, subjects, students, and terms; assign
  each teacher to the subject/class they teach; browse all results with
  filters.
- **Teacher**: log in and see only the class/subject they're assigned to;
  enter CA (0–40) and exam (0–60) scores in a spreadsheet-style grid; totals
  and WAEC-style grades (A1–F9) are calculated automatically on save.
- **Student/Parent**: no account needed — enter the admission number and a
  4–6 digit PIN issued by the school to view the current term's result as a
  result slip, with subject-by-subject breakdown and term average.
- **Auth**: JWT-based sessions for all three roles; passwords and PINs are
  hashed with bcrypt; every write route checks the caller's role.

## 2. Project structure

```
school-result-portal/
  server/            Express API
    src/
      routes/         auth.js, admin.js, teacher.js, student.js
      middleware/      auth.js (JWT verification + role checks)
      db.js            Postgres connection pool
      grading.js       CA + exam -> total + WAEC grade
      index.js         app entry point
    db/
      schema.sql       table definitions
      migrate.js       applies schema.sql
      seed.js           demo data + accounts
  client/            React (Vite) frontend
    src/
      pages/           Login, AdminDashboard, TeacherDashboard, StudentResult
      components/      DashboardLayout (sidebar shell)
      AuthContext.jsx  session state
      api.js           fetch wrapper
      styles.css       design tokens + component styles
```

## 3. Run it locally

**Prerequisites:** Node.js 18+, a PostgreSQL database (local install, or a
free one from Render/Railway/Neon/Supabase — see §5).

### 3.1 Backend

```bash
cd server
npm install
cp .env.example .env      # then edit .env: DATABASE_URL, JWT_SECRET
npm run migrate           # creates tables
npm run seed               # loads demo accounts + sample data
npm run dev                # starts API on http://localhost:4000
```

The seed script prints the demo logins it created — keep that terminal
output handy. By default:

| Role    | Login                          | Password / PIN |
|---------|---------------------------------|-----------------|
| Admin   | admin@school.edu.ng             | Admin@12345     |
| Teacher | bisi.adewale@school.edu.ng      | Teacher@123     |
| Teacher | chinedu.okafor@school.edu.ng    | Teacher@123     |
| Student | STU/2025/001                    | PIN 1234        |

### 3.2 Frontend

In a second terminal:

```bash
cd client
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:4000/api
npm run dev                # starts app on http://localhost:5173
```

Open http://localhost:5173 — you'll land on the login screen with a **Staff
login** tab (admin/teacher) and a **Check my result** tab (student/parent).

### 3.3 Deploying the frontend to Vercel

- Import this repository into Vercel and set the **Project Root** to `client/`.
- Build Command: `npm run build`
- Output Directory: `dist`
- Add the environment variable `VITE_API_URL` with the value of your backend API, for example `https://results-portal-api.onrender.com/api`.
- We've included a `vercel.json` at the repository root to make the build reproducible. It tells Vercel to use the `client/package.json` static build and output to `dist`.

To test a production build locally before pushing:

```bash
cd client
npm install
npm run build
# serve the built files (install a static server if you don't have one)
npx serve dist
```

After deploying the frontend, copy the Vercel URL into the backend's `CLIENT_ORIGIN` environment variable and redeploy the backend so CORS allows the frontend to call the API.

## 4. Typical workflow

1. Sign in as admin → add a class and a subject (or use the seeded ones) →
   add a teacher → add students into a class → assign the teacher to a
   subject + class → set the active term.
2. Sign out, sign in as that teacher → pick the class/subject/term → enter
   CA and exam scores → **Save results**.
3. Go to **Check my result**, enter a student's admission number and PIN →
   see the term result slip with grades and average.

## 5. Deploying

This is a two-part deploy: the API + Postgres database, and the static
frontend.

### Backend + database (Render, free tier works)

1. Create a **PostgreSQL** instance on Render (or Railway/Neon/Supabase) and
   copy its connection string.
2. Create a **Web Service** on Render, pointing at `server/` in this repo.
   - Build command: `npm install`
   - Start command: `npm run migrate && npm run seed && npm start` (drop
     `&& npm run seed` after the first deploy so it doesn't wipe data on
     every restart)
   - Environment variables: `DATABASE_URL`, `DATABASE_SSL=true`,
     `JWT_SECRET`, `CLIENT_ORIGIN` (your frontend URL, added after step 2
     below), `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.

### Frontend (Vercel or Netlify)

1. Import `client/` as the project root.
2. Build command: `npm run build`, output directory: `dist`.
3. Environment variable: `VITE_API_URL` = your Render API URL + `/api`
   (e.g. `https://results-portal-api.onrender.com/api`).
4. Once deployed, copy the frontend URL back into the backend's
   `CLIENT_ORIGIN` variable on Render and redeploy the backend so CORS
   allows it.

Either update this README with the live links once deployed, or submit the
repo as-is with the steps above — both satisfy the brief's "deployed link or
runnable repo" requirement.

## 6. Recording the demo video (2–3 min)

Suggested script:

1. **(15s)** State the problem: results are hard to access for Nigerian
   students/parents, and hard to manage for schools without a shared system.
2. **(45s)** Admin: log in, show classes/subjects, add a student, assign a
   teacher, activate a term.
3. **(45s)** Teacher: log in, pick the class/subject, enter scores for two
   or three students, save, point out the auto-calculated total and grade.
4. **(30s)** Student: go to "Check my result", log in with admission number
   + PIN, show the result slip.
5. **(15s)** Close by mentioning the stack and where the code/deployed link
   live.

Free screen recorders: OBS Studio (desktop), or the built-in screen
recorder on Windows (Win+Alt+R) / Mac (Cmd+Shift+5).

## 7. Notes and possible next steps

- PINs are shared demo values here (`1234`) — in real use each student gets
  a unique PIN printed on a slip by the admin.
- Not yet built, good next steps: class position/ranking, PDF export of the
  result slip, SMS/WhatsApp delivery of results, and a "promote to next
  class" bulk action at year end.
