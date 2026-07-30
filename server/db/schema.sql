-- School Result Portal — schema.sql
-- Run this once against a fresh Postgres database.

DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS teacher_assignments CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS terms CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Admins and teachers log in here. Students do not get a row in this table.
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'teacher')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(40) UNIQUE NOT NULL -- e.g. "JSS1A", "SS2 Science"
);

CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(60) UNIQUE NOT NULL -- e.g. "Mathematics"
);

CREATE TABLE terms (
  id SERIAL PRIMARY KEY,
  session VARCHAR(20) NOT NULL,   -- e.g. "2025/2026"
  term VARCHAR(10) NOT NULL CHECK (term IN ('First', 'Second', 'Third')),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (session, term)
);

CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  admission_no VARCHAR(30) UNIQUE NOT NULL,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  pin_hash VARCHAR(200) NOT NULL, -- 4-digit PIN, hashed, given to student/parent for lookup
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Which teacher is allowed to enter scores for which subject, in which class
CREATE TABLE teacher_assignments (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  UNIQUE (teacher_id, subject_id, class_id)
);

CREATE TABLE results (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  ca_score NUMERIC(5,2) NOT NULL DEFAULT 0,   -- continuous assessment, out of 40
  exam_score NUMERIC(5,2) NOT NULL DEFAULT 0, -- exam, out of 60
  total NUMERIC(5,2) NOT NULL DEFAULT 0,
  grade VARCHAR(4) NOT NULL DEFAULT '',
  remark VARCHAR(120) NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, subject_id, term_id)
);

CREATE INDEX idx_results_student_term ON results(student_id, term_id);
CREATE INDEX idx_results_class_subject_term ON results(class_id, subject_id, term_id);
CREATE INDEX idx_students_class ON students(class_id);
