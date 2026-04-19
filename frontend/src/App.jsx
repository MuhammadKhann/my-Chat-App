import { useState, useEffect } from "react";
import Register from "./Register";
import Login from "./Login";
import Chat from "./Chat"; // We will create this file next

function App() {
  const [page, setPage] = useState("login");
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
      return (parsed && (parsed.id || parsed._id)) ? parsed : null;

    } catch (error) {
      // If ANY of the above fails, nuke the storage and start fresh
      console.error("Persistence Corrupted. Resetting session...");
      localStorage.removeItem("nexusUser");
      return null;
    }
  }); // Stores the logged-in user's info
  
  const [dark, setDark] = useState(() => {
    const savedTheme = localStorage.getItem("nexus-theme");
    return savedTheme === "dark";
  });

  useEffect(() => {
    localStorage.setItem("nexus-theme", dark ? "dark" : "light");
  }, [dark]);

  // --- AUTO-NAVIGATE TO CHAT WHEN USER IS LOADED ---
  // This ensures on every reload, if a user exists (from Remember Me),
  // the page automatically navigates to chat instead of staying stuck on login
  useEffect(() => {
    if (user) {
      setPage("chat");
    }
  }, [user]);

  return (
    <div>
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
        <Chat user={user} setPage={setPage} setUser={setUser} dark={dark} setDark={setDark} />
      ) : page === "chat" && !user ? (
        /* Safety Fallback: if somehow on chat page without a user, force redirect to login */
        setPage("login")
      ) : null}
    </div>
  );
}

export default App;