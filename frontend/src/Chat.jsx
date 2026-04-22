import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

// --- UPGRADED: SECURE SOCKET CONNECTION ---
const socket = io("http://localhost:5000", {
  withCredentials: true, // CRITICAL: Allows the socket to send the JWT cookie to the server
  transports: ["websocket"]
});

function Chat({ user, setPage, setUser, dark, setDark }) {
  const [activeTab, setActiveTab] = useState("chats");
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // --- Messaging States ---
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  // --- TYPING INDICATOR STATE ---
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isMeTyping, setIsMeTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const [chatList, setChatList] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  // --- NEW: FILE UPLOAD STATE ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // --- NEW: Tracks 0 to 100
  const scrollRef = useRef();

  // --- CLOUDINARY DOWNLOAD HELPER ---
  const getDownloadUrl = (url, fallbackName) => {
    if (!url) return "#";

    // 1. Force Cloudinary to send it as an attachment (Download)
    let safeUrl = url.replace("/upload/", "/upload/fl_attachment/");

    // 2. Ensure it ends with .pdf if it's a document but missing the extension
    if (!safeUrl.toLowerCase().endsWith('.pdf') && !safeUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      safeUrl += ".pdf";
    }

    return safeUrl;
  };

  // --- PROGRAMMATIC DOWNLOAD HELPER ---
  const handleDownload = async (url, fileName) => {
    try {
      // 1. Force the Cloudinary URL to be a download link
      const downloadUrl = url.replace("/upload/", "/upload/fl_attachment/");

      // 2. Fetch the file data
      const response = await fetch(downloadUrl);
      const blob = await response.blob();

      // 3. Create a temporary 'virtual' URL for the file blob
      const blobUrl = window.URL.createObjectURL(blob);

      // 4. Create a hidden link and click it automatically
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || "document.pdf";
      document.body.appendChild(link);
      link.click();

      // 5. Cleanup: remove the link and revoke the blob URL
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: Open in a new tab if the fetch fails
      window.open(url, "_blank");
    }
  };

  // 1. Generate a unique Room ID based on both User IDs
  const getRoomId = (id1, id2) => [id1, id2].sort().join("_");

  // --- 1. JOIN PERSONAL ROOM ON LOAD ---
  useEffect(() => {
    if (user) {
      socket.emit("join_personal", user.id);
    }
  }, [user]);

  // --- 2. FETCH HISTORY & MARK SEEN WHEN OPENING A CHAT ---
  useEffect(() => {
    if (selectedUser) {
      const room = getRoomId(user.id, selectedUser._id);

      fetch(`http://localhost:5000/messages/${room}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => setChatHistory(data))
        .catch(err => console.error(err));

      // Tell the server we opened this chat
      socket.emit("mark_room_seen", { room, userId: user.id, partnerId: selectedUser._id });

      // Clear the unread count locally for the selected user
      setChatList(prev => prev.map(chat =>
        chat._id === selectedUser._id ? { ...chat, unreadCount: 0 } : chat
      ));
    }
  }, [selectedUser, user.id]);

  // --- 3. THE REAL-TIME ENGINE (Ticks & Incoming Messages) ---
  useEffect(() => {
    // --- CRITICAL RECONNECTION LOGIC ---
    // If the socket was killed by a previous logout, wake it back up!
    if (socket && !socket.connected) {
      socket.connect();
    }

    if (user) {
      socket.emit("add_user", user.id);
    }

    socket.on("message_confirmed", ({ tempId, dbId, status, createdAt }) => {
      // Replace the optimistic (temp) message with the confirmed DB record
      // This is critical: all future status_changed events use the real dbId
      setChatHistory(prev => prev.map(m =>
        (m._id === "temp_" + tempId || m.tempId === tempId)
          ? { ...m, _id: dbId, status: status || 'sent', createdAt: createdAt }
          : m
      ));
    });

    // ✅ NEW: Handle send errors from the backend
    socket.on("send_error", ({ error }) => {
      console.error("❌ Message Send Error:", error);
      alert(`Message Error: ${error}`);
      // Optionally remove the failed optimistic message from chat history
      // This prevents "stuck" messages from cluttering the UI
    });

    socket.on("receive_message", (incomingMsg) => {
      // THE SAFETY NET: Force the shape to match the UI's expectations
      const normalizedMsg = {
        ...incomingMsg,
        // Fallbacks in case the payload is slightly malformed
        sender: incomingMsg.sender || incomingMsg.senderId,
        timestamp: incomingMsg.timestamp || incomingMsg.createdAt || new Date().toISOString(),
        status: incomingMsg.status || "delivered"
      };

      setChatHistory((prev) => [...prev, normalizedMsg]);

      // Optional: Tell the server we saw it so the sender gets double ticks!
      if (selectedUser && normalizedMsg.sender === selectedUser._id) {
        socket.emit("messages_seen", {
          senderId: selectedUser._id,
          receiverId: user.id
        });
      }
    });

    socket.on("status_changed", ({ msgId, status }) => {
      setChatHistory(prev => prev.map(m => m._id === msgId ? { ...m, status } : m));
    });

    socket.on("room_marked_seen", () => {
      setChatHistory(prev => prev.map(m => ({ ...m, status: 'seen' })));
    });

    // Receive the full list when we first log in
    socket.on("online_users_list", (users) => {
      setOnlineUsers(new Set(users));
    });

    // Listen for people logging in or out in real-time
    socket.on("user_status_change", ({ userId, isOnline }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        if (isOnline) newSet.add(userId);
        else newSet.delete(userId);
        return newSet;
      });
    });

    socket.on("user_typing", (data) => {
      // Only show the indicator if we are actually looking at their chat
      if (selectedUser && data.senderId === selectedUser._id) {
        setIsPartnerTyping(data.typing);
      }
    });

    return () => {
      socket.off("message_confirmed");
      socket.off("send_error");
      socket.off("receive_message");
      socket.off("status_changed");
      socket.off("room_marked_seen");
      socket.off("online_users_list");
      socket.off("user_status_change");
      socket.off("user_typing");
    };
  }, [selectedUser, user.id]);

  // 4. Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // --- SMART KEYSTROKE HANDLER ---
  const handleKeystroke = () => {
    if (!selectedUser) return;

    // 1. Only tell the server we started if we weren't already typing
    if (!isMeTyping) {
      setIsMeTyping(true);
      socket.emit("typing_start", {
        senderId: user.id,
        receiver: selectedUser._id
      });
    }

    // 2. Reset the "stop" timer every time a key is pressed
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // 3. If we stop typing for 2 seconds, tell the server we stopped
    typingTimeoutRef.current = setTimeout(() => {
      setIsMeTyping(false);
      socket.emit("typing_stop", {
        senderId: user.id,
        receiver: selectedUser._id
      });
    }, 2000);
  };

  const fetchChatList = async () => {
    try {
      const res = await fetch(`http://localhost:5000/chats/${user.id}`, { credentials: 'include' });
      const data = await res.json();
      setChatList(data);
    } catch (err) { console.error(err); }
  };

  // Fetch list on load and when a user is selected
  useEffect(() => {
    if (user.id) fetchChatList();
  }, [user.id, selectedUser]);

  // --- UPGRADED: STRICT FILE VALIDATION (EXTENSION & SIZE) ---
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Check for valid extension
    if (!file.name.includes('.')) {
      alert("⚠️ Invalid File: Your file is missing an extension. Please rename it on your computer to include '.pdf', '.jpg', etc. before uploading.");
      e.target.value = ""; // Reset the input
      return;
    }

    // 2. Check File Size (10MB Limit)
    const MAX_FILE_SIZE_MB = 10;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      // Calculate exactly how big their file is to 2 decimal places
      const actualSizeMB = (file.size / (1024 * 1024)).toFixed(2);

      alert(`⚠️ File too large (${MAX_FILE_SIZE_MB}MB max). Your file is ${actualSizeMB}MB.`);
      e.target.value = ""; // Reset the input
      return;
    }

    // 3. If it passes all checks, set the file
    setSelectedFile(file);
  };

  // 6. Send Message Function - With TempId for No Duplicates
  const sendMessage = async (e) => {
    e.preventDefault();

    // ✅ BULLETPROOF GUARD: Ensure user and selectedUser exist before proceeding
    if (!user || !user.id) {
      console.error("❌ CRITICAL: User session lost. Cannot send message.");
      alert("Session lost. Please log in again.");
      return;
    }

    if (!selectedUser || !selectedUser._id) {
      console.error("❌ CRITICAL: No user selected. Cannot send message.");
      alert("Please select a user to message.");
      return;
    }

    // --- INSTANT TYPING CLEAR ON SEND ---
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isMeTyping) {
      setIsMeTyping(false);
      socket.emit("typing_stop", { senderId: user.id, receiver: selectedUser._id });
    }

    if (!message.trim() && !selectedFile) return;

    const tempId = Date.now().toString();
    const room = getRoomId(user.id, selectedUser._id);

    let fileUrl = null;
    let fileName = null;
    let fileType = null;

    // --- UPDATED FILE UPLOAD LOGIC IN sendMessage ---
    if (selectedFile) {
      setIsUploading(true);
      setUploadProgress(0); // Reset progress at start

      const formData = new FormData();
      formData.append("file", selectedFile, selectedFile.name);

      try {
        // --- ENTERPRISE UPLOAD: XHR with Progress Tracking ---
        const data = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "http://localhost:5000/upload");

          // 1. Listen to the upload progress
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(percentComplete); // Update the UI in real-time!
            }
          };

          // 2. Handle the final response
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error("Upload failed on server"));
            }
          };

          // 3. Handle network crashes
          xhr.onerror = () => reject(new Error("Network Error"));

          // 4. Fire the payload
          xhr.send(formData);
        });
        // -----------------------------------------------------

        if (data.fileUrl) {
          fileUrl = data.fileUrl;
          fileName = data.fileName || selectedFile.name;
          fileType = data.fileType || selectedFile.type;
        }
      } catch (err) {
        console.error("Upload failed:", err);
        alert("Upload failed. Check console for details.");
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      setIsUploading(false);
      setUploadProgress(0);
    }

    // 1. CONSTRUCT THE PERFECT LOCAL REPLICA
    const optimisticMessage = {
      _id: "temp_" + tempId,               // ✅ Uses the SAME tempId sent to server
      tempId: tempId,                      // ✅ Stored for reconciliation fallback
      sender: user.id,                     // Matches your `isMe` check exactly
      receiver: selectedUser._id,
      text: message,
      fileUrl: fileUrl,                    // From your upload logic
      fileName: fileName,
      fileType: fileType,
      timestamp: new Date().toISOString(), // Used for display until createdAt arrives
      status: "sent"                       // Instantly triggers the single tick (✓)
    };

    // 2. INSTANTLY UPDATE THE UI
    setChatHistory((prev) => [...prev, optimisticMessage]);

    // 3. EMIT TO THE SERVER
    socket.emit("send_message", {
      tempId: tempId,                        // ✅ So server can echo it back
      sender: user.id.toString(),           // ✅ Ensure ID is a string
      receiver: selectedUser?._id?.toString(), // ✅ Ensure ID is a string
      text: message,
      fileUrl: fileUrl,
      fileName: fileName,
      fileType: fileType,
      fileSize: selectedFile?.size || null, // ✅ Include file size
      room: room,                           // ✅ Always send the room
      status: "sent"
    });

    // 4. NOW YOU CAN CLEAR THE INPUTS
    setMessage("");
    setSelectedFile(null);
  };

  const clearChat = async () => {
    if (!selectedUser) return;

    const confirmDelete = window.confirm(`Are you sure you want to clear all messages with ${selectedUser?.username}?`);

    if (confirmDelete) {
      const room = getRoomId(user.id, selectedUser._id);
      try {
        const res = await fetch(`http://localhost:5000/messages/delete/${room}`, {
          method: "DELETE",
          credentials: 'include',
        });

        if (res.ok) {
          setChatHistory([]); // Empty the message window
          // Refresh the sidebar list immediately
          const updatedList = chatList.filter(item => item._id !== selectedUser._id);
          setChatList(updatedList);
          // Optional: Close the window after clearing
          setSelectedUser(null);
          alert("Conversation cleared.");
        }
      } catch (err) {
        console.error("Delete failed", err);
      }
    }
  };

  // --- ROBUST LOGOUT HANDLER ---
  const handleLogout = async () => {
    // 1. Tell the server to clear the JWT cookie
    try {
      await fetch("http://localhost:5000/api/logout", {
        method: "POST",
        credentials: 'include'
      });
    } catch { /* ignore network errors on logout */ }

    // 2. Physically sever the real-time WebSocket connection
    if (socket) {
      socket.disconnect();
    }

    // 3. Clear frontend state
    setUser(null);
    setSelectedUser(null);
    setChatHistory([]);

    // 4. Clear persistence
    localStorage.removeItem("nexusUser");

    // 5. Navigate to login
    setPage("login");
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--ink)", transition: "background 0.3s" }}>
      {/* --- Top Navigation --- */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "var(--card)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 16 }}>Nexus</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button onClick={() => setDark(!dark)} style={{ cursor: "pointer", background: "var(--bg2)", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", color: "var(--ink)" }}>
            {dark ? "Light Mode" : "Dark Mode"}
          </button>
          <button onClick={handleLogout} style={{ cursor: "pointer", background: "#ef4444", color: "white", border: "none", padding: "4px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>Logout</button>
        </div>
      </nav>

      {/* --- Main Dashboard Area --- */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* SIDEBAR */}
        <div style={{ width: "320px", background: "var(--card2)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
            {["chats", "search"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: "12px", background: "none", border: "none", cursor: "pointer", color: activeTab === tab ? "var(--accent)" : "var(--ink3)", borderBottom: activeTab === tab ? "2px solid var(--accent)" : "none", fontSize: "13px", fontWeight: 600, textTransform: "capitalize" }}>{tab}</button>
            ))}
          </div>

          <div style={{ flex: 1, padding: "10px", overflowY: "auto" }}>
            {activeTab === "search" && (
              <div style={{ padding: "10px" }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
                  <input
                    type="text"
                    placeholder="Search username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--bg2)",
                      color: "var(--ink)",
                      outline: "none"
                    }}
                  />
                  <button
                    onClick={async () => {
                      console.log("Button clicked, searching for:", searchQuery);
                      const response = await fetch(`http://localhost:5000/users/search?q=${searchQuery}`, { credentials: 'include' });
                      const data = await response.json();
                      setSearchResults(data);
                    }}
                    style={{
                      padding: "10px 15px",
                      borderRadius: "8px",
                      background: "var(--accent)",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Find
                  </button>
                </div>

                {/* Display Results */}
                {searchResults.length > 0 ? (
                  searchResults.map((u) => (
                    <div
                      key={u._id}
                      onClick={() => { setSelectedUser(u); setActiveTab("chats"); setSearchQuery(""); }}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "8px",
                        background: "var(--bg2)"
                      }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold" }}>
                        {u.username[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.username}</span>
                    </div>
                  ))
                ) : (
                  searchQuery.length > 0 && <p style={{ textAlign: "center", fontSize: "12px", color: "var(--ink3)" }}>No users found.</p>
                )}
              </div>
            )}
            {activeTab === "chats" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {chatList.length > 0 ? (
                  chatList.map((chat) => (
                    <div
                      key={chat._id}
                      onClick={() => setSelectedUser(chat)}
                      style={{
                        padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px",
                        background: selectedUser?._id === chat._id ? "var(--bg3)" : "transparent",
                        borderBottom: "1px solid var(--border)"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = "var(--bg3)"}
                      onMouseOut={(e) => e.currentTarget.style.background = selectedUser?._id === chat._id ? "var(--bg3)" : "transparent"}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold" }}>
                        {chat.username[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                            <span style={{ fontWeight: 600, fontSize: "14px" }}>{chat.username}</span>
                            {onlineUsers.has(chat._id) && (
                              <div
                                title="Online"
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background: "#10b981",
                                  boxShadow: "0 0 4px rgba(16, 185, 129, 0.4)"
                                }}
                              />
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px" }}>
                            <span style={{ fontSize: "10px", color: "var(--ink3)" }}>
                              {new Date(chat.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {chat.unreadCount > 0 && (
                              <div style={{
                                background: "#ef4444",
                                color: "white",
                                fontSize: "10px",
                                fontWeight: "bold",
                                padding: "2px 6px",
                                borderRadius: "10px",
                                minWidth: "18px",
                                textAlign: "center"
                              }}>
                                {chat.unreadCount}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {chat.lastMessage}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: "center", marginTop: "20px", fontSize: "12px", color: "var(--ink3)" }}>No messages yet.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CHAT WINDOW */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--card)" }}>
          {selectedUser ? (
            <>
              {/* Updated Chat Header with Close and Clear buttons */}
              <div style={{
                padding: "16px 24px",
                borderBottom: "1px solid var(--border)",
                background: "var(--card)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "12px", fontWeight: "bold" }}>
                    {selectedUser?.username[0].toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600 }}>{selectedUser?.username}</span>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {/* CLEAR CHAT BUTTON */}
                  <button
                    onClick={clearChat}
                    title="Delete all messages"
                    style={{
                      background: "none", border: "1px solid var(--border)", color: "#ef4444",
                      padding: "6px 12px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "600"
                    }}
                  >
                    Clear
                  </button>

                  {/* CLOSE CHAT BUTTON */}
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setChatHistory([]);
                    }}
                    title="Back to dashboard"
                    style={{
                      background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--ink)",
                      padding: "6px 12px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "600"
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {chatHistory.map((msg, index) => {
                  const isMe = msg.sender === user.id;

                  return (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isMe ? "flex-end" : "flex-start",
                        marginBottom: "16px",
                        padding: "0 16px"
                      }}
                    >
                      {/* THE UNIFIED BUBBLE */}
                      <div style={{
                        maxWidth: "75%",
                        background: isMe ? "var(--accent)" : "var(--bg2)",
                        color: isMe ? "#fff" : "var(--ink)",
                        borderRadius: "12px",
                        padding: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px", // MAGIC: Adds perfect spacing ONLY if both text and file exist
                        boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
                      }}>

                        {/* 1. TEXT LAYER (Renders at the top if it exists) */}
                        {msg.text && (
                          <span style={{ wordBreak: "break-word", lineHeight: "1.4", fontSize: "14px" }}>
                            {msg.text}
                          </span>
                        )}

                        {/* 2. IMAGE LAYER (Renders below text) */}
                        {msg.fileUrl && msg.fileType?.startsWith('image/') && (
                          <img
                            src={msg.fileUrl}
                            alt="Attached content"
                            style={{
                              maxWidth: "100%",
                              maxHeight: "250px",
                              objectFit: "cover",
                              borderRadius: "8px", // Inner border radius looks cleaner
                              cursor: "pointer",
                              border: isMe ? "1px solid rgba(255,255,255,0.2)" : "1px solid var(--border)"
                            }}
                            onClick={() => window.open(msg.fileUrl, "_blank")}
                          />
                        )}

                        {/* 3. DOCUMENT LAYER (Renders below text) - Uses our Proxy Download from earlier */}
                        {msg.fileUrl && !msg.fileType?.startsWith('image/') && (
                          <a
                            href={`http://localhost:5000/download?url=${encodeURIComponent(msg.fileUrl)}&filename=${encodeURIComponent(msg.fileName || 'document.pdf')}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              color: isMe ? "#fff" : "var(--accent)",
                              textDecoration: "none",
                              background: isMe ? "rgba(255,255,255,0.2)" : "var(--bg)",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              fontSize: "13px",
                              fontWeight: 500
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                              <polyline points="13 2 13 9 20 9"></polyline>
                            </svg>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {msg.fileName || "Download Document"}
                            </span>
                          </a>
                        )}
                      </div>

                      {/* THE STATUS LAYER (Ticks and Time) */}
                      <div style={{
                        fontSize: "11px",
                        color: "var(--ink3)",
                        marginTop: "4px",
                        display: "flex",
                        gap: "4px",
                        alignItems: "center"
                      }}>
                        <span>{new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && (
                          <span style={{ color: msg.status === 'seen' ? "#3b82f6" : "inherit", fontWeight: "bold" }}>
                            {msg.status === 'sent' ? '✓' : '✓✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>

              {/* --- TYPING INDICATOR UI --- */}
              {isPartnerTyping && (
                <div style={{
                  padding: "0px 16px 8px 16px",
                  fontSize: "12px",
                  color: "var(--accent)",
                  fontStyle: "italic",
                  animation: "fadeIn 0.3s ease"
                }}>
                  {selectedUser.username} is typing...
                </div>
              )}

              {/* --- NEW: FILE PREVIEW & PROGRESS BAR --- */}
              {selectedFile && (
                <div style={{
                  padding: "10px 16px",
                  background: "var(--bg2)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  borderTop: "1px solid var(--border)"
                }}>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", alignItems: "center" }}>
                    <span style={{ fontWeight: 500, color: "var(--ink)" }}>📎 {selectedFile.name}</span>

                    {/* Show 'Remove' if waiting, show 'Percentage' if uploading */}
                    {!isUploading ? (
                      <span style={{ cursor: "pointer", color: "#ef4444", fontWeight: "bold" }} onClick={() => setSelectedFile(null)}>
                        Remove
                      </span>
                    ) : (
                      <span style={{ color: "var(--accent)", fontWeight: "bold" }}>
                        {uploadProgress}%
                      </span>
                    )}
                  </div>

                  {/* The Animated Progress Bar */}
                  {isUploading && (
                    <div style={{
                      width: "100%",
                      height: "4px",
                      background: "var(--border)",
                      borderRadius: "2px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        width: `${uploadProgress}%`,
                        height: "100%",
                        background: "var(--accent)",
                        transition: "width 0.2s ease-out"
                      }}></div>
                    </div>
                  )}
                </div>
              )}

              {/* Input Area */}
              <form onSubmit={sendMessage} style={{ padding: "20px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px" }}>

                {/* --- NEW: ATTACHMENT BUTTON --- */}
                <label style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 10px", color: "var(--ink3)" }}>
                  <input
                    type="file"
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                  </svg>
                </label>

                <input
                  type="text"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    handleKeystroke();
                  }}
                  placeholder={isUploading ? "Uploading file..." : "Type a message..."}
                  disabled={isUploading}
                  style={{ flex: 1, padding: "12px", borderRadius: "25px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--ink)", outline: "none" }}
                />
                <button type="submit" disabled={isUploading} style={{ padding: "10px 20px", borderRadius: "25px", border: "none", background: "var(--accent)", color: "white", fontWeight: 600, cursor: isUploading ? "not-allowed" : "pointer" }}>{isUploading ? "..." : "Send"}</button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", color: "var(--ink3)" }}>
              <p>Select a user to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chat;