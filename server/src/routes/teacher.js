const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { gradeFor } = require("../grading");

const router = express.Router();

["get", "post", "put", "delete"].forEach((method) => {
  const original = router[method].bind(router);
  router[method] = (path, handler) => original(path, (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next));
});

router.use(requireAuth, requireRole("teacher"));

// Subjects/classes this teacher is assigned to teach.
router.get("/assignments", async (req, res) => {
  const { rows } = await db.query(
    `SELECT ta.id, sub.id AS subject_id, sub.name AS subject_name,
            c.id AS class_id, c.name AS class_name
     FROM teacher_assignments ta
     JOIN subjects sub ON sub.id = ta.subject_id
     JOIN classes c ON c.id = ta.class_id
     WHERE ta.teacher_id = $1
     ORDER BY c.name, sub.name`,
    [req.user.id]
  );
  res.json(rows);
});

// Roster for one class/subject/term, with any scores already entered, so the
// teacher's entry sheet is pre-filled instead of starting blank each time.
router.get("/roster", async (req, res) => {
  const { class_id, subject_id, term_id } = req.query;
  if (!class_id || !subject_id || !term_id) {
    return res.status(400).json({ error: "class_id, subject_id, and term_id are required." });
  }

  // Confirm this teacher is actually assigned to this subject/class.
  const assigned = await db.query(
    "SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND subject_id = $2 AND class_id = $3",
    [req.user.id, subject_id, class_id]
  );
  if (assigned.rowCount === 0) {
    return res.status(403).json({ error: "You are not assigned to this subject/class." });
  }

  const { rows } = await db.query(
    `SELECT st.id AS student_id, st.full_name, st.admission_no,
            r.id AS result_id, r.ca_score, r.exam_score, r.total, r.grade, r.remark
     FROM students st
     LEFT JOIN results r
       ON r.student_id = st.id AND r.subject_id = $2 AND r.term_id = $3
     WHERE st.class_id = $1
     ORDER BY st.full_name`,
    [class_id, subject_id, term_id]
  );
  res.json(rows);
});

// Bulk save: [{ student_id, ca_score, exam_score }, ...]
router.post("/results", async (req, res) => {
  const { class_id, subject_id, term_id, entries } = req.body;
  if (!class_id || !subject_id || !term_id || !Array.isArray(entries)) {
    return res.status(400).json({ error: "class_id, subject_id, term_id, and entries[] are required." });
  }

  const assigned = await db.query(
    "SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND subject_id = $2 AND class_id = $3",
    [req.user.id, subject_id, class_id]
  );
  if (assigned.rowCount === 0) {
    return res.status(403).json({ error: "You are not assigned to this subject/class." });
  }

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    for (const e of entries) {
      const ca = Number(e.ca_score) || 0;
      const exam = Number(e.exam_score) || 0;
      if (ca < 0 || ca > 40 || exam < 0 || exam > 60) {
        throw Object.assign(new Error("CA must be 0-40 and Exam must be 0-60."), { status: 400 });
      }
      const total = ca + exam;
      const { grade, remark } = gradeFor(total);

      await client.query(
        `INSERT INTO results (student_id, subject_id, class_id, term_id, teacher_id, ca_score, exam_score, total, grade, remark, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())
         ON CONFLICT (student_id, subject_id, term_id)
         DO UPDATE SET ca_score = $6, exam_score = $7, total = $8, grade = $9, remark = $10, teacher_id = $5, updated_at = NOW()`,
        [e.student_id, subject_id, class_id, term_id, req.user.id, ca, exam, total, grade, remark]
      );
    }
    await client.query("COMMIT");
    res.status(200).json({ saved: entries.length });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(err.status || 500).json({ error: err.message || "Could not save results." });
  } finally {
    client.release();
  }
});

module.exports = router;
