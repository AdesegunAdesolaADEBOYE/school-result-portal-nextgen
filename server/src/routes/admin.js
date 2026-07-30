const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Auto-wrap every route handler registered below so a rejected promise
// (e.g. a DB error) reaches Express's error handler instead of hanging.
["get", "post", "put", "delete"].forEach((method) => {
  const original = router[method].bind(router);
  router[method] = (path, handler) => original(path, (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next));
});

router.use(requireAuth, requireRole("admin"));

// ---------- Dashboard summary ----------
router.get("/summary", async (req, res) => {
  const [students, teachers, classes, subjects, results] = await Promise.all([
    db.query("SELECT COUNT(*) FROM students"),
    db.query("SELECT COUNT(*) FROM users WHERE role = 'teacher'"),
    db.query("SELECT COUNT(*) FROM classes"),
    db.query("SELECT COUNT(*) FROM subjects"),
    db.query("SELECT COUNT(*) FROM results"),
  ]);
  res.json({
    students: Number(students.rows[0].count),
    teachers: Number(teachers.rows[0].count),
    classes: Number(classes.rows[0].count),
    subjects: Number(subjects.rows[0].count),
    results: Number(results.rows[0].count),
  });
});

// ---------- Teachers ----------
router.get("/teachers", async (req, res) => {
  const { rows } = await db.query(
    "SELECT id, name, email, created_at FROM users WHERE role = 'teacher' ORDER BY name"
  );
  res.json(rows);
});

router.post("/teachers", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await db.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'teacher') RETURNING id, name, email",
      [name, email.toLowerCase().trim(), hash]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "That email is already registered." });
    throw err;
  }
});

router.delete("/teachers/:id", async (req, res) => {
  await db.query("DELETE FROM users WHERE id = $1 AND role = 'teacher'", [req.params.id]);
  res.status(204).end();
});

// ---------- Classes ----------
router.get("/classes", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM classes ORDER BY name");
  res.json(rows);
});

router.post("/classes", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Class name is required." });
  try {
    const { rows } = await db.query("INSERT INTO classes (name) VALUES ($1) RETURNING *", [name.trim()]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "That class already exists." });
    throw err;
  }
});

router.delete("/classes/:id", async (req, res) => {
  await db.query("DELETE FROM classes WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

// ---------- Subjects ----------
router.get("/subjects", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM subjects ORDER BY name");
  res.json(rows);
});

router.post("/subjects", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Subject name is required." });
  try {
    const { rows } = await db.query("INSERT INTO subjects (name) VALUES ($1) RETURNING *", [name.trim()]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "That subject already exists." });
    throw err;
  }
});

router.delete("/subjects/:id", async (req, res) => {
  await db.query("DELETE FROM subjects WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

// ---------- Terms ----------
router.get("/terms", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM terms ORDER BY session DESC, term");
  res.json(rows);
});

router.post("/terms", async (req, res) => {
  const { session, term, is_active } = req.body;
  if (!session || !term) return res.status(400).json({ error: "Session and term are required." });
  try {
    if (is_active) {
      await db.query("UPDATE terms SET is_active = false");
    }
    const { rows } = await db.query(
      "INSERT INTO terms (session, term, is_active) VALUES ($1,$2,$3) RETURNING *",
      [session.trim(), term, !!is_active]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "That term already exists." });
    throw err;
  }
});

router.put("/terms/:id/activate", async (req, res) => {
  await db.query("UPDATE terms SET is_active = false");
  await db.query("UPDATE terms SET is_active = true WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

// ---------- Students ----------
router.get("/students", async (req, res) => {
  const { rows } = await db.query(
    `SELECT s.id, s.full_name, s.admission_no, s.class_id, c.name AS class_name
     FROM students s JOIN classes c ON c.id = s.class_id
     ORDER BY c.name, s.full_name`
  );
  res.json(rows);
});

router.post("/students", async (req, res) => {
  const { full_name, admission_no, class_id, pin } = req.body;
  if (!full_name || !admission_no || !class_id || !pin) {
    return res.status(400).json({ error: "Name, admission number, class, and PIN are required." });
  }
  if (!/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ error: "PIN must be 4 to 6 digits." });
  }
  const pinHash = await bcrypt.hash(pin, 10);
  try {
    const { rows } = await db.query(
      "INSERT INTO students (full_name, admission_no, class_id, pin_hash) VALUES ($1,$2,$3,$4) RETURNING id, full_name, admission_no, class_id",
      [full_name.trim(), admission_no.trim(), class_id, pinHash]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "That admission number is already in use." });
    throw err;
  }
});

router.delete("/students/:id", async (req, res) => {
  await db.query("DELETE FROM students WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

// ---------- Teacher assignments ----------
router.get("/assignments", async (req, res) => {
  const { rows } = await db.query(
    `SELECT ta.id, u.id AS teacher_id, u.name AS teacher_name,
            sub.id AS subject_id, sub.name AS subject_name,
            c.id AS class_id, c.name AS class_name
     FROM teacher_assignments ta
     JOIN users u ON u.id = ta.teacher_id
     JOIN subjects sub ON sub.id = ta.subject_id
     JOIN classes c ON c.id = ta.class_id
     ORDER BY u.name, c.name`
  );
  res.json(rows);
});

router.post("/assignments", async (req, res) => {
  const { teacher_id, subject_id, class_id } = req.body;
  if (!teacher_id || !subject_id || !class_id) {
    return res.status(400).json({ error: "Teacher, subject, and class are all required." });
  }
  try {
    const { rows } = await db.query(
      "INSERT INTO teacher_assignments (teacher_id, subject_id, class_id) VALUES ($1,$2,$3) RETURNING *",
      [teacher_id, subject_id, class_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "That teacher is already assigned to this subject and class." });
    throw err;
  }
});

router.delete("/assignments/:id", async (req, res) => {
  await db.query("DELETE FROM teacher_assignments WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

// ---------- Results overview (read-only) ----------
router.get("/results", async (req, res) => {
  const { class_id, term_id, subject_id } = req.query;
  const conditions = [];
  const params = [];

  if (class_id) { params.push(class_id); conditions.push(`r.class_id = $${params.length}`); }
  if (term_id) { params.push(term_id); conditions.push(`r.term_id = $${params.length}`); }
  if (subject_id) { params.push(subject_id); conditions.push(`r.subject_id = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await db.query(
    `SELECT r.*, s.full_name AS student_name, s.admission_no,
            sub.name AS subject_name, c.name AS class_name,
            t.session, t.term AS term_label
     FROM results r
     JOIN students s ON s.id = r.student_id
     JOIN subjects sub ON sub.id = r.subject_id
     JOIN classes c ON c.id = r.class_id
     JOIN terms t ON t.id = r.term_id
     ${where}
     ORDER BY c.name, s.full_name, sub.name`,
    params
  );
  res.json(rows);
});

module.exports = router;
