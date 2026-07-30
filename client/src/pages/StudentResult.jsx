import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function StudentResult() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/student/results", session.token)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [session.token]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const overallGrade = (avg) => {
    if (avg === null) return "—";
    if (avg >= 70) return "A1";
    if (avg >= 60) return "B2";
    if (avg >= 50) return "C4";
    if (avg >= 45) return "D7";
    if (avg >= 40) return "E8";
    return "F9";
  };

  return (
    <div style={{ minHeight: "100%", background: "var(--paper)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-display)", color: "var(--navy)", fontSize: "1.1rem" }}>
            Results Portal
          </div>
          <button className="btn secondary" onClick={handleLogout}>
            Sign out
          </button>
        </div>

        {error && <div className="banner error">{error}</div>}

        {data && !data.term && (
          <div className="card empty-state">No active term has been set up yet. Please check back later.</div>
        )}

        {data && data.term && (
          <div className="slip">
            <div className="slip-head">
              <div>
                <div className="school">Term Result</div>
                <div className="term">
                  {data.results[0]?.session} · {data.results[0]?.term_label} TERM
                </div>
              </div>
              <div className="slip-seal">{overallGrade(data.average)}</div>
            </div>

            <div className="slip-student">
              <div>
                <div className="name">{session.name}</div>
                <div className="adm">{session.admission_no} · {session.className}</div>
              </div>
            </div>

            <div className="slip-body">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>CA</th>
                    <th>Exam</th>
                    <th>Total</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((r) => (
                    <tr key={r.id}>
                      <td>{r.subject_name}</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{r.ca_score}</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{r.exam_score}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{r.total}</td>
                      <td>
                        <span className={`pill ${Number(r.total) >= 40 ? "pass" : "fail"}`}>{r.grade}</span>
                      </td>
                    </tr>
                  ))}
                  {data.results.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No results recorded for this term yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {data.average !== null && (
              <div className="slip-average">
                <span style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>Term average</span>
                <span className="num">{data.average}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
