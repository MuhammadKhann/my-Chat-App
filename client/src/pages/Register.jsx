import { useState, useEffect } from "react";
import { api } from "../services/api";

// GlobalStyles and FontLoader are now imported in App.jsx

// ─── useViewport hook ─────────────────────────────────────────────────────────
function useViewport() {
  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const fn = () => setVw(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return vw;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TopBar({ dark, onToggle }) {
  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 32px",
      background: "var(--card)",
      borderBottom: "1px solid var(--border)",
      position: "sticky", top: 0, zIndex: 50,
      transition: "background 0.3s, border-color 0.3s",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontWeight: 700, fontSize: 17,
          color: "var(--ink)", letterSpacing: "-0.02em",
        }}>Chat App</span>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "var(--accent)",
          background: "var(--accent2)", padding: "3px 8px", borderRadius: 100,
          marginLeft: 2,
        }}>Beta</span>
      </div>

      {/* Theme toggle */}
      <button
        onClick={onToggle}
        aria-label="Toggle theme"
        style={{
          width: 44, height: 24, borderRadius: 100,
          border: `1.5px solid ${dark ? "var(--accent)" : "var(--border2)"}`,
          background: dark ? "var(--accent2)" : "var(--bg3)",
          cursor: "pointer", position: "relative",
          display: "flex", alignItems: "center", padding: "0 3px",
          transition: "all 0.25s",
        }}
      >
        <div style={{
          width: 15, height: 15, borderRadius: "50%",
          background: dark ? "var(--accent)" : "var(--ink3)",
          transform: dark ? "translateX(20px)" : "translateX(0)",
          transition: "all 0.25s",
        }} />
      </button>
    </nav>
  );
}

function StatCard({ value, label }) {
  return (
    <div style={{
      flex: 1, padding: "14px 16px",
      background: "var(--card)",
      borderRight: "1px solid var(--border)",
      transition: "background 0.3s",
    }}>
      <div style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: 20, fontWeight: 700,
        color: "var(--ink)", letterSpacing: "-0.02em",
      }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function TrustItem({ icon, text, delay = 0 }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      fontSize: 13, color: "var(--ink2)",
      animation: `fadeIn 0.4s ease ${delay}s both`,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        background: "var(--accent2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      {text}
    </div>
  );
}

function FormField({ label, type, placeholder, value, onChange, onFocus, onBlur, focused }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 500,
        letterSpacing: "0.06em", color: "var(--ink2)",
        marginBottom: 6, textTransform: "uppercase",
      }}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        required
        style={{
          width: "100%", padding: "11px 14px",
          background: focused ? "var(--card)" : "var(--bg2)",
          border: `1.5px solid ${focused ? "var(--accent)" : "var(--border)"}`,
          borderRadius: "var(--rs)",
          fontFamily: "'Inter', sans-serif",
          fontSize: 14, color: "var(--ink)",
          outline: "none",
          boxShadow: focused ? "0 0 0 4px rgba(26,86,240,0.08)" : "none",
          transition: "all 0.2s",
        }}
      />
    </div>
  );
}

