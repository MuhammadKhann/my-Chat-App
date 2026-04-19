import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

// Connect to the backend
const socket = io.connect("http://localhost:5000");

function Chat({ user, setPage, setUser, dark, setDark }) {
  const [activeTab, setActiveTab] = useState("chats");
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  
  // --- Messaging States ---
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const scrollRef = useRef();

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
      
      fetch(`http://localhost:5000/messages/${room}`)
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
    socket.on("message_confirmed", ({ tempId, dbId }) => {
      setChatHistory(prev => prev.map(m => m.tempId === tempId ? { ...m, _id: dbId, status: 'sent' } : m));
    });

    socket.on("receive_message", (newMsg) => {
      // SAFEGUARD: Ignore our own echoed messages entirely
      const senderId = newMsg.sender?.toString ? newMsg.sender.toString() : newMsg.sender;
      if (senderId === user.id) return;

      const isChatOpen = selectedUser && selectedUser._id === senderId;

      if (isChatOpen) {
        setChatHistory(prev => [...prev, newMsg]);
        socket.emit("update_status", { msgId: newMsg._id, senderId: newMsg.sender, status: 'seen' });
      } else {
        socket.emit("update_status", { msgId: newMsg._id, senderId: newMsg.sender, status: 'delivered' });
        fetchChatList();
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

    return () => {
      socket.off("message_confirmed");
      socket.off("receive_message");
      socket.off("status_changed");
      socket.off("room_marked_seen");
      socket.off("online_users_list");
      socket.off("user_status_change");
    };
  }, [selectedUser, user.id]);

  // 4. Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // 5. Typing Indicators Socket Listeners
  useEffect(() => {
    socket.on("display_typing", (data) => setIsPartnerTyping(true));
    socket.on("hide_typing", (data) => setIsPartnerTyping(false));

    return () => {
      socket.off("display_typing");
      socket.off("hide_typing");
    };
  }, []);


  // Typing event timeout variable
  let typingTimeout;

  // Handle input change and emit typing events
  const handleInputChange = (e) => {
    setMessage(e.target.value);
    if (selectedUser) {
      const room = getRoomId(user.id, selectedUser._id);

      // Send "typing" event
      socket.emit("typing", { room });

      // Clear existing timeout and set a new one to "stop typing"
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.emit("stop_typing", { room });
      }, 1000);
    }
  };

  const fetchChatList = async () => {
    try {
      const res = await fetch(`http://localhost:5000/chats/${user.id}`);
      const data = await res.json();
      setChatList(data);
    } catch (err) { console.error(err); }
  };

  // Fetch list on load and when a user is selected
  useEffect(() => {
    if (user.id) fetchChatList();
  }, [user.id, selectedUser]);

  // 6. Send Message Function - With TempId for No Duplicates
  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser) return;

    const tempId = Date.now().toString(); // Temporary ID for UI tracking
    const room = getRoomId(user.id, selectedUser._id);

    const localMsg = {
      _id: tempId, // Temporary ID
      tempId: tempId,
      sender: user.id,
      text: message,
      status: 'sending...', // Visual state
      createdAt: new Date()
    };

    // Add to local UI immediately
    setChatHistory((prev) => [...prev, localMsg]);
    setMessage("");

    // Emit to server
    socket.emit("send_message", {
      tempId,
      senderId: user.id,
      receiverId: selectedUser._id,
      text: message,
      room
    });
  };

  const clearChat = async () => {
    if (!selectedUser) return;
    
    const confirmDelete = window.confirm(`Are you sure you want to clear all messages with ${selectedUser?.username}?`);
    
    if (confirmDelete) {
      const room = getRoomId(user.id, selectedUser._id);
      try {
        const res = await fetch(`http://localhost:5000/messages/delete/${room}`, {
          method: "DELETE", // Use the DELETE method
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

  const handleLogout = () => {
    // 1. Switch the page first to unmount the Chat component immediately
    setPage("login");
    
    // 2. Then clear the user data and storage
    setUser(null);
    localStorage.removeItem("nexusUser");
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--ink)", transition: "background 0.3s" }}>
      {/* --- Top Navigation --- */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "var(--card)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
          const response = await fetch(`http://localhost:5000/users/search?q=${searchQuery}`);
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
                {chatHistory.map((msg, index) => (
                  <div key={index} style={{ 
                    alignSelf: (msg.senderId === user.id || msg.sender === user.id) ? "flex-end" : "flex-start",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: (msg.senderId === user.id || msg.sender === user.id) ? "flex-end" : "flex-start"
                  }}>
                    <div style={{ 
                      background: (msg.senderId === user.id || msg.sender === user.id) ? "var(--accent)" : "var(--bg2)",
                      color: (msg.senderId === user.id || msg.sender === user.id) ? "white" : "var(--ink)",
                      padding: "8px 14px", borderRadius: "15px", maxWidth: "70%", fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      {msg.text}
                      {/* Show status icon only for your own messages */}
                      {(msg.senderId === user.id || msg.sender === user.id) && (
                        <span style={{ fontSize: '11px', marginLeft: '5px', whiteSpace: 'nowrap' }}>                          {msg.status === 'sending...' && '...'}                          {msg.status === 'sent' && '✓'} 
                          {msg.status === 'delivered' && '✓✓'}
                          {msg.status === 'seen' && <span style={{ color: '#34b7f1' }}>✓✓</span>}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>

              {/* Display Typing Indicator */}
              {isPartnerTyping && (
                <div style={{ padding: "0 20px 10px", fontSize: "12px", color: "var(--ink3)", fontStyle: "italic" }}>
                  {selectedUser?.username} is typing...
                </div>
              )}

              {/* Input Area */}
              <form onSubmit={sendMessage} style={{ padding: "20px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px" }}>
                <input type="text" value={message} onChange={handleInputChange} placeholder="Type a message..." style={{ flex: 1, padding: "12px", borderRadius: "25px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--ink)", outline: "none" }} />
                <button type="submit" style={{ padding: "10px 20px", borderRadius: "25px", border: "none", background: "var(--accent)", color: "white", fontWeight: 600, cursor: "pointer" }}>Send</button>
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