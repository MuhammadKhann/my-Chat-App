import { useState, useEffect } from "react";
import Register from "./Register";
import Login from "./Login";
import Chat from "./Chat";
import { GlobalStyles, FontLoader } from "../components/GlobalStyles";
import { api } from "../services/api";

function App() {
  // --- INDESTRUCTIBLE INITIALIZER ---
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("nexusUser");
      
      // 1. Check if it's completely empty
      if (!savedUser) return null;

      // 2. Check if it's the dreaded "undefined" or "null" string
      if (savedUser === "undefined" || savedUser === "null") {
        localStorage.removeItem("nexusUser");
        return null;
      }

      // 3. Attempt to parse, catch errors if the JSON is partial/broken
      const parsed = JSON.parse(savedUser);
      
      // 4. Final verification: Does it actually have an ID?
      if (parsed && (parsed.id || parsed._id)) {
        // Normalize: ensure `id` always exists for Chat.jsx
        parsed.id = parsed._id || parsed.id;
        return parsed;
      }
      return null;

    } catch (error) {
      // If ANY of the above fails, nuke the storage and start fresh
      console.error("Persistence Corrupted. Resetting session...");
      localStorage.removeItem("nexusUser");
      return null;
    }
  }); // Stores the logged-in user's info

  const [page, setPage] = useState(user ? "chat" : "login");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  
  const [dark, setDark] = useState(() => {
    const savedTheme = localStorage.getItem("nexus-theme");
    return savedTheme === "dark";
  });

  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem("nexus-color-theme") || "cosmic";
  });

  useEffect(() => {
    localStorage.setItem("nexus-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem("nexus-color-theme", themeId);
  }, [themeId]);

  useEffect(() => {
    // If there is no local storage, the user explicitly didn't check "Remember Me".
    // They want strict behavior: a page refresh should log them out.
    const hasStorage = localStorage.getItem("nexusUser");
    if (!hasStorage) {
      setIsCheckingAuth(false);
      // Fire a silent logout to ensure the backend cookie is securely destroyed 
      // preventing the session from silently lingering in the background.
      fetch(api("/api/logout"), { method: "POST", credentials: "include" }).catch(() => {});
      return;
    }

    const checkAuth = async () => {
      try {
        const res = await fetch(api("/api/auth/check"), {
          method: "GET",
          credentials: "include", // Mandatory to send the JWT cookie
        });

        if (res.ok) {
          const authenticatedUser = await res.json();
          // Normalize: MongoDB returns `_id`, but Chat.jsx uses `user.id` everywhere.
          // Ensure BOTH keys exist so nothing breaks.
          authenticatedUser.id = authenticatedUser._id || authenticatedUser.id;
          setUser(authenticatedUser); // Sync UI with the REAL server session
          setPage("chat");
        } else {
          // If cookie is invalid or missing, force logout/login
          setUser(null);
          setPage("login");
          localStorage.removeItem("nexusUser");
        }
      } catch (error) {
        console.error("Auth Check failed:", error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  if (isCheckingAuth) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: dark ? "#0c0e13" : "#eef0f4" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 15 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
            <circle cx="12" cy="12" r="10" stroke={dark ? "#3b74f8" : "#1a56f0"} strokeWidth="3" strokeDasharray="30"/>
          </svg>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: dark ? "#5c6480" : "#8590a6" }}>Authenticating secure session...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <FontLoader />
      <GlobalStyles dark={dark} themeId={themeId} />
      {/* 1. If no user is logged in, show Login or Register */}
      {!user ? (
        <>
          {page === "register" && (
            <Register setPage={setPage} dark={dark} setDark={setDark} />
          )}
          {page === "login" && (
            <Login setPage={setPage} dark={dark} setDark={setDark} setUser={setUser} />
          )}
        </>
      ) : page === "chat" && user ? (
        /* 2. If a user is logged in, show the Chat Dashboard */
        <Chat user={user} setPage={setPage} setUser={setUser} dark={dark} setDark={setDark} themeId={themeId} setThemeId={setThemeId} />
      ) : page === "chat" && !user ? (
        /* Safety Fallback: if somehow on chat page without a user, force redirect to login */
        setPage("login")
      ) : null}
    </>
  );
}

export default App;