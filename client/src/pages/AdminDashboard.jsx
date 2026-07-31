import { useEffect, useState, useCallback } from "react";
import { jsPDF } from "jspdf";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import DashboardLayout from "../components/DashboardLayout";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "students", label: "Students" },
  { key: "teachers", label: "Teachers" },
  { key: "academics", label: "Classes & Subjects" },
  { key: "assignments", label: "Assignments" },
  { key: "terms", label: "Terms" },
  { key: "results", label: "Results" },
];

export default function AdminDashboard() {
  const { session } = useAuth();
  const [tab, setTab] = useState("overview");

  return (
    <DashboardLayout tabs={TABS} activeTab={tab} onTabChange={setTab}>
      <div className="page-header">
        <h1>{TABS.find((t) => t.key === tab).label}</h1>
      </div>
      {tab === "overview" && <Overview token={session.token} />}
      {tab === "students" && <Students token={session.token} />}
      {tab === "teachers" && <Teachers token={session.token} />}
      {tab === "academics" && <Academics token={session.token} />}
      {tab === "assignments" && <Assignments token={session.token} />}
      {tab === "terms" && <Terms token={session.token} />}
      {tab === "results" && <ResultsOverview token={session.token} />}
    </DashboardLayout>
  );
}

function Banner({ error, success }) {
  if (error) return <div className="banner error">{error}</div>;
  if (success) return <div className="banner success">{success}</div>;
  return null;
}

/* ---------------- Overview ---------------- */

function Overview({ token }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/summary", token).then(setSummary).catch((e) => setError(e.message));
  }, [token]);

  if (error) return <Banner error={error} />;
  if (!summary) return <p className="empty-state">Loading…</p>;

  const cards = [
    { label: "Students", value: summary.students },
    { label: "Teachers", value: summary.teachers },
    { label: "Classes", value: summary.classes },
    { label: "Subjects", value: summary.subjects },
    { label: "Results recorded", value: summary.results },
  ];

  return (
    <>
      <div className="stat-grid">
        {cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className="value">{c.value}</div>
            <div className="label">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Getting started</h3>
        <p style={{ color: "var(--ink-soft)", lineHeight: 1.6, marginTop: 10 }}>
          Add classes and subjects first, then register teachers and students, assign each teacher
          to a subject and class, and activate the current term. Teachers can then log in to enter
          scores, and students can look up results with their admission number and PIN.
        </p>
      </div>
    </>
  );
}

/* ---------------- Students ---------------- */

