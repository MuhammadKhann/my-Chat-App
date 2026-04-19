import { useState, useEffect } from "react";

// ─── Google Fonts ─────────────────────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Bricolage+Grotesque:wght@400;500;600;700&display=swap');
  `}</style>
);

// ─── Global styles ────────────────────────────────────────────────────────────
const GlobalStyles = ({ dark }) => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:       #eef0f4;
      --bg2:      #e6e9ef;
      --bg3:      #dde1e9;
      --card:     #f4f5f8;
      --card2:    #eceef3;
      --ink:      #181c26;
      --ink2:     #424857;
      --ink3:     #8590a6;
      --border:   #d4d8e2;
      --border2:  #bcc2d0;
      --accent:   #1a56f0;
      --accent2:  #dce6fd;
      --accent-h: #1344d4;
      --shadow:   0 2px 12px rgba(20,30,60,0.08), 0 0 0 1px rgba(20,30,60,0.05);
      --r:        12px;
      --rs:       8px;
    }

    ${dark ? `
    :root {
      --bg:       #0c0e13;
      --bg2:      #13161d;
      --bg3:      #1a1e27;
      --card:     #13161d;
      --card2:    #1a1e27;
      --ink:      #f0f2f8;
      --ink2:     #a8b0c4;
      --ink3:     #5c6480;
      --border:   #21263a;
      --border2:  #2e364d;
      --accent:   #3b74f8;
      --accent2:  #0f1a38;
      --accent-h: #5588ff;
      --shadow:   0 2px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04);
    }` : ""}

    html, body, #root {
      min-height: 100vh;
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--ink);
      transition: background 0.3s, color 0.3s;
    }

    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus {
      -webkit-box-shadow: 0 0 0px 1000px var(--bg2) inset !important;
      -webkit-text-fill-color: var(--ink) !important;
      transition: background-color 5000s ease-in-out 0s;
    }

    @keyframes rise {
      from { opacity: 0; transform: translateY(24px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0)   scale(1);    }
    }
    @keyframes spin {
      from { transform: rotate(0deg);   }
      to   { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
  `}</style>
);

function useViewport() {
  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const fn = () => setVw(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return vw;
}

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
        }}>Nexus</span>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "var(--accent)",
          background: "var(--accent2)", padding: "3px 8px", borderRadius: 100,
          marginLeft: 2,
        }}>Beta</span>
      </div>

      <button
        onClick={onToggle}
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

