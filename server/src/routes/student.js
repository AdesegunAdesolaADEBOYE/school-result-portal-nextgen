const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

["get", "post", "put", "delete"].forEach((method) => {
  const original = router[method].bind(router);
  router[method] = (path, handler) => original(path, (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next));
});

// Public: list terms so the login page can offer a term picker if needed later.
router.get("/terms", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM terms ORDER BY session DESC, term");
  res.json(rows);
});

router.use(requireAuth, requireRole("student"));

// Results for the logged-in student, grouped by term (defaults to active term).
router.get("/results", async (req, res) => {
  const { term_id } = req.query;

  let term = term_id;
  if (!term) {
    const active = await db.query("SELECT id FROM terms WHERE is_active = true LIMIT 1");
    term = active.rows[0]?.id;
  }
  if (!term) return res.json({ term: null, results: [], average: null });

  const studentRow = await db.query("SELECT class_id FROM students WHERE id = $1", [req.user.id]);
  const classId = studentRow.rows[0]?.class_id;

  const { rows } = await db.query(
    `SELECT r.*, sub.name AS subject_name, t.session, t.term AS term_label
     FROM results r
     JOIN subjects sub ON sub.id = r.subject_id
     JOIN terms t ON t.id = r.term_id
     WHERE r.student_id = $1 AND r.term_id = $2
     ORDER BY sub.name`,
    [req.user.id, term]
  );

  const average = rows.length
    ? Math.round((rows.reduce((sum, r) => sum + Number(r.total), 0) / rows.length) * 100) / 100
    : null;

  let rank = null;
  let class_size = 0;

  if (classId && rows.length > 0) {
    const rankRows = await db.query(
      `SELECT r.student_id,
              AVG(r.total) AS average_total,
              rank() OVER (ORDER BY AVG(r.total) DESC) AS rank
       FROM results r
       JOIN students s ON s.id = r.student_id
       WHERE s.class_id = $1 AND r.term_id = $2
       GROUP BY r.student_id
       ORDER BY average_total DESC`,
      [classId, term]
    );

    class_size = rankRows.rowCount;
    const found = rankRows.rows.find((row) => row.student_id === req.user.id);
    rank = found ? Number(found.rank) : null;
  }

  res.json({ term: Number(term), results: rows, average, rank, class_size });
});

module.exports = router;
