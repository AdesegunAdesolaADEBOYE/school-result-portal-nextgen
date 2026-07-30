import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function Login() {
  const [tab, setTab] = useState("staff");
  const { login } = useAuth();
  const navigate = useNavigate();

  const [staffForm, setStaffForm] = useState({ email: "", password: "" });
  const [studentForm, setStudentForm] = useState({ admission_no: "", pin: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitStaff(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post("/auth/login", staffForm);
      login({ token: data.token, role: data.user.role, name: data.user.name });
      navigate(data.user.role === "admin" ? "/admin" : "/teacher");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitStudent(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post("/auth/student-login", studentForm);
      login({
        token: data.token,
        role: "student",
        name: data.student.name,
        admission_no: data.student.admission_no,
        className: data.student.class,
      });
      navigate("/result");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">Results Portal</div>
        <div className="auth-sub">Check a result, or sign in to manage records.</div>

        <div className="auth-tabs">
          <button className={tab === "staff" ? "active" : ""} onClick={() => setTab("staff")}>
            Staff login
          </button>
          <button className={tab === "student" ? "active" : ""} onClick={() => setTab("student")}>
            Check my result
          </button>
        </div>

        {error && <div className="banner error">{error}</div>}

        {tab === "staff" ? (
          <form onSubmit={submitStaff}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                value={staffForm.password}
                onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
              />
            </div>
            <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <div className="demo-hint">
              admin@school.edu.ng / Admin@12345
              <br />
              bisi.adewale@school.edu.ng / Teacher@123
            </div>
          </form>
        ) : (
          <form onSubmit={submitStudent}>
            <div className="field">
              <label htmlFor="adm">Admission number</label>
              <input
                id="adm"
                required
                placeholder="STU/2025/001"
                value={studentForm.admission_no}
                onChange={(e) => setStudentForm({ ...studentForm, admission_no: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="pin">PIN</label>
              <input
                id="pin"
                required
                inputMode="numeric"
                placeholder="4-digit PIN from your school"
                value={studentForm.pin}
                onChange={(e) => setStudentForm({ ...studentForm, pin: e.target.value })}
              />
            </div>
            <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Checking…" : "View result"}
            </button>
            <div className="demo-hint">Demo: STU/2025/001 / PIN 1234</div>
          </form>
        )}
      </div>
    </div>
  );
}
