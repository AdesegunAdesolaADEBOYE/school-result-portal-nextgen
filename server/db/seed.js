// Populates the database with a working demo: one admin, two teachers,
// two classes, a handful of subjects, one active term, students, teacher
// assignments, and a few sample results.
//
// Usage: npm run seed
// Safe to re-run: it clears existing rows first (see schema.sql order).

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Wipe existing rows (keeps schema, resets data) so this script is repeatable.
    await client.query(
      "TRUNCATE results, teacher_assignments, students, terms, subjects, classes, users RESTART IDENTITY CASCADE"
    );

    // --- Admin ---
    const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@school.edu.ng";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";
    const adminHash = await bcrypt.hash(adminPassword, 10);
    await client.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'admin')",
      ["School Administrator", adminEmail, adminHash]
    );

    // --- Teachers ---
    const teacherPassword = "Teacher@123";
    const teacherHash = await bcrypt.hash(teacherPassword, 10);
    const t1 = await client.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'teacher') RETURNING id",
      ["Mrs. Bisi Adewale", "bisi.adewale@school.edu.ng", teacherHash]
    );
    const t2 = await client.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'teacher') RETURNING id",
      ["Mr. Chinedu Okafor", "chinedu.okafor@school.edu.ng", teacherHash]
    );

    // --- Classes ---
    const c1 = await client.query("INSERT INTO classes (name) VALUES ('JSS1A') RETURNING id");
    const c2 = await client.query("INSERT INTO classes (name) VALUES ('JSS2B') RETURNING id");

    // --- Subjects ---
    const subjectNames = ["Mathematics", "English Language", "Basic Science", "Social Studies"];
    const subjectIds = {};
    for (const name of subjectNames) {
      const r = await client.query("INSERT INTO subjects (name) VALUES ($1) RETURNING id", [name]);
      subjectIds[name] = r.rows[0].id;
    }

    // --- Term (active) ---
    const term = await client.query(
      "INSERT INTO terms (session, term, is_active) VALUES ('2025/2026','First', true) RETURNING id"
    );

    // --- Teacher assignments ---
    await client.query(
      "INSERT INTO teacher_assignments (teacher_id, subject_id, class_id) VALUES ($1,$2,$3)",
      [t1.rows[0].id, subjectIds["Mathematics"], c1.rows[0].id]
    );
    await client.query(
      "INSERT INTO teacher_assignments (teacher_id, subject_id, class_id) VALUES ($1,$2,$3)",
      [t1.rows[0].id, subjectIds["Mathematics"], c2.rows[0].id]
    );
    await client.query(
      "INSERT INTO teacher_assignments (teacher_id, subject_id, class_id) VALUES ($1,$2,$3)",
      [t2.rows[0].id, subjectIds["English Language"], c1.rows[0].id]
    );

    // --- Students ---
    const pin = "1234"; // demo PIN shared by all seeded students, given to parents in real use
    const pinHash = await bcrypt.hash(pin, 10);
    const students = [
      { name: "Adebayo Folasade", adm: "STU/2025/001", classId: c1.rows[0].id },
      { name: "Musa Ibrahim", adm: "STU/2025/002", classId: c1.rows[0].id },
      { name: "Ngozi Eze", adm: "STU/2025/003", classId: c2.rows[0].id },
    ];
    const studentIds = {};
    for (const s of students) {
      const r = await client.query(
        "INSERT INTO students (full_name, admission_no, class_id, pin_hash) VALUES ($1,$2,$3,$4) RETURNING id",
        [s.name, s.adm, s.classId, pinHash]
      );
      studentIds[s.adm] = r.rows[0].id;
    }

    // --- Sample results (Mathematics, JSS1A, First term) ---
    const grade = (total) => {
      if (total >= 70) return "A1";
      if (total >= 60) return "B2";
      if (total >= 50) return "C4";
      if (total >= 45) return "D7";
      if (total >= 40) return "E8";
      return "F9";
    };
    const sample = [
      { adm: "STU/2025/001", ca: 35, exam: 50 },
      { adm: "STU/2025/002", ca: 28, exam: 44 },
    ];
    for (const r of sample) {
      const total = r.ca + r.exam;
      await client.query(
        `INSERT INTO results (student_id, subject_id, class_id, term_id, teacher_id, ca_score, exam_score, total, grade, remark)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          studentIds[r.adm],
          subjectIds["Mathematics"],
          c1.rows[0].id,
          term.rows[0].id,
          t1.rows[0].id,
          r.ca,
          r.exam,
          total,
          grade(total),
          total >= 50 ? "Good result, keep it up." : "Needs more practice.",
        ]
      );
    }

    await client.query("COMMIT");

    console.log("Seed complete.\n");
    console.log("Admin login:   ", adminEmail, "/", adminPassword);
    console.log("Teacher login: ", "bisi.adewale@school.edu.ng", "/", teacherPassword);
    console.log("Teacher login: ", "chinedu.okafor@school.edu.ng", "/", teacherPassword);
    console.log("Student lookup:", "STU/2025/001", "PIN", pin);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
