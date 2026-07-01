import { useState, useEffect, memo } from "react";
import { api } from "../services/api";
import { ArrowRight, Code2, Cloud, Globe, MessageSquare, ShieldCheck, Sparkles, Zap, Video, Lock, Image, Layers, Smartphone, CheckCircle2, Palette, Bell, Search, Database, Cpu } from "lucide-react";
import ThemePicker from "../components/ThemePicker";

/*
UPDATED LEFT PANEL
------------------
✔ Scrollable panel (independent scroll)
✔ Top creator badge (moved from bottom)
✔ Safe for adding more sections (auto scroll)
✔ Clean + production-ready
*/
const GithubIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.79-.25.79-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.04-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.8 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.21.66.8.55A11.51 11.51 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z"/>
  </svg>
);

const LinkedinIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45Z"/>
  </svg>
);

const defaultTechStack = [
  { name: "MongoDB", subtitle: "Database" },
  { name: "Express.js", subtitle: "Backend" },
  { name: "React", subtitle: "Frontend" },
  { name: "Node.js", subtitle: "Runtime" },
  { name: "Azure", subtitle: "Cloud", live: true },
  { name: "Vercel", subtitle: "Edge", live: true },
];

const defaultFeatures = [
  { label: "Real-Time Messaging", icon: MessageSquare },
  { label: "Voice and Video Calls", icon: Video },
  { label: "Secure User Authentication", icon: ShieldCheck },
  { label: "Password Strength Validation", icon: Lock },
  { label: "Message Status Tracking", icon: CheckCircle2 },
  { label: "Privacy Modes", icon: Globe },
  { label: "User Blocking System", icon: ShieldCheck },
  { label: "Typing Indicators", icon: Zap },
  { label: "File and Media Sharing", icon: Image },
  { label: "Smart Media Preview", icon: Layers },
  { label: "Threaded Replies", icon: MessageSquare },
  { label: "Message Editing with History", icon: Code2 },
  { label: "Delete and Remove Controls", icon: Database },
  { label: "Online/Offline Presence", icon: Globe },
  { label: "Profile Avatars", icon: Image },
  { label: "Themes and Dark Mode", icon: Palette },
];

const defaultDeployments = [];

function TechCard({ name, subtitle, live, isDarkBG }) {
  return (
    <div
      className="rounded-lg border p-3 transition-all duration-300 hover:shadow-md"
      style={{
        borderColor: isDarkBG ? "rgba(255,255,255,0.1)" : "var(--border)",
        background: isDarkBG ? "rgba(255,255,255,0.05)" : "var(--card)",
        backdropFilter: isDarkBG ? "blur(8px)" : "none",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold" style={{ color: isDarkBG ? "#fff" : "var(--ink)" }}>{name}</h3>
        {live && (
          <div className="flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[8px] font-bold uppercase tracking-tighter text-green-500">Live</span>
          </div>
        )}
      </div>
      <p className="text-[10px] mt-1 font-bold uppercase tracking-wider" style={{ color: isDarkBG ? "rgba(255,255,255,0.6)" : "var(--ink)" }}>{subtitle}</p>
    </div>
  );
}

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
          background: "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontWeight: 700, fontSize: 17,
          color: "var(--ink)", letterSpacing: "-0.02em",
        }}>Chat App</span>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
          textTransform: "uppercase",
          background: "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%)",
          padding: "3px 8px", borderRadius: 100,
          marginLeft: 2,
          color: "#fff",
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

