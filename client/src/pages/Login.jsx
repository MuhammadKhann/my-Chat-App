import { useState, useEffect, memo } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { api } from "../services/api";
import ThemePicker from "../components/ThemePicker";
import GoogleAuthButton from "../components/GoogleAuthButton";
import authService from "../services/authService";
import {
  ArrowRight,
  Code2,
  Cloud,
  Globe,
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
  Github,
  Linkedin,
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
                
                  href="https://github.com/MuhammadKhann"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--ink2)", fontSize: 11, fontWeight: 600, textDecoration: "none" }}
                >
                  <Github className="h-3.5 w-3.5" />
                  GitHub
                </a>
                
                  href="https://www.linkedin.com/in/muhammad-bin-nasir-5b790b308"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--ink2)", fontSize: 11, fontWeight: 600, textDecoration: "none" }}
                >
                  <Linkedin className="h-3.5 w-3.5" />
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
        </div>
</div>

          <span className="hidden sm:flex items-center gap-2 text-xs" style={{ color: "var(--ink3)" }}>
            <Sparkles className="h-4 w-4" color="url(#theme-gradient)" />
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
  const [focused, setFocused] = useState(null);
  const [btnState, setBtnState] = useState("idle");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [comingSoon, setComingSoon] = useState(null);
  const [googlePending, setGooglePending] = useState(null);
  const [googleUsername, setGoogleUsername] = useState("");
  const [googleErrorMsg, setGoogleErrorMsg] = useState("");

  const showComingSoon = (type) => {
    setComingSoon(type);
    setTimeout(() => setComingSoon(null), 2000);
  };

  const resetGoogleState = () => {
    setGooglePending(null);
    setGoogleUsername("");
    setGoogleErrorMsg("");
  };

  // Check for OAuth pending state (returning from redirect flow)
  useEffect(() => {
    const oauthPending = sessionStorage.getItem('oauth_pending');
    if (oauthPending) {
      try {
        const data = JSON.parse(oauthPending);
        if (data.requiresUsername && data.tempToken) {
          setGooglePending({
            tempToken: data.tempToken,
            email: data.profile.email,
            name: data.profile.name,
            picture: data.profile.picture,
            isPKCE: true,
          });
          // Clear from sessionStorage so it doesn't trigger again
          sessionStorage.removeItem('oauth_pending');
        }
      } catch (e) {
        console.error('Failed to parse oauth_pending:', e);
        sessionStorage.removeItem('oauth_pending');
      }
    }
  }, []);

  const isMobile = vw < 900;
  const isTablet = vw >= 900 && vw < 1200;
  const isDesktop = vw >= 1200;

  const handleLogin = async (e) => {
    e.preventDefault();
    setBtnState("loading");
    resetGoogleState();
    try {
      const response = await fetch(api("/api/auth/login"), {
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

  const handleGoogleSuccess = async (credentialResponse) => {
    setErrorMsg("");
    setGoogleErrorMsg("");
    setBtnState("loading");

    try {
      const response = await fetch(api("/api/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || "Google login failed.");
        setBtnState("idle");
        return;
      }

      if (data.isNewUser) {
        setGooglePending({
          credential: credentialResponse.credential,
          email: data.email,
          name: data.name,
          picture: data.picture,
        });
        setGoogleUsername("");
        setBtnState("idle");
        return;
      }

      data.id = data._id || data.id;
      if (data.token) localStorage.setItem("chatAppToken", data.token);
      if (rememberMe) localStorage.setItem("chatAppUser", JSON.stringify(data));
      setUser(data);
      setTimeout(() => setPage("chat"), 500);
    } catch (err) {
      console.error(err);
      setErrorMsg("Google sign-in failed. Please try again.");
      setBtnState("idle");
    }
  };

  const handleGoogleError = () => {
    setErrorMsg("Google sign-in failed. Please try again.");
  };

  const handleGoogleRegister = async (e) => {
    e.preventDefault();
    if (!googlePending) return;
    if (!googleUsername.trim()) {
      setGoogleErrorMsg("Username is required to complete sign in.");
      return;
    }

    setBtnState("loading");
    setGoogleErrorMsg("");

    try {
      const response = await fetch(api("/api/auth/google/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          credential: googlePending.credential,
          username: googleUsername.trim(),
          email: googlePending.email,
          name: googlePending.name,
          picture: googlePending.picture,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setGoogleErrorMsg(data.error || "Could not complete Google registration.");
        setBtnState("idle");
        return;
      }

      data.id = data._id || data.id;
      if (data.token) localStorage.setItem("chatAppToken", data.token);
      if (rememberMe) localStorage.setItem("chatAppUser", JSON.stringify(data));
      setUser(data);
      resetGoogleState();
      setTimeout(() => setPage("chat"), 500);
    } catch (err) {
      console.error(err);
      setGoogleErrorMsg("Google registration failed. Please try again.");
      setBtnState("idle");
    }
  };

  // ============ NEW PKCE OAUTH HANDLERS ============

  const handlePKCESuccess = (result) => {
    const { user, token } = result;

    if (token) localStorage.setItem("chatAppToken", token);
    if (rememberMe) localStorage.setItem("chatAppUser", JSON.stringify(user));

    setUser(user);
    setTimeout(() => setPage("chat"), 500);
  };

  const handlePKCEUsernameRequired = (result) => {
    // New user needs to choose username
    setGooglePending({
      tempToken: result.tempToken,
      email: result.profile.email,
      name: result.profile.name,
      picture: result.profile.picture,
      isPKCE: true, // Flag to indicate this is PKCE flow
    });
    setGoogleUsername("");
    setBtnState("idle");
  };

  const handlePKCEError = (errorCode) => {
    setErrorMsg("Google sign-in failed. Please try again.");
    setBtnState("idle");
  };

  // Modified Google registration to handle both legacy and PKCE flows
  const handlePKCEGoogleRegister = async (e) => {
    e.preventDefault();
    if (!googlePending) return;
    if (!googleUsername.trim()) {
      setGoogleErrorMsg("Username is required to complete sign in.");
      return;
    }

    setBtnState("loading");
    setGoogleErrorMsg("");

    try {
      // Check if this is PKCE flow or legacy flow
      if (googlePending.isPKCE) {
        // PKCE flow registration
        const result = await authService.completeOAuthRegistration(
          googlePending.tempToken,
          googleUsername.trim()
        );

        if (!result.success) {
          setGoogleErrorMsg(result.error || "Could not complete registration.");
          setBtnState("idle");
          return;
        }

        const { user, token } = result;
        if (token) localStorage.setItem("chatAppToken", token);
        if (rememberMe) localStorage.setItem("chatAppUser", JSON.stringify(user));
        setUser(user);
        resetGoogleState();
        setTimeout(() => setPage("chat"), 500);
      } else {
        // Legacy flow - use original handler
        await handleGoogleRegister(e);
      }
    } catch (err) {
      console.error(err);
      setGoogleErrorMsg("Registration failed. Please try again.");
      setBtnState("idle");
    }
  };

  const btnContent = () => {
    if (btnState === "loading") return (
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          style={{ animation: "spin 0.8s linear infinite" }}>
          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
          <path d="M12 2a10 10 0 0110 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
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
            <LeftPanel style={{ flex: "0 0 70%", width: "70%" }} />
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
              <h1 className="premium-text-gradient" style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700,
                fontSize: 32,
                marginBottom: 8,
                letterSpacing: "-0.02em",
                display: "inline-block"
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={btnState !== "idle"}
                  className="premium-gradient"
                  style={{
                    width: "100%", padding: "14px",
                    color: "#fff", border: "none",
                    borderRadius: 8,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 15, fontWeight: 700,
                    cursor: btnState !== "idle" ? "not-allowed" : "pointer",
                    opacity: btnState === "loading" ? 0.85 : 1,
                    transition: "transform 0.15s, opacity 0.15s",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 16,
                    boxShadow: "0 4px 15px -5px var(--accent)",
                  }}
                  onMouseOver={e => { if (btnState === "idle") e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {btnContent()}
                </button>
              </form>

              {googlePending ? (
                <form onSubmit={handlePKCEGoogleRegister} style={{ marginTop: 16 }}>
                  <div style={{ marginBottom: 16 }}>
                    <input
                      type="text"
                      placeholder="Choose a username"
                      value={googleUsername}
                      onChange={(e) => setGoogleUsername(e.target.value)}
                      style={{
                        width: "100%", padding: "12px 12px",
                        background: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 15, color: "var(--ink)",
                        outline: "none",
                      }}
                    />
                  </div>
                  {googleErrorMsg && (
                    <div style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      color: "#ef4444",
                      padding: "10px 14px",
                      borderRadius: "var(--rs)",
                      fontSize: "12px",
                      fontWeight: 500,
                      marginBottom: "16px",
                    }}>
                      {googleErrorMsg}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={btnState !== "idle"}
                    style={{
                      width: "100%", padding: "14px",
                      background: "var(--accent)",
                      color: "#fff", border: "none",
                      borderRadius: 8,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 15, fontWeight: 700,
                      cursor: btnState !== "idle" ? "not-allowed" : "pointer",
                      opacity: btnState === "loading" ? 0.85 : 1,
                      transition: "transform 0.15s, opacity 0.15s",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginBottom: 16,
                    }}
                  >
                    {btnState === "loading" ? "Completing sign in…" : "Continue with Google"}
                  </button>
                  <button
                    type="button"
                    onClick={resetGoogleState}
                    style={{
                      width: "100%", padding: "14px",
                      background: "transparent",
                      color: "var(--ink2)", border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 14, fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <GoogleAuthButton
                  onSuccess={handlePKCESuccess}
                  onError={handlePKCEError}
                  onUsernameRequired={handlePKCEUsernameRequired}
                  style={{ marginBottom: 20 }}
                />
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
            <LeftPanel style={{ width: "100%" }} disableScroll={true} />
          )}

        </div>
      </div>
    </>
  );
}

export default Login;