// 1. ADD PROPS TO THE FUNCTION SIGNATURE
function Login({ setPage, dark, setDark, setUser }) {
  const vw = useViewport();

  // 2. INTERNAL THEME STATE REMOVED

  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [focused, setFocused]   = useState(null);
  const [btnState, setBtnState] = useState("idle"); 
  const [showPw, setShowPw]     = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isMobile  = vw < 480;
  const isTablet  = vw >= 480 && vw < 820;
  const isDesktop = vw >= 820;

  const handleLogin = async (e) => {
    e.preventDefault();
    setBtnState("loading");
    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: formData.identifier, password: formData.password }),
      });
      const data = await response.json();
      if (response.ok) {
        // Only save the session permanently if "Remember Me" is checked
        if (rememberMe) {
            localStorage.setItem("nexusUser", JSON.stringify(data));
        } else {
            // Ensure no old sessions remain if the user unchecked it
            localStorage.removeItem("nexusUser");
        }

        setBtnState("success");
        setUser(data); // This still sets the user in memory for the current session
        setTimeout(() => {
            setBtnState("idle");
            setPage("chat");
        }, 1400);
        } else {
        // Instead of alert(data.error)
        setErrorMsg(data.error || "User not found or invalid password.");
        setBtnState("idle");
        setTimeout(() => setErrorMsg(""), 4000);
      }
    } catch {
      alert("Could not connect to server.");
      setBtnState("idle");
    }
  };

  const btnContent = () => {
    if (btnState === "loading") return (
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          style={{ animation: "spin 0.8s linear infinite" }}>
          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
          <path d="M12 2a10 10 0 0110 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        Signing in…
      </span>
    );
    if (btnState === "success") return "✓ Welcome back!";
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        Sign in <span>→</span>
      </span>
    );
  };

  const pagePadding       = isMobile ? "0" : "48px 24px";
  const sceneWidth        = isDesktop ? 900 : isTablet ? 480 : "100%";
  const sceneBorderRadius = isMobile ? 0 : 20;
  const sceneMinHeight    = isMobile ? "100vh" : "auto";
  const leftPad           = isMobile ? "24px 20px" : isTablet ? "28px 24px" : "52px 48px";
  const rightPad          = isMobile ? "28px 20px" : isTablet ? "32px 28px" : "52px 48px";

  return (
    <>
      <FontLoader />
      <GlobalStyles dark={dark} />
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", transition: "background 0.3s" }}>
        
        {/* 3. TOPBAR NOW USES setDark(!dark) GLOBALLY */}
        <TopBar dark={dark} onToggle={() => setDark(!dark)} />

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: pagePadding }}>
          <div style={{
            display: "flex",
            flexDirection: isDesktop ? "row" : "column",
            width: sceneWidth,
            maxWidth: "100%",
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
              borderRight:  isDesktop  ? "1px solid var(--border)" : "none",
              borderBottom: !isDesktop ? "1px solid var(--border)" : "none",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              transition: "background 0.3s, border-color 0.3s",
            }}>
              {isDesktop && (
                <p style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: "var(--accent)",
                  marginBottom: 16, display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ display: "inline-block", width: 16, height: 1.5, background: "var(--accent)" }} />
                  Welcome back
                </p>
              )}
              <h1 style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700,
                fontSize: isMobile ? 22 : isTablet ? 24 : 36,
                lineHeight: 1.1,
                color: "var(--ink)", letterSpacing: "-0.03em",
                marginBottom: isDesktop ? 14 : 0,
              }}>
                {isDesktop
                  ? <>Your workspace is<br />ready.<br /><span style={{ color: "var(--accent)" }}>Jump back in.</span></>
                  : <><span style={{ color: "var(--accent)" }}>Nexus</span> — your workspace is ready.</>
                }
              </h1>
              {isDesktop && (
                <p style={{ 
                  fontSize: 14, 
                  color: "var(--ink3)", 
                  lineHeight: 1.65, 
                  maxWidth: 270, 
                  marginTop: 4, 
                  textAlign: "center",
                  marginLeft: "auto",
                  marginRight: "auto" 
                }}>
                  Sign in to access your secure, professional chat environment. All messages and files are synced.
                </p>
              )}
            </div>

            {/* RIGHT PANEL — FORM */}
            <div style={{
              width: isDesktop ? 400 : "100%",
              padding: rightPad,
              background: "var(--card)",
              display: "flex", flexDirection: "column", justifyContent: "center",
              flex: isDesktop ? "none" : 1,
              transition: "background 0.3s",
            }}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink3)", marginBottom: 10 }}>Sign in to continue</p>
              <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: isMobile ? 22 : 27, color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: 6, lineHeight: 1.1 }}>Nexus Login</h2>
              <p style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 28 }}>Enter your credentials to access your workspace.</p>

              <form onSubmit={handleLogin}>
                <FormField
                  label="Email or Username"
                  type="text"
                  placeholder="you@company.com or username"
                  value={formData.identifier}
                  onChange={e => setFormData({ ...formData, identifier: e.target.value })}
                  onFocus={() => setFocused("identifier")}
                  onBlur={() => setFocused(null)}
                  focused={focused === "identifier"}
                />

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", color: "var(--ink2)", marginBottom: 6, textTransform: "uppercase" }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="Your password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      required
                      style={{
                        width: "100%", padding: "11px 44px 11px 14px",
                        background: focused === "password" ? "var(--card)" : "var(--bg2)",
                        border: `1.5px solid ${focused === "password" ? "var(--accent)" : "var(--border)"}`,
                        borderRadius: "var(--rs)",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 14, color: "var(--ink)",
                        outline: "none",
                        boxShadow: focused === "password" ? "0 0 0 4px rgba(26,86,240,0.08)" : "none",
                        transition: "all 0.2s",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--ink3)", display: "flex", alignItems: "center" }}
                    >
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px", 
                  marginBottom: "16px",
                  fontSize: "13px",
                  color: "var(--ink2)"
                }}>
                  <input 
                    type="checkbox" 
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  <label htmlFor="rememberMe" style={{ cursor: "pointer", fontWeight: 500 }}>
                    Remember me on this device
                  </label>
                </div>

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
                    transition: "background 0.25s, transform 0.15s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  {btnContent()}
                </button>
              </form>

              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink3)", textTransform: "uppercase" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>

              <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink3)" }}>
                Don't have an account?{" "}
                <span onClick={() => setPage("register")} style={{ color: "var(--accent)", fontWeight: 500, cursor: "pointer", textDecoration: "underline" }}>Sign up free</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;