function StatCard({ value, label, isDarkBG }) {
  return (
    <div style={{
      flex: 1, padding: "14px 16px",
      background: isDarkBG ? "transparent" : "var(--card)",
      borderRight: isDarkBG ? "1px solid rgba(255,255,255,0.1)" : "1px solid var(--border)",
      transition: "background 0.3s",
    }}>
      <div style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: 20, fontWeight: 700,
        color: isDarkBG ? "#fff" : "var(--ink)", letterSpacing: "-0.02em",
      }}>{value}</div>
      <div style={{ fontSize: 11, color: isDarkBG ? "rgba(255,255,255,0.6)" : "var(--ink3)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function TrustItem({ icon, text, delay = 0, isDarkBG }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      fontSize: 13, color: isDarkBG ? "rgba(255,255,255,0.8)" : "var(--ink2)",
      animation: `fadeIn 0.4s ease ${delay}s both`,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        background: isDarkBG ? "rgba(255,255,255,0.1)" : "var(--accent2)",
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

const getPasswordStrength = (password) => {
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
    !/\s/.test(password),
  ];
  const passed = checks.filter(Boolean).length;

  if (!password) {
    return {
      isSecure: false,
      color: "var(--ink3)",
      text: "Use 8+ characters with uppercase, lowercase, number, and symbol.",
    };
  }

  if (!checks[5]) {
    return {
      isSecure: false,
      color: "#ef4444",
      text: "Password cannot contain spaces.",
    };
  }

  if (passed >= 6) {
    return {
      isSecure: true,
      color: "#16a34a",
      text: "Strong password.",
    };
  }

  if (passed >= 4) {
    return {
      isSecure: false,
      color: "#f59e0b",
      text: "Add uppercase, lowercase, number, and symbol.",
    };
  }

  return {
    isSecure: false,
    color: "#ef4444",
    text: "Weak password. Use 8+ characters with uppercase, lowercase, number, and symbol.",
  };
};

// ─── LeftPanel Component (from Login.jsx) ───────────────────────────────────
const LeftPanel = memo(({
  headline = "MERN stack project.",
  techStack = defaultTechStack,
  features = defaultFeatures,
  deployments = defaultDeployments,
  className = "",
  style = {},
  disableScroll = false,
}) => {
  return (
    <section
      className={`${disableScroll ? "h-auto" : "h-full"} overflow-hidden transition-colors duration-300 ${className}`}
      style={{
        background: "var(--bg2)",
        color: "var(--ink)",
        borderRight: disableScroll ? "none" : "1px solid var(--border)",
        borderTop: disableScroll ? "1px solid var(--border)" : "none",
        ...style,
      }}
    >
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .premium-gradient {
          background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
        }
        .premium-text-gradient {
          background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* SVG Gradient Definition for Icons */}
      <svg width="0" height="0" style={{ position: "absolute", visibility: "hidden" }}>
        <defs>
          <linearGradient id="theme-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gradient-start)" />
            <stop offset="100%" stopColor="var(--gradient-end)" />
          </linearGradient>
        </defs>
      </svg>

      {/* SCROLL CONTAINER */}
      <div className={`h-full ${disableScroll ? "" : "overflow-y-auto"} scroll-smooth px-6 py-10 sm:px-10 lg:px-14 hide-scrollbar`}>

{/* TOP CREATOR BADGE */}
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 flex items-center justify-center rounded-2xl"
              style={{ background: "var(--card2)", border: "1px solid var(--border)" }}
            >
              <Code2 className="h-6 w-6" color="url(#theme-gradient)" />
            </div>
            <div style={{ flex: 1 }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Created By</p>
              <p className="text-xs font-bold mb-2" style={{ color: "var(--ink)", lineHeight: 1.6 }}>
                Muhammad Bin Nasir (243595)
              </p>
              <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
                <a href="https://github.com/MuhammadKhann" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--ink2)", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                <GithubIcon className="h-3.5 w-3.5" />
                GitHub
              </a>
              <a href="https://www.linkedin.com/in/muhammad-bin-nasir-5b790b308" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--ink2)", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                <LinkedinIcon className="h-3.5 w-3.5" />
                LinkedIn
              </a>
              </div>
              <p className="text-[11px] font-semibold" style={{ color: "var(--ink2)" }}>BSCS-B 4th Semester — Air University</p>
              <p className="text-[11px] font-medium" style={{ color: "var(--ink2)" }}>Instructor: Muhammad Rashaf Jameel</p>
            </div>
          </div>
          <span className="hidden sm:flex items-center gap-2 text-xs" style={{ color: "var(--ink3)" }}>
            <Sparkles className="h-4 w-4" color="url(#theme-gradient)" />
          </span>
        </div>        {/* MAIN CONTENT */}
        <div className="space-y-10">

          {/* HEADLINE */}
          <div>
            <h1
              className="text-lg sm:text-xl lg:text-2xl font-bold leading-tight"
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                color: "var(--ink)"
              }}
            >
              {headline.split("\n").map((line, i) => (
                <span key={i} className="block">
                  {i === 1 ? (
                    <span className="premium-text-gradient inline-block">
                      {line}
                    </span>
                  ) : (
                    line
                  )}
                </span>
              ))}
            </h1>
            <p className="mt-3 max-w-xl text-xs sm:text-sm opacity-70" style={{ color: "var(--ink2)" }}>
              A MERN stack chat application built by BSCS-B 4th Semester students at Air University.
            </p>

          </div>

          {/* FEATURES */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, var(--border), transparent)" }}></div>
              <h2 className="text-[11px] uppercase font-extrabold tracking-[0.3em] whitespace-nowrap" style={{ color: "var(--ink)" }}>Core Capabilities</h2>
              <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, var(--border), transparent)" }}></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6 px-2">
              {[0, 1, 2, 3].map((colIndex) => (
                <ul key={colIndex} className="space-y-4">
                  {features.slice(colIndex * 4, colIndex * 4 + 4).map((f) => (
                    <li key={f.label} className="flex items-start gap-3 group">
                      <div className="mt-1">
                        <f.icon className="h-3.5 w-3.5 opacity-80 group-hover:opacity-100 transition-opacity" color="url(#theme-gradient)" />
                      </div>
                      <span className="text-[12px] font-medium leading-tight" style={{ color: "var(--ink2)" }}>{f.label}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>

          {/* TECH STACK */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, var(--border), transparent)" }}></div>
              <h2 className="text-[11px] uppercase font-extrabold tracking-[0.3em] whitespace-nowrap" style={{ color: "var(--ink)" }}>Architecture & Stack</h2>
              <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, var(--border), transparent)" }}></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {techStack.map((t) => (
                <TechCard key={t.name} {...t} />
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
});

// ─── Main Register Component (Modified signature) ───────────────────────────
function Register({ setPage, dark, setDark, themeId, setThemeId }) {
  const vw = useViewport();

  // Local theme state removed 

  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [focused, setFocused] = useState(null);
  const [btnState, setBtnState] = useState("idle"); // idle | loading | success
  const [errorMsg, setErrorMsg] = useState("");
  const [showPw, setShowPw] = useState(false);
  const passwordStrength = getPasswordStrength(formData.password);

  // Breakpoints
  const isMobile = vw < 900;
  const isTablet = vw >= 900 && vw < 1200;
  const isDesktop = vw >= 1200;

  // ── handleRegister (your backend logic) ──────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg(""); // Clear previous errors

    if (!passwordStrength.isSecure) {
      setErrorMsg("Please use a strong password before creating your account.");
      setTimeout(() => setErrorMsg(""), 4000);
      return;
    }

    setBtnState("loading");

    try {
      const response = await fetch(api("/api/auth/register"), {
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
          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
          <path d="M12 2a10 10 0 0110 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
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
        stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const LockIcon = (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const BoltIcon = (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M13 10V3L4 14h7v7l9-11h-7z"
        stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );


  return (
    <>
      <div style={{
        height: isMobile ? "auto" : "calc(var(--vh, 1vh) * 100)",
        minHeight: "calc(var(--vh, 1vh) * 100)",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        transition: "background 0.3s",
        overflow: isMobile ? "visible" : "hidden"
      }}>

        {/* TopBar */}
        <TopBar dark={dark} onToggle={() => setDark(!dark)} />

        {/* MAIN CONTENT - FULL SCREEN SPLIT */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          overflow: isMobile ? "visible" : "hidden",
        }}>

        {/* LEFT PANEL - WELCOME (70% on desktop, hidden on mobile) */}
        {!isMobile && (
          <LeftPanel style={{ flex: "0 0 70%", width: "70%" }} />
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
                <div style={{ position: "relative", marginBottom: 24 }}>
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="Password (Min. 8 characters)"
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
                <div
                  aria-live="polite"
                  style={{
                    marginTop: -14,
                    marginBottom: 18,
                    fontSize: 12,
                    fontWeight: 600,
                    color: passwordStrength.color,
                    lineHeight: 1.4,
                  }}
                >
                  {passwordStrength.text}
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={btnState !== "idle" || !passwordStrength.isSecure}
                  style={{
                    width: "100%", padding: "13px",
                    background: btnState === "success" ? "#16a34a" : "var(--accent)",
                    color: "#fff", border: "none",
                    borderRadius: "var(--rs)",
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em",
                    cursor: btnState !== "idle" || !passwordStrength.isSecure ? "not-allowed" : "pointer",
                    opacity: btnState === "loading" || !passwordStrength.isSecure ? 0.85 : 1,
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

      {/* MOBILE VIEW: LEFT PANEL AT BOTTOM */}
      {isMobile && (
        <LeftPanel style={{ width: "100%" }} disableScroll={true} />
      )}

    </>
  );
}

export default Register;
