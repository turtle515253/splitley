import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/LandingThemeContext.jsx";
import logoWebp from "../assets/splitley-logo.webp";

const getStyles = (theme) => ({
  wrap: {
    background: theme === "dark" ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.95)",
    backdropFilter: "blur(10px)",
  },
  inner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "4px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
    lineHeight: 0,
  },
  nav: { 
    display: "flex", 
    alignItems: "center", 
    gap: 24,
    flexWrap: "wrap",
  },
  link: {
    textDecoration: "none",
    fontWeight: 500,
    fontSize: 15,
    color: theme === "dark" ? "#a0a0a0" : "#64748b",
    transition: "color 0.2s",
  },
  linkActive: {
    color: theme === "dark" ? "#ffffff" : "#0b1220",
  },
  themeToggle: {
    background: "transparent",
    border: theme === "dark" ? "1px solid #444" : "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
    color: theme === "dark" ? "#ffffff" : "#0b1220",
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
});

export default function Navbar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const styles = getStyles(theme);
  
  return (
    <header style={styles.wrap}>
      <div style={styles.inner}>
        <Link to="/" style={styles.brand} aria-label="Splitley home">
          <img src={logoWebp} alt="Splitley logo" style={{ height: 69.8, margin: 0, padding: 0, display: "block" }} />
        </Link>

        <nav className="navbar-nav" style={styles.nav} aria-label="Primary">
          {(location.pathname === "/terms" || location.pathname === "/privacy") && (
            <NavLink 
              to="/" 
              style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}
              onMouseEnter={(e) => { e.currentTarget.style.color = theme === "dark" ? "#ffffff" : "#0b1220"; }}
              onMouseLeave={(e) => { 
                const isActive = location.pathname === "/";
                e.currentTarget.style.color = isActive ? (theme === "dark" ? "#ffffff" : "#0b1220") : (theme === "dark" ? "#a0a0a0" : "#64748b");
              }}
            >
              Home
            </NavLink>
          )}
          <NavLink 
            to="/privacy" 
            style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}
            onMouseEnter={(e) => { e.currentTarget.style.color = theme === "dark" ? "#ffffff" : "#0b1220"; }}
            onMouseLeave={(e) => { 
              const isActive = location.pathname === "/privacy";
              e.currentTarget.style.color = isActive ? (theme === "dark" ? "#ffffff" : "#0b1220") : (theme === "dark" ? "#a0a0a0" : "#64748b");
            }}
          >
            Privacy
          </NavLink>
          <NavLink 
            to="/terms" 
            style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}
            onMouseEnter={(e) => { e.currentTarget.style.color = theme === "dark" ? "#ffffff" : "#0b1220"; }}
            onMouseLeave={(e) => { 
              const isActive = location.pathname === "/terms";
              e.currentTarget.style.color = isActive ? (theme === "dark" ? "#ffffff" : "#0b1220") : (theme === "dark" ? "#a0a0a0" : "#64748b");
            }}
          >
            Terms
          </NavLink>
          <button
            onClick={toggleTheme}
            style={styles.themeToggle}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            onMouseEnter={(e) => { 
              e.currentTarget.style.background = theme === "dark" ? "#222" : "#f8fafc";
              e.currentTarget.style.borderColor = theme === "dark" ? "#555" : "#cbd5e1";
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = theme === "dark" ? "#444" : "#e2e8f0";
            }}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </nav>
      </div>
    </header>
  );
}