function Students({ token }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ full_name: "", admission_no: "", class_id: "", pin: "" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [promotionClassId, setPromotionClassId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(() => {
    api.get("/admin/students", token).then((data) => {
      setStudents(data);
      setSelectedIds([]);
    }).catch((e) => setError(e.message));
    api.get("/admin/classes", token).then(setClasses).catch(() => {});
  }, [token]);

  useEffect(load, [load]);

  async function addStudent(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.post("/admin/students", form, token);
      setForm({ full_name: "", admission_no: "", class_id: "", pin: "" });
      setSuccess("Student added.");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("Remove this student and their results?")) return;
    await api.del(`/admin/students/${id}`, token);
    load();
  }

  function toggleSelection(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function promoteSelected() {
    if (selectedIds.length === 0) {
      setError("Select at least one student to promote.");
      return;
    }
    if (!promotionClassId) {
      setError("Choose a destination class for promotion.");
      return;
    }
    setError("");
    setSuccess("");

    try {
      const { promoted } = await api.put(
        "/admin/students/promote",
        { student_ids: selectedIds, class_id: promotionClassId },
        token
      );
      setSuccess(`${promoted} student(s) promoted successfully.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function exportStudentSlip(admissionNo) {
    setError("");
    setSuccess("");
    try {
      const slip = await api.get(`/admin/students/${encodeURIComponent(admissionNo)}/slip`, token);
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      let y = 50;

      doc.setFontSize(18);
      doc.text("Result Slip", margin, y);
      doc.setFontSize(11);
      y += 24;
      doc.text(`${slip.session} — ${slip.term}`, margin, y);
      doc.text(`Class: ${slip.class_name}`, 420, y);
      y += 18;
      doc.text(`Name: ${slip.full_name}`, margin, y);
      doc.text(`Admission No.: ${slip.admission_no}`, 420, y);
      y += 26;

      doc.setFontSize(12);
      doc.text("Subject", margin, y);
      doc.text("CA", 260, y);
      doc.text("Exam", 320, y);
      doc.text("Total", 380, y);
      doc.text("Grade", 450, y);
      y += 12;
      doc.setLineWidth(0.5);
      doc.line(margin, y, 555, y);
      y += 16;

      slip.results.forEach((row) => {
        if (y > 760) {
          doc.addPage();
          y = 50;
        }
        doc.text(row.subject_name, margin, y);
        doc.text(String(row.ca_score), 260, y);
        doc.text(String(row.exam_score), 320, y);
        doc.text(String(row.total), 380, y);
        doc.text(row.grade, 450, y);
        y += 18;
      });

      if (slip.results.length === 0) {
        doc.text("No results available.", margin, y);
      }

      doc.save(`${slip.admission_no}-result-slip.pdf`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Add student</h3>
        <Banner error={error} success={success} />
        <form className="inline-form" onSubmit={addStudent}>
          <div className="field">
            <label>Full name</label>
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="field">
            <label>Admission no.</label>
            <input
              required
              placeholder="STU/2025/004"
              value={form.admission_no}
              onChange={(e) => setForm({ ...form, admission_no: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Class</label>
            <select required value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
              <option value="">Select</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>PIN (4-6 digits)</label>
            <input required maxLength={6} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} />
          </div>
          <button className="btn" type="submit">
            Add
          </button>
        </form>
      </div>

      <div className="card">
        <div className="inline-form" style={{ marginBottom: 16, gap: 12, alignItems: "center" }}>
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <label>Promote to class</label>
            <select value={promotionClassId} onChange={(e) => setPromotionClassId(e.target.value)}>
              <option value="">Select destination</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn" type="button" onClick={promoteSelected}>
            Promote selected
          </button>
          <div style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>
            Select students and move them to the next class in one action.
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Admission no.</th>
              <th>Class</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(s.id)}
                    onChange={() => toggleSelection(s.id)}
                  />
                </td>
                <td>{s.full_name}</td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{s.admission_no}</td>
                <td>{s.class_name}</td>
                <td style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn secondary" type="button" onClick={() => exportStudentSlip(s.admission_no)}>
                    Export slip
                  </button>
                  <button className="btn danger" type="button" onClick={() => remove(s.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">
                  No students yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------------- Teachers ---------------- */

function Teachers({ token }) {
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(() => {
    api.get("/admin/teachers", token).then(setTeachers).catch((e) => setError(e.message));
  }, [token]);

  useEffect(load, [load]);

  async function addTeacher(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.post("/admin/teachers", form, token);
      setForm({ name: "", email: "", password: "" });
      setSuccess("Teacher account created.");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("Remove this teacher?")) return;
    await api.del(`/admin/teachers/${id}`, token);
    load();
  }

  return (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Add teacher</h3>
        <Banner error={error} success={success} />
        <form className="inline-form" onSubmit={addTeacher}>
          <div className="field">
            <label>Full name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Email</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label>Temporary password</label>
            <input required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn" type="submit">
            Add
          </button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.email}</td>
                <td>
                  <button className="btn danger" onClick={() => remove(t.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr>
                <td colSpan={3} className="empty-state">
                  No teachers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------------- Classes & subjects ---------------- */

function Academics({ token }) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [className, setClassName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get("/admin/classes", token).then(setClasses).catch((e) => setError(e.message));
    api.get("/admin/subjects", token).then(setSubjects).catch((e) => setError(e.message));
  }, [token]);

  useEffect(load, [load]);

  async function addClass(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/admin/classes", { name: className }, token);
      setClassName("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addSubject(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/admin/subjects", { name: subjectName }, token);
      setSubjectName("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Classes</h3>
        <Banner error={error} />
        <form className="inline-form" onSubmit={addClass} style={{ marginBottom: 16 }}>
          <div className="field">
            <label>New class name</label>
            <input required placeholder="SS1C" value={className} onChange={(e) => setClassName(e.target.value)} />
          </div>
          <button className="btn" type="submit">
            Add
          </button>
        </form>
        <table>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn danger"
                    onClick={async () => {
                      if (confirm("Remove this class?")) {
                        await api.del(`/admin/classes/${c.id}`, token);
                        load();
                      }
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {classes.length === 0 && (
              <tr>
                <td className="empty-state">No classes yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Subjects</h3>
        <form className="inline-form" onSubmit={addSubject} style={{ marginBottom: 16 }}>
          <div className="field">
            <label>New subject name</label>
            <input required placeholder="Agricultural Science" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
          </div>
          <button className="btn" type="submit">
            Add
          </button>
        </form>
        <table>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn danger"
                    onClick={async () => {
                      if (confirm("Remove this subject?")) {
                        await api.del(`/admin/subjects/${s.id}`, token);
                        load();
                      }
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {subjects.length === 0 && (
              <tr>
                <td className="empty-state">No subjects yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Assignments ---------------- */

function Assignments({ token }) {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ teacher_id: "", subject_id: "", class_id: "" });
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get("/admin/assignments", token).then(setAssignments).catch((e) => setError(e.message));
    api.get("/admin/teachers", token).then(setTeachers).catch(() => {});
    api.get("/admin/classes", token).then(setClasses).catch(() => {});
    api.get("/admin/subjects", token).then(setSubjects).catch(() => {});
  }, [token]);

  useEffect(load, [load]);

  async function addAssignment(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/admin/assignments", form, token);
      setForm({ teacher_id: "", subject_id: "", class_id: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Assign a teacher to a subject & class</h3>
        <Banner error={error} />
        <form className="inline-form" onSubmit={addAssignment}>
          <div className="field">
            <label>Teacher</label>
            <select required value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}>
              <option value="">Select</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Subject</label>
            <select required value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
              <option value="">Select</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Class</label>
            <select required value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
              <option value="">Select</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn" type="submit">
            Assign
          </button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Teacher</th>
              <th>Subject</th>
              <th>Class</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id}>
                <td>{a.teacher_name}</td>
                <td>{a.subject_name}</td>
                <td>{a.class_name}</td>
                <td>
                  <button
                    className="btn danger"
                    onClick={async () => {
                      await api.del(`/admin/assignments/${a.id}`, token);
                      load();
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  No assignments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------------- Terms ---------------- */

function Terms({ token }) {
  const [terms, setTerms] = useState([]);
  const [form, setForm] = useState({ session: "", term: "First", is_active: false });
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get("/admin/terms", token).then(setTerms).catch((e) => setError(e.message));
  }, [token]);

  useEffect(load, [load]);

  async function addTerm(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/admin/terms", form, token);
      setForm({ session: "", term: "First", is_active: false });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Add term</h3>
        <Banner error={error} />
        <form className="inline-form" onSubmit={addTerm}>
          <div className="field">
            <label>Session</label>
            <input required placeholder="2025/2026" value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })} />
          </div>
          <div className="field">
            <label>Term</label>
            <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
              <option>First</option>
              <option>Second</option>
              <option>Third</option>
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", marginBottom: 8 }}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Make active
          </label>
          <button className="btn" type="submit">
            Add
          </button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Session</th>
              <th>Term</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {terms.map((t) => (
              <tr key={t.id}>
                <td>{t.session}</td>
                <td>{t.term}</td>
                <td>
                  {t.is_active ? (
                    <span className="pill pass">Active</span>
                  ) : (
                    <span style={{ color: "var(--ink-soft)" }}>—</span>
                  )}
                </td>
                <td>
                  {!t.is_active && (
                    <button
                      className="btn secondary"
                      onClick={async () => {
                        await api.put(`/admin/terms/${t.id}/activate`, {}, token);
                        load();
                      }}
                    >
                      Set active
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {terms.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  No terms yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------------- Results overview ---------------- */

function ResultsOverview({ token }) {
  const [results, setResults] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ class_id: "", term_id: "", subject_id: "" });
  const [terms, setTerms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/classes", token).then(setClasses).catch(() => {});
    api.get("/admin/terms", token).then(setTerms).catch(() => {});
    api.get("/admin/subjects", token).then(setSubjects).catch(() => {});
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.class_id) params.set("class_id", filters.class_id);
    if (filters.term_id) params.set("term_id", filters.term_id);
    if (filters.subject_id) params.set("subject_id", filters.subject_id);
    api
      .get(`/admin/results?${params.toString()}`, token)
      .then(setResults)
      .catch((e) => setError(e.message));
  }, [filters, token]);

  return (
    <>
      <div className="card">
        <div className="inline-form">
          <div className="field">
            <label>Class</label>
            <select value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value })}>
              <option value="">All</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Term</label>
            <select value={filters.term_id} onChange={(e) => setFilters({ ...filters, term_id: e.target.value })}>
              <option value="">All</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.session} — {t.term}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Subject</label>
            <select value={filters.subject_id} onChange={(e) => setFilters({ ...filters, subject_id: e.target.value })}>
              <option value="">All</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <Banner error={error} />
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Subject</th>
              <th>Term</th>
              <th>CA</th>
              <th>Exam</th>
              <th>Total</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id}>
                <td>{r.student_name}</td>
                <td>{r.class_name}</td>
                <td>{r.subject_name}</td>
                <td>
                  {r.session} — {r.term_label}
                </td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{r.ca_score}</td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{r.exam_score}</td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{r.total}</td>
                <td>
                  <span className={`pill ${Number(r.total) >= 40 ? "pass" : "fail"}`}>{r.grade}</span>
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-state">
                  No results match these filters yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
