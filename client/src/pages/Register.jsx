import { useState, useEffect } from "react";
import { api } from "../services/api";
import { Palette } from "lucide-react";
import ThemePicker from "../components/ThemePicker";

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

function TopBar({ dark, onToggle, themeId, setThemeId }) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 32px",
      background: "var(--card)",
      borderBottom: "1px solid var(--border)",
      position: "sticky", top: 0, zIndex: 50,
      transition: "background 0.3s, border-color 0.3s",
    }}>
      <style>{`
        .hover-bg:hover { background: var(--bg2); }
      `}</style>
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

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowPicker(!showPicker)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: 8, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s",
              color: "var(--ink2)",
            }}
            className="hover-bg"
          >
            <Palette className="h-5 w-5" />
          </button>
          {showPicker && (
            <ThemePicker 
              currentTheme={themeId} 
              onThemeChange={setThemeId} 
              onClose={() => setShowPicker(false)} 
            />
          )}
        </div>

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
      </div>
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

function FormField({ type, placeholder, value, onChange, onFocus, onBlur, focused }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        required
        style={{
          width: "100%", padding: "12px 0",
          background: "transparent",
          border: "none",
          borderBottom: `2px solid ${focused ? "var(--accent)" : "var(--border)"}`,
          fontFamily: "'Inter', sans-serif",
          fontSize: 15, color: "var(--ink)",
          outline: "none",
          transition: "border-color 0.2s",
        }}
      />
    </div>
  );
}

// ─── Main Register Component (Modified signature) ───────────────────────────
function Register({ setPage, dark, setDark, themeId, setThemeId }) { 
  const vw = useViewport();
  
  // Local theme state removed 

  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [focused, setFocused]   = useState(null);
  const [btnState, setBtnState] = useState("idle"); // idle | loading | success
  const [errorMsg, setErrorMsg] = useState("");

  // Breakpoints
  const isMobile  = vw < 900;
  const isTablet  = vw >= 900 && vw < 1200;
  const isDesktop = vw >= 1200;

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


  return (
    <>
      <div style={{ height: "calc(var(--vh, 1vh) * 100)", display: "flex", flexDirection: "column", background: "var(--bg)", transition: "background 0.3s" }}>
        
        {/* TopBar */}
        <TopBar dark={dark} onToggle={() => setDark(!dark)} />

        {/* MAIN CONTENT - FULL SCREEN SPLIT */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          overflow: "hidden",
        }}>

          {/* LEFT PANEL - WELCOME (70% on desktop, hidden on mobile) */}
          {!isMobile && (
          <div style={{
            flex: "0 0 70%",
            width: "auto",
            height: "100%",
            padding: "56px 48px",
            background: "var(--card2)",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            transition: "background 0.3s, border-color 0.3s",
            overflow: "auto",
          }}>
            {/* Centered Content Container */}
            <div style={{
              maxWidth: 600,
              width: "100%",
              margin: "0 auto",
            }}>
              {/* Top section */}
              <div>
                <p style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: "var(--accent)",
                  marginBottom: 18,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ display: "inline-block", width: 16, height: 1.5, background: "var(--accent)" }} />
                  Business messaging
                </p>

                <h1 style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 700,
                  fontSize: isTablet ? 36 : 48,
                  lineHeight: 1.2,
                  color: "var(--ink)", letterSpacing: "-0.03em",
                  marginBottom: 24,
                  textAlign: "left",
                }}>
                  <>Where teams<br />get things<br /><span style={{ color: "var(--accent)" }}>done.</span></>
                </h1>

                <p style={{
                  fontSize: 15,
                  color: "var(--ink3)", 
                  fontWeight: 400,
                  lineHeight: 1.7, 
                  maxWidth: 420, 
                  marginTop: 8,
                }}>
                  A focused workspace for professional teams — secure, fast, and built for real work.
                </p>
              </div>

              {/* Stats grid — desktop only */}
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
                <div style={{ display: "flex", gap: 8, flexShrink: 0, marginTop: 24 }}>
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
          </div>
          )}

          {/* RIGHT PANEL — FORM (30% on desktop, full on mobile) */}
          <div style={{
            flex: isMobile ? "1" : "0 0 30%",
            width: isMobile ? "100%" : "auto",
            height: isMobile ? "auto" : "100%",
            padding: isMobile ? "40px 24px" : "52px 48px",
            background: "var(--card)",
            display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
            transition: "background 0.3s",
            overflow: "auto",
          }}>
            <div style={{ width: "100%", maxWidth: 439, margin: "0 auto" }}>
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
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  onFocus={() => setFocused("username")}
                  onBlur={() => setFocused(null)}
                  focused={focused === "username"}
                />
                <FormField
                  type="email"
                  placeholder="Work Email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  focused={focused === "email"}
                />
                <FormField
                  type="password"
                  placeholder="Password (Min. 8 characters)"
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
          </div>

        </div>
      </div>
    </>
  );
}

export default Register;