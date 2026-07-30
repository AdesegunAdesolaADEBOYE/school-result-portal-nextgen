import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function DashboardLayout({ tabs, activeTab, onTabChange, children }) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            Results <span className="mark">Portal</span>
          </div>
          <div className="sidebar-user" style={{ marginTop: 10 }}>
            {session?.name}
            <br />
            {session?.role === "admin" ? "Administrator" : "Teacher"}
          </div>
        </div>

        <nav className="sidebar-nav">
          {tabs.map((t) => (
            <a
              key={t.key}
              href="#"
              className={activeTab === t.key ? "active" : ""}
              onClick={(e) => {
                e.preventDefault();
                onTabChange(t.key);
              }}
            >
              {t.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-logout">
          <button onClick={handleLogout}>Sign out</button>
        </div>
      </aside>
      <main className="main-area">{children}</main>
    </div>
  );
}
