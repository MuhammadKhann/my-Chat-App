import { useState, useEffect } from "react";
import { api } from "../services/api";

// GlobalStyles and FontLoader are now imported in App.jsx

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
        }}>Chat App</span>
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
  const [showPopup, setShowPopup] = useState(false);

  const showComingSoon = () => setShowPopup(true);

  const isMobile  = vw < 900;
  const isTablet  = vw >= 900 && vw < 1200;
  const isDesktop = vw >= 1200;

  const handleLogin = async (e) => {
    e.preventDefault();
    setBtnState("loading");
    try {
      const response = await fetch(api("/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',  // ✅ Lets the browser store the httpOnly JWT cookie
        body: JSON.stringify({ identifier: formData.identifier, password: formData.password }),
      });
      const data = await response.json();
      if (response.ok) {
        // Normalize: Backend returns `_id`, but Chat.jsx uses `user.id`.
        data.id = data._id || data.id;

        // Save the token for Header-based auth (vital for incognito/cross-domain cookies)
        if (data.token) {
            localStorage.setItem("chatAppToken", data.token);
        }

        // Only save the session permanently if "Remember Me" is checked
        if (rememberMe) {
            localStorage.setItem("chatAppUser", JSON.stringify(data));
        } else {
            // Ensure no old sessions remain if the user unchecked it
            localStorage.removeItem("chatAppUser");
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
    return "Login Now";
  };

  return (
    <>
      <div style={{ height: "calc(var(--vh, 1vh) * 100)", display: "flex", flexDirection: "column", background: "var(--bg)", transition: "background 0.3s" }}>
        
        {/* TOPBAR */}
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
            padding: "52px 48px",
            background: "var(--card2)",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            transition: "background 0.3s, border-color 0.3s",
            overflow: "auto",
          }}>
            <p style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--accent)",
              marginBottom: 16, display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ display: "inline-block", width: 16, height: 1.5, background: "var(--accent)" }} />
              Welcome back
            </p>
            <h1 style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700,
              fontSize: 48,
              lineHeight: 1.2,
              color: "var(--ink)", letterSpacing: "-0.03em",
              marginBottom: 24,
              textAlign: "left",
              maxWidth: "500px",
            }}>
              <>Your workspace is<br />ready.<br /><span style={{ color: "var(--accent)" }}>Jump back in.</span></>
            </h1>
            <p style={{ 
              fontSize: 15, 
              color: "var(--ink3)", 
              lineHeight: 1.7, 
              maxWidth: 420, 
              marginTop: 8,
            }}>
              Sign in to access your secure, professional chat environment. All messages and files are synced in real-time across all your devices.
            </p>
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
              {/* Title */}
              <h1 style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700,
                fontSize: 32,
                color: "var(--accent)",
                marginBottom: 8,
                letterSpacing: "-0.02em",
              }}>Chat App</h1>
              
              <h2 style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700,
                fontSize: 28,
                color: "var(--ink)",
                marginBottom: 12,
                letterSpacing: "-0.02em",
              }}>Welcome Back!</h2>
              
              <p style={{ fontSize: 14, color: "var(--ink2)", marginBottom: 32, lineHeight: 1.5 }}>
                Don't have an account?{" "}
                <span 
                  onClick={() => setPage("register")} 
                  style={{ color: "var(--accent)", fontWeight: 500, cursor: "pointer", textDecoration: "underline" }}
                >Create a new account now</span>, it's FREE! Takes less than a minute.
              </p>

              <form onSubmit={handleLogin}>
                <FormField
                  type="text"
                  placeholder="Email or Username"
                  value={formData.identifier}
                  onChange={e => setFormData({ ...formData, identifier: e.target.value })}
                  onFocus={() => setFocused("identifier")}
                  onBlur={() => setFocused(null)}
                  focused={focused === "identifier"}
                />

                <div style={{ position: "relative", marginBottom: 24 }}>
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                    required
                    style={{
                      width: "100%", padding: "12px 50px 12px 0",
                      background: "transparent",
                      border: "none",
                      borderBottom: `2px solid ${focused === "password" ? "var(--accent)" : "var(--border)"}`,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 15, color: "var(--ink)",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    style={{ 
                      position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", 
                      background: "none", border: "none", cursor: "pointer", 
                      color: "var(--ink3)", fontSize: 13, fontWeight: 500,
                      display: "flex", alignItems: "center" 
                    }}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
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
                    marginBottom: "16px",
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
                    width: "100%", padding: "14px",
                    background: btnState === "success" ? "#16a34a" : "var(--accent)",
                    color: "#fff", border: "none",
                    borderRadius: 8,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 15, fontWeight: 600,
                    cursor: btnState !== "idle" ? "not-allowed" : "pointer",
                    opacity: btnState === "loading" ? 0.85 : 1,
                    transition: "background 0.25s, transform 0.15s",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  {btnContent()}
                </button>
              </form>

              {/* Google Login Button */}
              <button
                onClick={showComingSoon}
                style={{
                  width: "100%", padding: "14px",
                  background: "transparent",
                  color: "var(--ink2)",
                  border: "1.5px solid var(--border)",
                  borderRadius: 8,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14, fontWeight: 500,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  marginBottom: 20,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Login with Google
              </button>

              {/* Footer Links */}
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 8, cursor: "pointer" }} onClick={showComingSoon}>
                  Forget password? <span style={{ color: "var(--accent)", fontWeight: 500, textDecoration: "underline" }}>Click here</span>
                </p>
              </div>
            </div>
          </div>

          {/* Coming Soon Popup */}
          {showPopup && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 1000,
            }} onClick={() => setShowPopup(false)}>
              <div style={{
                background: "var(--card)", padding: "32px 48px", borderRadius: "var(--r)",
                boxShadow: "var(--shadow)", textAlign: "center", maxWidth: 320,
              }} onClick={e => e.stopPropagation()}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", background: "var(--accent2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                  </svg>
                </div>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
                  Coming Soon
                </h3>
                <p style={{ fontSize: 14, color: "var(--ink2)", marginBottom: 24 }}>
                  This feature is under development.
                </p>
                <button
                  onClick={() => setShowPopup(false)}
                  style={{
                    padding: "10px 24px", background: "var(--accent)", color: "#fff",
                    border: "none", borderRadius: "var(--rs)", fontSize: 14, fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Got it
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default Login;