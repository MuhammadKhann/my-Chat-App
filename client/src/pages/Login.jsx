import { useState, useEffect, memo } from "react";
import { api } from "../services/api";
import ThemePicker from "../components/ThemePicker";
import {
  ArrowRight,
  Code2,
  Cloud,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Zap,
  Video,
  Lock,
  Image,
  Layers,
  Smartphone,
  CheckCircle2,
  Palette,
  Bell,
  Search,
  Database,
  Cpu,
} from "lucide-react";

/*
UPDATED LEFT PANEL
------------------
✔ Scrollable panel (independent scroll)
✔ Top creator badge (moved from bottom)
✔ Safe for adding more sections (auto scroll)
✔ Clean + production-ready
*/

const defaultTechStack = [
  { name: "MongoDB", subtitle: "Database" },
  { name: "Express.js", subtitle: "Backend" },
  { name: "React", subtitle: "Frontend" },
  { name: "Node.js", subtitle: "Runtime" },
  { name: "Azure", subtitle: "Cloud", live: true },
  { name: "Vercel", subtitle: "Edge", live: true },
];

const defaultFeatures = [
  { label: "Real-time Messaging", icon: MessageSquare },
  { label: "Voice & Video Calls", icon: Video },
  { label: "End-to-End Encryption", icon: Lock },
  { label: "Online Status Tracking", icon: Globe },
  { label: "File & Image Sharing", icon: Image },
  { label: "Multiple UI Themes", icon: Layers },
  { label: "Responsive Interface", icon: Smartphone },
  { label: "Message Receipts", icon: CheckCircle2 },
  { label: "Typing Indicators", icon: Zap },
  { label: "Global User Search", icon: Search },
  { label: "JWT Secure Auth", icon: ShieldCheck },
  { label: "Persistent History", icon: Database },
  { label: "Smart Link Previews", icon: ExternalLink },
  { label: "Secure Cloud Backup", icon: Cloud },
  { label: "Real-time Alerts", icon: Bell },
  { label: "High Performance", icon: Cpu },
];

const defaultDeployments = [];

function InfoPill({ icon: Icon, children, href }) {
  const content = (
    <>
      <Icon className="h-4 w-4" style={{ color: "var(--accent)" }} />
      <span>{children}</span>
    </>
  );

  if (href) {
    return (
      <a 
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs sm:text-sm backdrop-blur transition hover:opacity-80 no-underline"
        style={{
          borderColor: "var(--border)",
          background: "var(--card2)",
          color: "var(--ink2)"
        }}
      >
        {content}
      </a>
    );
  }

  return (
    <div 
      className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs sm:text-sm backdrop-blur"
      style={{
        borderColor: "var(--border)",
        background: "var(--card2)",
        color: "var(--ink2)"
      }}
    >
      {content}
    </div>
  );
}

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

function DeploymentCard({ name, subtitle, detail, status, icon: Icon }) {
  return (
    <div 
      className="rounded-xl border p-4"
      style={{
        borderColor: "var(--border)",
        background: "var(--card2)",
      }}
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <div 
            className="h-10 w-10 flex items-center justify-center rounded-lg"
            style={{
              background: "var(--accent2)",
            }}
          >
            <Icon className="h-5 w-5" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{name}</h3>
            <p className="text-xs" style={{ color: "var(--ink3)" }}>{subtitle}</p>
          </div>
        </div>
        <span 
          className="text-[10px] px-2 py-1 rounded-full font-medium"
          style={{
            background: "rgba(34, 197, 94, 0.1)",
            color: "#22c55e",
          }}
        >
          {status}
        </span>
      </div>
      <p className="text-xs mt-3" style={{ color: "var(--ink2)" }}>{detail}</p>
    </div>
  );
}

