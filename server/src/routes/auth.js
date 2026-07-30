const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

["get", "post", "put", "delete"].forEach((method) => {
  const original = router[method].bind(router);
  router[method] = (path, handler) => original(path, (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next));
});

function sign(payload, expiresIn) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

// Admin / teacher login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "Incorrect email or password." });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Incorrect email or password." });

  const token = sign({ id: user.id, role: user.role, name: user.name }, "8h");
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// Student / parent lookup: admission number + 4-digit PIN issued by the school.
router.post("/student-login", async (req, res) => {
  const { admission_no, pin } = req.body;
  if (!admission_no || !pin) {
    return res.status(400).json({ error: "Admission number and PIN are required." });
  }

  const { rows } = await db.query(
    `SELECT s.*, c.name AS class_name FROM students s
     JOIN classes c ON c.id = s.class_id
     WHERE s.admission_no = $1`,
    [admission_no.trim()]
  );
  const student = rows[0];
  if (!student) return res.status(401).json({ error: "We couldn't find that admission number." });

  const ok = await bcrypt.compare(pin, student.pin_hash);
  if (!ok) return res.status(401).json({ error: "Incorrect PIN." });

  const token = sign({ id: student.id, role: "student", name: student.full_name }, "2h");
  res.json({
    token,
    student: {
      id: student.id,
      name: student.full_name,
      admission_no: student.admission_no,
      class: student.class_name,
    },
  });
});

module.exports = router;