// ─── Main Register Component (Modified signature) ───────────────────────────
function Register({ setPage, dark, setDark }) { 
  const vw = useViewport();
  
  // Local theme state removed 

  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [focused, setFocused]   = useState(null);
  const [btnState, setBtnState] = useState("idle"); // idle | loading | success
  const [errorMsg, setErrorMsg] = useState("");

  // Breakpoints
  const isMobile  = vw < 480;
  const isTablet  = vw >= 480 && vw < 820;
  const isDesktop = vw >= 820;

  // ── handleRegister (your backend logic) ──────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg(""); // Clear previous errors
    setBtnState("loading");

    try {
        const response = await fetch(api("/register"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify(formData),
        });

        const data = await response.json();
        if (response.ok) {
            setBtnState("success");
            setTimeout(() => {
                setBtnState("idle");
                setPage("login");
            }, 1800);
        } else {
            // --- NEW: DYNAMIC ERROR BINDING ---
            // This will now perfectly display the specific message from our backend update
            setErrorMsg(data.error || "Registration failed. Please try again.");
            setBtnState("idle");
            setTimeout(() => setErrorMsg(""), 4000); // Clear after 4 seconds
        }
    } catch (err) {
        setErrorMsg("Network error. Is the server running?");
        setBtnState("idle");
        setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  // ── Button label/style ────────────────────────────────────────────────────
  const btnContent = () => {
    if (btnState === "loading") return (
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          style={{ animation: "spin 0.8s linear infinite" }}>
          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
          <path d="M12 2a10 10 0 0110 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        Creating account…
      </span>
    );
    if (btnState === "success") return "✓ Account created!";
    return <span style={{ display: "flex", alignItems: "center", gap: 6 }}>Create account <span style={{ transition: "transform 0.2s" }}>→</span></span>;
  };

  // ── SVG icons ─────────────────────────────────────────────────────────────
  const ShieldIcon = (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const LockIcon = (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const BoltIcon = (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M13 10V3L4 14h7v7l9-11h-7z"
        stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // ── Responsive layout values ──────────────────────────────────────────────
  const pagePadding   = isMobile ? "0" : "48px 24px";
  const sceneDirection = isDesktop ? "row" : "column";
  const sceneWidth    = isDesktop ? 900 : isTablet ? 480 : "100%";
  const sceneMaxWidth = "100%";
  const sceneBorderRadius = isMobile ? 0 : 20;
  const sceneMinHeight    = isMobile ? "100vh" : "auto";
  const leftPad   = isMobile ? "24px 20px" : isTablet ? "32px 28px" : "56px 48px";
  const rightPad  = isMobile ? "28px 20px" : isTablet ? "32px 28px" : "56px 48px";
  const rightWidth = isDesktop ? 400 : "100%";
  const headlineSize = isMobile ? 24 : isTablet ? 28 : 38;

  return (
    <>

      <div style={{ minHeight: "calc(var(--vh, 1vh) * 100)", display: "flex", flexDirection: "column", background: "var(--bg)", transition: "background 0.3s" }}>

        {/* TopBar now calls setDark(!dark) globally  */}
        <TopBar dark={dark} onToggle={() => setDark(!dark)} />

        {/* ── Page ── */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: pagePadding,
        }}>
          <div style={{
            display: "flex",
            flexDirection: sceneDirection,
            width: sceneWidth,
            maxWidth: sceneMaxWidth,
            minHeight: sceneMinHeight,
            borderRadius: sceneBorderRadius,
            overflow: "hidden",
            boxShadow: isMobile ? "none" : "var(--shadow)",
            border: isMobile ? "none" : "1px solid var(--border)",
            animation: "rise 0.5s cubic-bezier(0.22,1,0.36,1) both",
            transition: "border-color 0.3s",
          }}>

            {/* LEFT PANEL */}
            <div style={{
              flex: isDesktop ? 1 : "none",
              padding: leftPad,
              background: "var(--card2)",
              borderRight: isDesktop ? "1px solid var(--border)" : "none",
              borderBottom: !isDesktop ? "1px solid var(--border)" : "none",
              display: "flex",
              flexDirection: isDesktop ? "column" : "row",
              alignItems: isDesktop ? "flex-start" : "center",
              justifyContent: isDesktop ? "space-between" : "space-between",
              gap: isDesktop ? 0 : 12,
              transition: "background 0.3s, border-color 0.3s",
            }}>

              {/* Left top block */}
              <div style={{ flex: isDesktop ? "auto" : 1 }}>
                {/* Eyebrow — desktop only */}
                {isDesktop && (
                  <p style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: "0.14em",
                    textTransform: "uppercase", color: "var(--accent)",
                    marginBottom: 18,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ display: "inline-block", width: 16, height: 1.5, background: "var(--accent)" }} />
                    Business messaging
                  </p>
                )}

                {/* Headline */}
                <h1 style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 700, fontSize: headlineSize,
                  lineHeight: 1.08, color: "var(--ink)",
                  letterSpacing: "-0.03em",
                  marginBottom: isDesktop ? 16 : 0,
                }}>
                  {isDesktop ? (
                    <>Where teams<br />get things<br /><span style={{ color: "var(--accent)" }}>done.</span></>
                  ) : (
                    <><span style={{ color: "var(--accent)" }}>Chat App</span> — where teams get things done.</>
                  )}
                </h1>

                {/* Sub — desktop only */}
                {isDesktop && (
                  <p style={{
                    fontSize: 14, color: "var(--ink3)", fontWeight: 400,
                    lineHeight: 1.65, maxWidth: 280, marginTop: 4,
                  }}>
                    A focused workspace for professional teams — secure, fast, and built for real work.
                  </p>
                )}
              </div>

              {/* Stats grid — desktop & tablet */}
              {isDesktop && (
                <div>
                  <div style={{
                    display: "flex", border: "1px solid var(--border)",
                    borderRadius: "var(--rs)", overflow: "hidden", marginTop: 32,
                  }}>
                    <StatCard value="99.9%" label="Uptime SLA" />
                    <StatCard value="<80ms" label="Latency" />
                    <div style={{ flex: 1, padding: "14px 16px", background: "var(--card)", transition: "background 0.3s" }}>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>E2EE</div>
                      <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 3 }}>Encrypted</div>
                    </div>
                  </div>

                  {/* Trust items */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
                    <TrustItem icon={ShieldIcon} text="SOC 2 Type II compliant infrastructure" delay={0.1} />
                    <TrustItem icon={LockIcon}   text="Zero-knowledge end-to-end encryption"   delay={0.2} />
                    <TrustItem icon={BoltIcon}   text="Real-time sync across all your devices"  delay={0.3} />
                  </div>
                </div>
              )}

              {/* Tablet: compact trust badges inline */}
              {isTablet && (
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {[ShieldIcon, LockIcon, BoltIcon].map((icon, i) => (
                    <div key={i} style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "var(--accent2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{icon}</div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT PANEL — FORM */}
            <div style={{
              width: rightWidth,
              padding: rightPad,
              background: "var(--card)",
              display: "flex", flexDirection: "column", justifyContent: "center",
              flex: isDesktop ? "none" : 1,
              transition: "background 0.3s",
            }}>
              <p style={{
                fontSize: 10, fontWeight: 600, letterSpacing: "0.14em",
                textTransform: "uppercase", color: "var(--ink3)", marginBottom: 10,
              }}>Get started — free</p>

              <h2 style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700,
                fontSize: isMobile ? 22 : 27,
                color: "var(--ink)", letterSpacing: "-0.02em",
                marginBottom: 6, lineHeight: 1.1,
              }}>Create your account</h2>

              <p style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 28 }}>
                Join in 30 seconds. No credit card needed.
              </p>

              {/* Form */}
              <form onSubmit={handleRegister}>
                <FormField
                  label="Username"
                  type="text"
                  placeholder="e.g. alex.morgan"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  onFocus={() => setFocused("username")}
                  onBlur={() => setFocused(null)}
                  focused={focused === "username"}
                />
                <FormField
                  label="Work Email"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  focused={focused === "email"}
                />
                <FormField
                  label="Password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  focused={focused === "password"}
                />

                {/* Aesthetic Error Reminder */}
                {errorMsg && (
                  <div style={{ 
                    background: "rgba(239, 68, 68, 0.1)", 
                    border: "1px solid rgba(239, 68, 68, 0.2)", 
                    color: "#ef4444", 
                    padding: "10px 14px", 
                    borderRadius: "var(--rs)", 
                    fontSize: "12px", 
                    fontWeight: 500, 
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    animation: "fadeIn 0.3s ease" 
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={btnState !== "idle"}
                  style={{
                    width: "100%", padding: "13px",
                    background: btnState === "success" ? "#16a34a" : "var(--accent)",
                    color: "#fff", border: "none",
                    borderRadius: "var(--rs)",
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em",
                    cursor: btnState !== "idle" ? "not-allowed" : "pointer",
                    opacity: btnState === "loading" ? 0.85 : 1,
                    transition: "background 0.25s, transform 0.15s, box-shadow 0.15s",
                    marginTop: 4,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {btnContent()}
                </button>
              </form>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{
                  fontSize: 11, fontWeight: 500, letterSpacing: "0.08em",
                  color: "var(--ink3)", textTransform: "uppercase",
                }}>or</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>

              {/* Footer */}
              <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink3)" }}>
                Already have an account?{" "}
                <span
                  onClick={() => setPage("login")}
                  style={{
                    color: "var(--accent)", fontWeight: 500,
                    cursor: "pointer", textDecoration: "underline",
                  }}
                >Sign in</span>
              </p>

              <p style={{
                textAlign: "center", fontSize: 11, color: "var(--ink3)",
                marginTop: 16, lineHeight: 1.6,
              }}>
                By signing up you agree to our{" "}
                <span style={{ textDecoration: "underline", cursor: "pointer" }}>Terms of Service</span>
                {" "}and{" "}
                <span style={{ textDecoration: "underline", cursor: "pointer" }}>Privacy Policy</span>
              </p>
            </div>

          </div>{/* end scene */}
        </div>{/* end page */}
      </div>{/* end root */}
    </>
  );
}

export default Register;