const LeftPanel = memo(({
  name = "Muhammad Bin Nasir",
  description = "Computer Science student building scalable MERN applications.",
  location = "Multan, Pakistan",
  email = "Muhammad.243595@gmail.com",
  linkedin = "https://www.linkedin.com/in/muhammad-bin-nasir-5b790b308/",
  headline = "MERN stack\npractice project.",
  techStack = defaultTechStack,
  features = defaultFeatures,
  deployments = defaultDeployments,
  className = "",
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
      }}
    >
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .premium-gradient {
          background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
        }
      `}</style>
      {/* SCROLL CONTAINER */}
      <div className={`h-full ${disableScroll ? "" : "overflow-y-auto"} scroll-smooth px-6 py-10 sm:px-10 lg:px-14 hide-scrollbar`}>

        {/* TOP CREATOR BADGE */}
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="h-12 w-12 flex items-center justify-center rounded-2xl premium-gradient"
            >
              <Code2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium opacity-60" style={{ color: "var(--ink3)" }}>Created By</p>
              <p className="text-lg font-bold" style={{ color: "var(--ink)" }}>{name}</p>
              <p className="text-xs font-medium opacity-60" style={{ color: "var(--ink3)" }}>Full Stack Developer</p>
            </div>
          </div>

          <span className="hidden sm:flex items-center gap-2 text-xs" style={{ color: "var(--ink3)" }}>
            <Sparkles className="h-4 w-4" style={{ color: "var(--accent)" }} />
          </span>
        </div>

        {/* MAIN CONTENT */}
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
                    <span className="premium-gradient inline-block bg-clip-text text-transparent" style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {line}
                    </span>
                  ) : (
                    line
                  )}
                </span>
              ))}
            </h1>
            <p className="mt-3 max-w-xl text-xs sm:text-sm opacity-70" style={{ color: "var(--ink2)" }}>
              {description}
            </p>
          </div>

          {/* INFO */}
          <div className="flex flex-wrap gap-2">
            <InfoPill icon={MapPin}>{location}</InfoPill>
            <InfoPill icon={Mail}>{email}</InfoPill>
            <InfoPill icon={ExternalLink} href={linkedin}>LinkedIn Profile</InfoPill>
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
                        <f.icon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: "var(--accent)" }} />
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
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%)",
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
          textTransform: "uppercase", 
          background: "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%)", 
          padding: "3px 8px", borderRadius: 100,
          marginLeft: 2,
          color: "#fff",
        }}>Beta</span>
      </div>

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
function Login({ setPage, dark, setDark, setUser, themeId, setThemeId }) {
  const vw = useViewport();

  // 2. INTERNAL THEME STATE REMOVED

  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [focused, setFocused]   = useState(null);
  const [btnState, setBtnState] = useState("idle"); 
  const [showPw, setShowPw]     = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [comingSoon, setComingSoon] = useState(null); // 'google' | 'forgot' | null

  const showComingSoon = (type) => {
    setComingSoon(type);
    setTimeout(() => setComingSoon(null), 2000);
  };

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
      <div style={{ 
        height: isMobile ? "auto" : "calc(var(--vh, 1vh) * 100)", 
        minHeight: "calc(var(--vh, 1vh) * 100)",
        display: "flex", 
        flexDirection: "column", 
        background: "var(--bg)", 
        transition: "background 0.3s", 
        overflow: isMobile ? "visible" : "hidden" 
      }}>
        
        {/* TOPBAR */}
        <TopBar dark={dark} onToggle={() => setDark(!dark)} themeId={themeId} setThemeId={setThemeId} />

        {/* MAIN CONTENT - FULL SCREEN SPLIT */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          overflow: isMobile ? "visible" : "hidden",
        }}>

          {/* LEFT PANEL - WELCOME (70% on desktop, hidden on mobile) */}
          {!isMobile && (
            <LeftPanel className="flex-[0_0_70%]" />
          )}

          {/* RIGHT PANEL — FORM (30% on desktop, full on mobile) */}
          <div style={{
            flex: isMobile ? "0 0 auto" : "0 0 30%",
            width: isMobile ? "100%" : "auto",
            height: isMobile ? "auto" : "100%",
            padding: isMobile ? "40px 24px" : "52px 48px",
            background: "var(--card)",
            display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
            transition: "background 0.3s",
            overflow: isMobile ? "visible" : "auto",
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

                <div style={{ position: "relative", marginBottom: 16 }}>
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

                {/* Remember Me Checkbox */}
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px", 
                  marginBottom: "20px",
                }}>
                  <input 
                    type="checkbox" 
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ 
                      cursor: "pointer",
                      width: 18,
                      height: 18,
                      accentColor: "var(--accent)",
                    }}
                  />
                  <label htmlFor="rememberMe" style={{ cursor: "pointer", fontSize: 14, color: "var(--ink2)", fontWeight: 500 }}>
                    Remember me
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
                onClick={() => showComingSoon('google')}
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
                  marginBottom: comingSoon === 'google' ? 8 : 20,
                  position: "relative",
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
              {comingSoon === 'google' && (
                <p style={{ fontSize: 12, color: "var(--accent)", textAlign: "center", marginBottom: 20, fontWeight: 500 }}>
                  Coming Soon
                </p>
              )}

              {/* Footer Links */}
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "var(--ink3)", cursor: "pointer" }} onClick={() => showComingSoon('forgot')}>
                  Forget password? <span style={{ color: "var(--accent)", fontWeight: 500, textDecoration: "underline" }}>Click here</span>
                </p>
                {comingSoon === 'forgot' && (
                  <p style={{ fontSize: 12, color: "var(--accent)", marginTop: 4, fontWeight: 500 }}>
                    Coming Soon
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* MOBILE VIEW: LEFT PANEL AT BOTTOM */}
          {isMobile && (
            <LeftPanel className="w-full" disableScroll={true} />
          )}

        </div>
      </div>
    </>
  );
}

export default Login;