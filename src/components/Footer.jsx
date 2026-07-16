import React from "react";
import { useTheme } from "../contexts/LandingThemeContext.jsx";

export default function Footer() {
  const { theme } = useTheme();
  
  return (
    <footer style={{ borderTop: theme === "dark" ? "1px solid #333" : "1px solid #eef2ff", padding: "26px 18px", background: theme === "dark" ? "#000000" : "transparent" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ opacity: 0.7, fontSize: 14, color: theme === "dark" ? "#a0a0a0" : "#0b1220" }}>
          © {new Date().getFullYear()} Splitley. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
