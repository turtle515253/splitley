import React from "react";
import { useTheme } from "../contexts/LandingThemeContext.jsx";
import appViewWebp from "../assets/app-view.webp";

function Feature({ title, desc, icon, theme }) {
  return (
    <div
      style={{
        padding: "24px",
        borderRadius: 16,
        background: theme === "dark" ? "#1a1a1a" : "#ffffff",
        border: theme === "dark" ? "1px solid #333" : "1px solid #e2e8f0",
        transition: "all 0.2s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = theme === "dark" ? "#444" : "#cbd5e1";
        e.currentTarget.style.boxShadow = theme === "dark" ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(0,0,0,0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = theme === "dark" ? "#333" : "#e2e8f0";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {icon && (
        <div style={{ marginBottom: 16, fontSize: 32 }}>{icon}</div>
      )}
      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 18, color: theme === "dark" ? "#ffffff" : "#0b1220" }}>{title}</div>
      <div style={{ color: theme === "dark" ? "#a0a0a0" : "#64748b", lineHeight: 1.6, fontSize: 15 }}>{desc}</div>
    </div>
  );
}

export default function Home() {
  const { theme } = useTheme();
  
  return (
    <div>
      {/* Hero */}
      <section style={{ padding: "80px 18px 60px", background: theme === "dark" ? "#000000" : "#ffffff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
            <div>
              <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 20px", fontWeight: 800, color: theme === "dark" ? "#ffffff" : "#0b1220" }}>
                Split Expenses with your friends for free.
              </h1>

              <p style={{ fontSize: 20, lineHeight: 1.6, margin: "0 0 32px", color: theme === "dark" ? "#a0a0a0" : "#64748b", fontWeight: 400 }}>
                An open source alternative to SplitWise. Track shared spending, settle up fairly, and keep every group on the same page.
              </p>
            </div>

            {/* App view image */}
            <div className="hero-image" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              <img 
                src={appViewWebp} 
                alt="App view" 
                style={{ 
                  maxWidth: "100%", 
                  height: "auto",
                  width: "420px",
                  filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.1))"
                }} 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "80px 18px", background: theme === "dark" ? "#0a0a0a" : "#f8fafc" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", letterSpacing: "-0.02em", margin: "0 0 48px", fontWeight: 800, color: theme === "dark" ? "#ffffff" : "#0b1220", textAlign: "center" }}>
            Features
          </h2>

          <div className="features-grid" style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(3, 1fr)", 
            gap: 24
          }}>
            <Feature
              title="Groups and Friends"
              desc="Can create multiple groups or add balance directly. Everything will be consolidated."
              icon="👥"
              theme={theme}
            />
            <Feature
              title="Multiple currencies"
              desc="Need to add expense with different currency for same user? No problem!"
              icon="💱"
              theme={theme}
            />
            <Feature
              title="Unequal Split"
              desc="Advanced split options. By shares, percentage or exact amounts."
              icon="⚖️"
              theme={theme}
            />
            <Feature
              title="Upload Receipts"
              desc="Upload receipts along with the expense"
              icon="📄"
              theme={theme}
            />
            <Feature
              title="Push notification"
              desc="Never miss important notifications. Get notified when someone adds an expense or settles up"
              icon="🔔"
              theme={theme}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
