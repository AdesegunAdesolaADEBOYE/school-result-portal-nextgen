import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import DashboardLayout from "../components/DashboardLayout";

const TABS = [{ key: "entry", label: "Enter Results" }];

export default function TeacherDashboard() {
  const { session } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selected, setSelected] = useState({ assignment: "", term_id: "" });
  const [roster, setRoster] = useState([]);
  const [scores, setScores] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/teacher/assignments", session.token).then(setAssignments).catch((e) => setError(e.message));
    api.get("/student/terms", session.token).then(setTerms).catch(() => {});
  }, [session.token]);

  const loadRoster = useCallback(async () => {
    if (!selected.assignment || !selected.term_id) return;
    const a = assignments.find((x) => String(x.id) === selected.assignment);
    if (!a) return;
    setError("");
    setSuccess("");
    try {
      const params = new URLSearchParams({
        class_id: a.class_id,
        subject_id: a.subject_id,
        term_id: selected.term_id,
      });
      const data = await api.get(`/teacher/roster?${params.toString()}`, session.token);
      setRoster(data);
      const initial = {};
      data.forEach((s) => {
        initial[s.student_id] = { ca: s.ca_score ?? "", exam: s.exam_score ?? "" };
      });
      setScores(initial);
    } catch (err) {
      setError(err.message);
    }
  }, [selected, assignments, session.token]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  function updateScore(studentId, field, value) {
    setScores((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  }

  async function saveAll() {
    const a = assignments.find((x) => String(x.id) === selected.assignment);
    if (!a) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const entries = roster.map((s) => ({
        student_id: s.student_id,
        ca_score: scores[s.student_id]?.ca || 0,
        exam_score: scores[s.student_id]?.exam || 0,
      }));
      await api.post(
        "/teacher/results",
        { class_id: a.class_id, subject_id: a.subject_id, term_id: selected.term_id, entries },
        session.token
      );
      setSuccess("Results saved.");
      loadRoster();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout tabs={TABS} activeTab="entry" onTabChange={() => {}}>
      <div className="page-header">
        <h1>Enter results</h1>
        <p>CA is out of 40, exam is out of 60. Totals and grades are calculated automatically.</p>
      </div>

      <div className="card">
        <div className="inline-form">
          <div className="field">
            <label>Class & subject</label>
            <select value={selected.assignment} onChange={(e) => setSelected({ ...selected, assignment: e.target.value })}>
              <option value="">Select</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.class_name} — {a.subject_name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Term</label>
            <select value={selected.term_id} onChange={(e) => setSelected({ ...selected, term_id: e.target.value })}>
              <option value="">Select</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.session} — {t.term} {t.is_active ? "(active)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {(error || success) && <div className="card"><Banner error={error} success={success} /></div>}

      {roster.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission no.</th>
                <th>CA (0-40)</th>
                <th>Exam (0-60)</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((s) => {
                const ca = Number(scores[s.student_id]?.ca) || 0;
                const exam = Number(scores[s.student_id]?.exam) || 0;
                return (
                  <tr key={s.student_id}>
                    <td>{s.full_name}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{s.admission_no}</td>
                    <td>
                      <input
                        className="score-input"
                        type="number"
                        min={0}
                        max={40}
                        value={scores[s.student_id]?.ca ?? ""}
                        onChange={(e) => updateScore(s.student_id, "ca", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="score-input"
                        type="number"
                        min={0}
                        max={60}
                        value={scores[s.student_id]?.exam ?? ""}
                        onChange={(e) => updateScore(s.student_id, "exam", e.target.value)}
                      />
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{ca + exam || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 16 }}>
            <button className="btn" onClick={saveAll} disabled={saving}>
              {saving ? "Saving…" : "Save results"}
            </button>
          </div>
        </div>
      )}

      {selected.assignment && selected.term_id && roster.length === 0 && !error && (
        <p className="empty-state">No students found in this class yet.</p>
      )}
    </DashboardLayout>
  );
}

function Banner({ error, success }) {
  if (error) return <div className="banner error">{error}</div>;
  if (success) return <div className="banner success">{success}</div>;
  return null;
}
