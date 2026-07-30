import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentResult from "./pages/StudentResult";

function Protected({ role, children }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (role && session.role !== role) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { session } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <Protected role="admin">
            <AdminDashboard />
          </Protected>
        }
      />
      <Route
        path="/teacher"
        element={
          <Protected role="teacher">
            <TeacherDashboard />
          </Protected>
        }
      />
      <Route
        path="/result"
        element={
          <Protected role="student">
            <StudentResult />
          </Protected>
        }
      />
      <Route
        path="/"
        element={
          session ? (
            <Navigate to={session.role === "admin" ? "/admin" : session.role === "teacher" ? "/teacher" : "/result"} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
