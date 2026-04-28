import React, { useState, useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";
import Peer from "simple-peer/simplepeer.min.js";
import { THEMES } from "./GlobalStyles";

// ─── CSS Design System (injected once via Login's GlobalStyles) ───────────────
// All CSS variables (--bg, --card, --accent, --ink, --border, etc.) come from
// Login.jsx's <GlobalStyles dark={dark} /> which is rendered at the app root.
// This file only adds Chat-specific keyframes and overrides.

const ChatStyles = () => (
  <style>{`

    @keyframes pulse {
      0%   { opacity: 1; transform: scale(1); }
      50%  { opacity: 0.45; transform: scale(1.25); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes rise {
      from { opacity: 0; transform: translateY(16px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-8px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes msgIn {
      from { opacity: 0; transform: translateY(8px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body, #root {
      height: 100%;
      font-family: 'DM Sans', sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border2, rgba(0,0,0,0.15)); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--ink3); }

    /* Sidebar chat item hover */
    .chat-item { transition: background 0.15s ease; }
    .chat-item:hover { background: var(--bg3) !important; }

    /* Nav icon buttons */
    .nav-icon-btn {
      display: flex; align-items: center; justify-content: center;
      width: 34px; height: 34px; border-radius: 9px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--ink2);
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .nav-icon-btn:hover {
      background: var(--bg2);
      color: var(--ink);
      border-color: var(--border2);
    }

    /* Input focus ring */
    .nexus-input:focus {
      outline: none;
      border-color: var(--accent) !important;
      box-shadow: 0 0 0 3px var(--accent2);
    }

    /* Privacy menu item */
    .privacy-item { transition: background 0.12s; cursor: pointer; }
    .privacy-item:hover { background: var(--bg3) !important; }

    /* Theme menu item */
    .theme-item { transition: background 0.12s; cursor: pointer; }
    .theme-item:hover { background: var(--bg3) !important; }

    /* Message bubble animation */
    .msg-bubble { animation: msgIn 0.22s cubic-bezier(0.22,1,0.36,1) both; }

    /* Audio player */
    audio { accent-color: var(--accent); }

    /* Tab button */
    .tab-btn { transition: color 0.15s, border-color 0.15s; }

    /* Send / action buttons */
    .action-btn {
      display: flex; align-items: center; justify-content: center;
      border: none; cursor: pointer;
      transition: opacity 0.15s, transform 0.1s;
    }
    .action-btn:active { transform: scale(0.93); }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .gradient-btn {
      background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
      transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
    }
    .gradient-btn:hover  { opacity: 0.88; }
    .gradient-btn:active { transform: scale(0.95); opacity: 1; }
    .gradient-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    @keyframes shimmer {
      100% { transform: translateX(100%); }
    }
    .skeleton-container {
      position: relative;
      overflow: hidden;
      background-color: var(--bg2);
      border-radius: 12px;
    }
    .skeleton-container::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      transform: translateX(-100%);
      background-image: linear-gradient(
        90deg,
        rgba(255,255,255,0) 0,
        rgba(255,255,255,0.05) 20%,
        rgba(255,255,255,0.1) 60%,
        rgba(255,255,255,0) 100%
      );
      animation: shimmer 1.5s infinite;
    }
  `}</style>
);

// ─── Socket (unchanged) ───────────────────────────────────────────────────────
const socket = io("http://localhost:5000", {
  withCredentials: true,
  transports: ["websocket"]
});

// ─── Small Avatar helper ──────────────────────────────────────────────────────
function Avatar({ src, name, size = 38, border = false, accent = false }) {
  const s = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    objectFit: "cover",
    border: border ? `2px solid var(--accent)` : accent ? `2px solid var(--accent)` : "none",
  };
  if (src) return <img src={src} alt={name} style={s} onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${name}&background=random`; }} />;
  return (
    <div style={{
      ...s, background: "var(--accent)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 600, fontSize: size * 0.38,
      letterSpacing: "-0.01em",
    }}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

// ─── SmartImage ───────────────────────────────────────────────────────────────
function SmartImage({ src, alt, style, onClick }) {
  const [status, setStatus] = useState("loading");
  return (
    <div
      className={status === "loading" ? "skeleton-container" : ""}
      style={{
        position: "relative",
        maxWidth: "100%",
        minHeight: 120,
        borderRadius: 12,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      onClick={onClick}
    >
      {status === "error" && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", background: "var(--bg2)",
          color: "var(--ink2)", fontSize: 12, gap: 8, padding: 16,
        }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Image unavailable
        </div>
      )}
      {status !== "error" && (
        <img
          src={src}
          alt={alt || "chat-media"}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          style={{
            display: "block",
            width: "100%",
            maxHeight: 260,
            objectFit: "cover",
            opacity: status === "loaded" ? 1 : 0,
            transition: "opacity 0.4s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      )}
    </div>
  );
}

// ─── Date separator utilities ─────────────────────────────────────────────────
const formatSeparatorDate = (dateString) => {
  const messageDate = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (messageDate.toDateString() === today.toDateString()) return "Today";
  if (messageDate.toDateString() === yesterday.toDateString()) return "Yesterday";
  const options = { month: "short", day: "numeric" };
  if (messageDate.getFullYear() !== today.getFullYear()) options.year = "numeric";
  return messageDate.toLocaleDateString(undefined, options);
};

const shouldShowDateSeparator = (messages, index) => {
  if (index === 0) return true;
  const cur = new Date(messages[index].createdAt || messages[index].timestamp);
  const prev = new Date(messages[index - 1].createdAt || messages[index - 1].timestamp);
  return cur.toDateString() !== prev.toDateString();
};

// ─── Main Chat Component ──────────────────────────────────────────────────────
function Chat({ user, setPage, setUser, dark, setDark, themeId, setThemeId }) {
  const [activeTab, setActiveTab] = useState("chats");
  const [selectedUser, setSelectedUser] = useState(null);
  const selectedUserRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);

  // Refs for dropdown containers to detect click-outside
  const themeMenuRef = useRef(null);
  const privacyMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setShowThemeMenu(false);
      }
      if (privacyMenuRef.current && !privacyMenuRef.current.contains(e.target)) {
        setShowPrivacyMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
      // Auto-close the sidebar if they resize back to a desktop view
      if (window.innerWidth >= 900) setIsSidebarOpen(false); 
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isMeTyping, setIsMeTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const [chatList, setChatList] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const scrollRef = useRef();

  // ─── Smart Read Receipts (Enterprise) ───────────────────────────────────────
  const messagesViewportRef = useRef(null);
  const messageNodeMapRef = useRef(new Map()); // msgId -> HTMLElement
  const intersectionObserverRef = useRef(null);
  const visibleIncomingMsgIdsRef = useRef(new Set()); // msgIds intersecting viewport
  const emittedSeenMsgIdsRef = useRef(new Set()); // msgIds already emitted as seen
  const chatHistoryByIdRef = useRef(new Map()); // msgId -> msg
  const scrollRafRef = useRef(null);
  const lastInteractionAtRef = useRef(Date.now());
  const ATTENTION_WINDOW_MS = 30_000;

  const markInteractionNow = useCallback(() => {
    lastInteractionAtRef.current = Date.now();
  }, []);

  const isAttentionGateOpen = useCallback(() => {
    if (document.visibilityState !== "visible") return false;
    if (!document.hasFocus()) return false;
    return (Date.now() - lastInteractionAtRef.current) <= ATTENTION_WINDOW_MS;
  }, []);

  const tryMarkSeen = useCallback((msgId, senderId) => {
    if (!msgId || !senderId) return;
    if (!selectedUserRef.current?._id) return;
    if (senderId !== selectedUserRef.current._id) return;
    if (!isAttentionGateOpen()) return;
    if (emittedSeenMsgIdsRef.current.has(msgId)) return;

    emittedSeenMsgIdsRef.current.add(msgId);
    socket.emit("update_status", {
      msgId,
      senderId: senderId.toString(),
      receiverId: user.id,
      status: "seen",
    });

    // Optimistically update local UI + stop observing this node to reduce work.
    setChatHistory((prev) => prev.map((m) => (m?._id === msgId ? { ...m, status: "seen" } : m)));
    const node = messageNodeMapRef.current.get(msgId);
    if (node && intersectionObserverRef.current) {
      try { intersectionObserverRef.current.unobserve(node); } catch { /* ignore */ }
    }
  }, [isAttentionGateOpen, user.id]);

  const flushVisibleIncoming = useCallback(() => {
    if (!isAttentionGateOpen()) return;
    const currentSelectedUser = selectedUserRef.current;
    if (!currentSelectedUser?._id) return;

    visibleIncomingMsgIdsRef.current.forEach((msgId) => {
      const msg = chatHistoryByIdRef.current.get(msgId);
      if (!msg) return;
      if ((msg.sender || msg.senderId) !== currentSelectedUser._id) return;
      if (msg.status === "seen") return;
      tryMarkSeen(msgId, currentSelectedUser._id);
    });
  }, [isAttentionGateOpen, tryMarkSeen]);

  // Maintain O(1) lookup for seen checks.
  useEffect(() => {
    const next = new Map();
    for (const m of chatHistory) {
      if (m?._id) next.set(m._id, m);
    }
    chatHistoryByIdRef.current = next;
  }, [chatHistory]);

  // Track user interaction (attention gate)
  useEffect(() => {
    const onPointer = () => markInteractionNow();
    const onKeydown = () => markInteractionNow();
    const onWheel = () => markInteractionNow();
    const onTouch = () => markInteractionNow();
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouch);
    };
  }, [markInteractionNow]);

  // React to visibility/focus changes by re-checking visible messages
  useEffect(() => {
    const onVisibility = () => flushVisibleIncoming();
    const onFocus = () => flushVisibleIncoming();
    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [flushVisibleIncoming]);

  // IntersectionObserver setup (per selected chat)
  useEffect(() => {
    // Reset tracking per conversation switch
    visibleIncomingMsgIdsRef.current = new Set();
    emittedSeenMsgIdsRef.current = new Set();

    if (intersectionObserverRef.current) {
      intersectionObserverRef.current.disconnect();
      intersectionObserverRef.current = null;
    }

    if (!selectedUser?._id) return;
    const root = messagesViewportRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const msgId = entry.target?.dataset?.msgid;
          const isIncoming = entry.target?.dataset?.incoming === "1";
          if (!msgId || !isIncoming) continue;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            visibleIncomingMsgIdsRef.current.add(msgId);
            tryMarkSeen(msgId, selectedUser._id);
          } else {
            visibleIncomingMsgIdsRef.current.delete(msgId);
          }
        }
      },
      { root, threshold: [0, 0.6] }
    );

    intersectionObserverRef.current = observer;

    // Observe already-mounted nodes
    for (const [msgId, node] of messageNodeMapRef.current.entries()) {
      if (!node) continue;
      if (node.dataset?.incoming !== "1") continue;
      observer.observe(node);
    }

    // If chat opens while already focused, mark what’s already visible
    flushVisibleIncoming();

    return () => {
      observer.disconnect();
      if (intersectionObserverRef.current === observer) {
        intersectionObserverRef.current = null;
      }
    };
  }, [selectedUser?._id, flushVisibleIncoming, tryMarkSeen]);

  const registerMessageNode = useCallback((msgId, shouldObserve, node) => {
    if (!msgId) return;
    const prev = messageNodeMapRef.current.get(msgId);
    if (prev && prev !== node && intersectionObserverRef.current) {
      try { intersectionObserverRef.current.unobserve(prev); } catch { /* ignore */ }
    }

    if (!node) {
      messageNodeMapRef.current.delete(msgId);
      return;
    }

    node.dataset.msgid = msgId;
    node.dataset.incoming = shouldObserve ? "1" : "0";
    messageNodeMapRef.current.set(msgId, node);

    if (intersectionObserverRef.current && shouldObserve) {
      intersectionObserverRef.current.observe(node);
    }
  }, []);

  const onMessagesScroll = useCallback(() => {
    // Throttle to once per frame.
    if (scrollRafRef.current) return;
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      markInteractionNow();
      flushVisibleIncoming();
    });
  }, [flushVisibleIncoming, markInteractionNow]);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState("idle");
  const [callerInfo, setCallerInfo] = useState({ id: "", name: "", signal: null });
  const [callNotification, setCallNotification] = useState(null);

  const myVideoRef = useRef(null);
  const userVideoRef = useRef(null);
  const connectionRef = useRef(null);

  // ─── All original logic (untouched) ────────────────────────────────────────
  const handlePrivacyChange = async (level) => {
    try {
      const res = await fetch("http://localhost:5000/api/users/privacy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ privacyLevel: level })
      });
      const data = await res.json();
      if (res.ok) {
        data.id = data._id || data.id;
        setUser(data);
        if (localStorage.getItem("nexusUser")) {
          localStorage.setItem("nexusUser", JSON.stringify(data));
        }
        socket.emit("privacy_changed", { userId: data.id, privacyLevel: level });
      }
    } catch (err) { console.error(err); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("⚠️ Image too large. Please select a photo under 5MB.");
      e.target.value = "";
      return;
    }
    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res = await fetch("http://localhost:5000/api/users/avatar", {
        method: "POST", credentials: "include", body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        data.id = data._id || data.id;
        setUser(data);
        if (localStorage.getItem("nexusUser")) {
          localStorage.setItem("nexusUser", JSON.stringify(data));
        }
      } else { alert(data.error || "Failed to upload avatar."); }
    } catch (error) {
      console.error("Avatar Upload Error:", error);
      alert("Network error. Could not upload avatar.");
    } finally { setIsUploadingAvatar(false); }
  };

  const getDownloadUrl = (url, fallbackName) => {
    if (!url) return "#";
    let safeUrl = url.replace("/upload/", "/upload/fl_attachment/");
    if (!safeUrl.toLowerCase().endsWith('.pdf') && !safeUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      safeUrl += ".pdf";
    }
    return safeUrl;
  };

  const handleDownload = async (url, fileName) => {
    try {
      const downloadUrl = url.replace("/upload/", "/upload/fl_attachment/");
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || "document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(url, "_blank");
    }
  };

  const getRoomId = (id1, id2) => [id1, id2].sort().join("_");

  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  useEffect(() => {
    if (user) { socket.emit("join_personal", user.id); }
  }, [user]);

  useEffect(() => {
    if (selectedUser) {
      const room = getRoomId(user.id, selectedUser._id);
      fetch(`http://localhost:5000/messages/${room}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => setChatHistory(data))
        .catch(err => console.error(err));
    }
  }, [selectedUser, user.id]);

  useEffect(() => {
    if (socket && !socket.connected) { socket.connect(); }
    if (user) { socket.emit("add_user", user.id); }

    socket.on("message_confirmed", ({ tempId, dbId, status, createdAt }) => {
      setChatHistory(prev => prev.map(m =>
        (m._id === "temp_" + tempId || m.tempId === tempId)
          ? { ...m, _id: dbId, status: status || 'sent', createdAt: createdAt }
          : m
      ));
    });

    socket.on("send_error", ({ error }) => {
      console.error("❌ Message Send Error:", error);
      alert(`Message Error: ${error}`);
    });

    socket.on("receive_message", (incomingMsg) => {
      const normalizedMsg = {
        ...incomingMsg,
        sender: incomingMsg.sender || incomingMsg.senderId,
        timestamp: incomingMsg.timestamp || incomingMsg.createdAt || new Date().toISOString(),
        status: incomingMsg.status || "delivered"
      };
      const currentSelectedUser = selectedUserRef.current;
      if (currentSelectedUser && normalizedMsg.sender === currentSelectedUser._id) {
        // Smart read receipts will upgrade to "seen" only when the message is
        // actually visible + tab focused + user recently interacted.
        normalizedMsg.status = "delivered";
        setChatHistory((prev) => [...prev, normalizedMsg]);
        socket.emit("update_status", {
          msgId: incomingMsg._id,
          senderId: (incomingMsg.sender || incomingMsg.senderId).toString(),
          receiverId: user.id, status: "delivered"
        });
      } else {
        setChatHistory((prev) => [...prev, normalizedMsg]);
        socket.emit("update_status", {
          msgId: incomingMsg._id,
          senderId: (incomingMsg.sender || incomingMsg.senderId).toString(),
          receiverId: user.id, status: "delivered"
        });
      }
      const senderId = (incomingMsg.sender || incomingMsg.senderId).toString();
      const isChatOpen = currentSelectedUser && senderId === currentSelectedUser._id;
      setChatList((prev) => {
        const existingIndex = prev.findIndex(chat => chat._id === senderId);
        if (existingIndex !== -1) {
          const updated = [...prev];
          const entry = { ...updated[existingIndex] };
          entry.lastMessage = incomingMsg.text || "📎 File";
          entry.time = incomingMsg.createdAt || new Date().toISOString();
          if (!isChatOpen) { entry.unreadCount = (entry.unreadCount || 0) + 1; }
          updated.splice(existingIndex, 1);
          return [entry, ...updated];
        } else {
          return [{ _id: senderId, username: incomingMsg.senderUsername || senderId, lastMessage: incomingMsg.text || "📎 File", time: incomingMsg.createdAt || new Date().toISOString(), unreadCount: isChatOpen ? 0 : 1 }, ...prev];
        }
      });
    });

    socket.on("status_changed", ({ msgId, status }) => {
      setChatHistory(prev => prev.map(m => m._id === msgId ? { ...m, status } : m));
    });
    socket.on("online_users_list", (users) => { setOnlineUsers(new Set(users)); });
    socket.on("user_status_change", ({ userId, isOnline }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        if (isOnline) newSet.add(userId); else newSet.delete(userId);
        return newSet;
      });
    });
    socket.on("user_typing", (data) => {
      const currentSelectedUser = selectedUserRef.current;
      if (currentSelectedUser && data.senderId === currentSelectedUser._id) {
        setIsPartnerTyping(data.typing);
      }
    });
    socket.on("incoming_call", ({ from, callerName, signal }) => {
      console.log("🚨 INCOMING CALL DETECTED FROM:", callerName);
      if (callStatus === "active") return;
      setCallerInfo({ id: from, name: callerName, signal: signal });
      setCallStatus("receiving");
    });
    socket.on("call_ended", () => {
      endCall(false);
      setCallNotification({ text: "Call ended", type: "error" });
      setTimeout(() => { setCallNotification(null); }, 3000);
    });
    socket.on("call_declined", () => {
      endCall(false);
      setCallNotification({ text: "Call declined by user", type: "error" });
      setTimeout(() => { setCallNotification(null); }, 3000);
    });

    return () => {
      socket.off("message_confirmed"); socket.off("send_error");
      socket.off("receive_message"); socket.off("status_changed");
      socket.off("online_users_list");
      socket.off("user_status_change"); socket.off("user_typing");
      socket.off("incoming_call"); socket.off("call_ended"); socket.off("call_declined");
    };
  }, [user.id, callStatus]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  const handleKeystroke = () => {
    if (!selectedUser) return;
    if (!isMeTyping) {
      setIsMeTyping(true);
      socket.emit("typing_start", { senderId: user.id, receiver: selectedUser._id });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsMeTyping(false);
      socket.emit("typing_stop", { senderId: user.id, receiver: selectedUser._id });
    }, 2000);
  };

  const fetchChatList = async () => {
    try {
      const res = await fetch(`http://localhost:5000/chats/${user.id}`, { credentials: 'include' });
      const data = await res.json();
      setChatList(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (user.id) fetchChatList(); }, [user.id, selectedUser]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.includes('.')) {
      alert("⚠️ Invalid File: Your file is missing an extension.");
      e.target.value = ""; return;
    }
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const actualSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`⚠️ File too large (10MB max). Your file is ${actualSizeMB}MB.`);
      e.target.value = ""; return;
    }
    setSelectedFile(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) { audioChunksRef.current.push(event.data); }
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm', lastModified: Date.now() });
        setSelectedFile(audioFile);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true); setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => { setRecordingTime((prev) => prev + 1); }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Please allow microphone permissions to send voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false); clearInterval(timerIntervalRef.current);
      setRecordingTime(0); audioChunksRef.current = [];
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const initiateCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream); setCallStatus("ringing");
      setTimeout(() => { if (myVideoRef.current) myVideoRef.current.srcObject = stream; }, 100);
      const peer = new Peer({ initiator: true, trickle: false, stream: stream });
      peer.on("signal", (data) => {
        socket.emit("call_user", { userToCall: selectedUser._id, signalData: data, from: user.id, callerName: user.username });
      });
      peer.on("stream", (currentStream) => {
        setRemoteStream(currentStream);
        if (userVideoRef.current) userVideoRef.current.srcObject = currentStream;
      });
      socket.on("call_accepted", (signal) => {
        setCallStatus("active"); peer.signal(signal);
        setCallNotification({ text: "Connected", type: "success" });
        setTimeout(() => { setCallNotification(null); }, 3000);
      });
      connectionRef.current = peer;
    } catch (err) {
      console.error("Webcam Error:", err);
      alert("Camera or Microphone access denied. Check browser permissions.");
      setCallStatus("idle");
    }
  };

  const answerCall = async () => {
    try {
      setCallStatus("active");
      setCallNotification({ text: "Connected", type: "success" });
      setTimeout(() => { setCallNotification(null); }, 3000);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setTimeout(() => { if (myVideoRef.current) myVideoRef.current.srcObject = stream; }, 100);
      const peer = new Peer({ initiator: false, trickle: false, stream: stream });
      peer.on("signal", (data) => { socket.emit("answer_call", { signal: data, to: callerInfo.id }); });
      peer.on("stream", (currentStream) => {
        setRemoteStream(currentStream);
        if (userVideoRef.current) userVideoRef.current.srcObject = currentStream;
      });
      peer.signal(callerInfo.signal);
      connectionRef.current = peer;
    } catch (err) {
      console.error("Webcam Error:", err); alert("Camera or Microphone access denied.");
      setCallStatus("idle");
    }
  };

  const endCall = (emitToServer = true) => {
    if (emitToServer && callStatus !== "idle") {
      const targetId = callerInfo.id || (selectedUser ? selectedUser._id : null);
      if (targetId) socket.emit("end_call", { to: targetId });
    }
    setCallStatus("idle"); setCallerInfo({ id: "", name: "", signal: null });
    setLocalStream((prevStream) => {
      if (prevStream) { prevStream.getTracks().forEach((track) => track.stop()); }
      return null;
    });
    setRemoteStream(null);
    if (myVideoRef.current) myVideoRef.current.srcObject = null;
    if (userVideoRef.current) userVideoRef.current.srcObject = null;
    if (connectionRef.current) { connectionRef.current.destroy(); connectionRef.current = null; }
    socket.off("call_accepted");
  };

  const declineCall = () => {
    if (callerInfo.id) { socket.emit("decline_call", { to: callerInfo.id }); }
    setCallStatus("idle"); setCallerInfo({ id: "", name: "", signal: null });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!user || !user.id) { console.error("❌ CRITICAL: User session lost."); alert("Session lost. Please log in again."); return; }
    if (!selectedUser || !selectedUser._id) { console.error("❌ CRITICAL: No user selected."); alert("Please select a user to message."); return; }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isMeTyping) { setIsMeTyping(false); socket.emit("typing_stop", { senderId: user.id, receiver: selectedUser._id }); }
    if (!message.trim() && !selectedFile) return;
    const tempId = Date.now().toString();
    const room = getRoomId(user.id, selectedUser._id);
    let fileUrl = null, fileName = null, fileType = null;
    if (selectedFile) {
      setIsUploading(true); setUploadProgress(0);
      const formData = new FormData();
      formData.append("file", selectedFile, selectedFile.name);
      try {
        const data = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "http://localhost:5000/upload");
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) { setUploadProgress(Math.round((event.loaded / event.total) * 100)); }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) { resolve(JSON.parse(xhr.responseText)); }
            else { reject(new Error("Upload failed on server")); }
          };
          xhr.onerror = () => reject(new Error("Network Error"));
          xhr.send(formData);
        });
        if (data.fileUrl) { fileUrl = data.fileUrl; fileName = data.fileName || selectedFile.name; fileType = data.fileType || selectedFile.type; }
      } catch (err) {
        console.error("Upload failed:", err); alert("Upload failed. Check console for details.");
        setIsUploading(false); setUploadProgress(0); return;
      }
      setIsUploading(false); setUploadProgress(0);
    }
    const optimisticMessage = {
      _id: "temp_" + tempId, tempId: tempId, sender: user.id,
      receiver: selectedUser._id, text: message,
      fileUrl, fileName, fileType,
      timestamp: new Date().toISOString(), status: "sent"
    };
    setChatHistory((prev) => [...prev, optimisticMessage]);
    socket.emit("send_message", {
      tempId, sender: user.id.toString(), receiver: selectedUser?._id?.toString(),
      text: message, fileUrl, fileName, fileType,
      fileSize: selectedFile?.size || null, room, status: "sent"
    });
    setMessage(""); setSelectedFile(null);
  };

  const executeClearChat = async () => {
    if (!selectedUser) return;
    const room = getRoomId(user.id, selectedUser._id);
    try {
      const res = await fetch(`http://localhost:5000/messages/delete/${room}`, { method: "DELETE", credentials: 'include' });
      if (res.ok) {
        setChatHistory([]);
        setChatList(chatList.filter(item => item._id !== selectedUser._id));
        setSelectedUser(null); 
        setShowClearConfirm(false);
      }
    } catch (err) { console.error("Delete failed", err); }
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/logout", { method: "POST", credentials: 'include' });
    } catch { /* ignore */ }
    if (socket) { socket.disconnect(); }
    setUser(null); setSelectedUser(null); setChatHistory([]);
    localStorage.removeItem("nexusUser");
    setPage("login");
  };

  // ─── Tick renderer ──────────────────────────────────────────────────────────
  const renderTicks = (status) => {
    // "seen" ticks are always blue — universally recognised, never
    // clashes with any accent colour, visible on every theme.
    if (status === 'seen') return (
      <svg width="18" height="11" viewBox="0 0 20 11" fill="none" style={{ flexShrink: 0 }}>
        <path d="M1 5.5l3.5 3.5L12 1"   stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 5.5l3.5 3.5L18 1"   stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
    // "delivered" & "sent" — use currentColor to inherit the message bubble's
    // text color. This works on ALL themes (light/dark) without hardcoding.
    // Sender bubbles have white text (#fff), so ticks are white.
    if (status === 'delivered') return (
      <svg width="18" height="11" viewBox="0 0 20 11" fill="none" style={{ flexShrink: 0, opacity: 0.75 }}>
        <path d="M1 5.5l3.5 3.5L12 1"   stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 5.5l3.5 3.5L18 1"   stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
    // "sent" — single tick
    return (
      <svg width="12" height="11" viewBox="0 0 12 11" fill="none" style={{ flexShrink: 0, opacity: 0.75 }}>
        <path d="M1 5.5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  };
 

  // ─── Privacy badge label ────────────────────────────────────────────────────
  const privacyBadge = {
    ghost: { color: "#a855f7", bg: "rgba(168,85,247,0.10)", text: "👻 Ghost Mode — fully invisible" },
    hide_read: { color: "#f97316", bg: "rgba(249,115,22,0.10)", text: "🟠 Read receipts hidden" },
    hide_online: { color: "#eab308", bg: "rgba(234,179,8,0.10)", text: "🟡 Online status hidden" },
  };

  // ─── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: "var(--bg)", color: "var(--ink)",
      transition: "background 0.3s, color 0.3s",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <ChatStyles />

      {/* ══════════════════════════════════════════════════════════════════
          TOP NAVIGATION — refined bar, logo left, controls right
      ══════════════════════════════════════════════════════════════════ */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 58,
        background: "var(--card)",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        gap: 12,
      }}>

        {/* LEFT — logo + user identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>

          {/* App wordmark */}
          <span style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 20, fontWeight: 400,
            color: "var(--ink)", letterSpacing: "0.01em",
            flexShrink: 0,
          }}>Nexus</span>

          <div style={{ width: 1, height: 22, background: "var(--border)", flexShrink: 0 }} />

          {/* Clickable avatar + name */}
          <label htmlFor="avatar-upload" style={{
            cursor: isUploadingAvatar ? "wait" : "pointer",
            position: "relative", display: "flex", alignItems: "center", gap: 10,
            flexShrink: 0,
          }} title="Click to change profile picture">
            <input id="avatar-upload" type="file" accept="image/jpeg, image/png, image/webp"
              style={{ display: "none" }} onChange={handleAvatarUpload} disabled={isUploadingAvatar} />

            <div style={{ position: "relative" }}>
              <Avatar src={user?.avatar} name={user?.username} size={34} border />
              {isUploadingAvatar && (
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(0,0,0,0.35)",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.9s linear infinite" }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0110 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              )}
              {/* Online dot */}
              <div style={{
                position: "absolute", bottom: 0, right: 0,
                width: 9, height: 9, borderRadius: "50%",
                background: "#22c55e",
                border: "2px solid var(--card)",
              }} />
            </div>

            <div style={{ lineHeight: 1.25, display: isMobile ? "none" : "block" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{user?.username}</div>
              <div style={{ fontSize: 11, color: "var(--ink3)", letterSpacing: "0.01em" }}>My Workspace</div>
            </div>
          </label>
        </div>

        {/* RIGHT — controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

          {/* Theme menu */}
          <div ref={themeMenuRef} style={{ position: "relative" }}>
            <button
              className="nav-icon-btn"
              onClick={() => { setShowThemeMenu(!showThemeMenu); setShowPrivacyMenu(false); }}
              title="Change Theme"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </button>

            {showThemeMenu && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                width: 232, background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 12px 36px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
                zIndex: 9999, overflow: "hidden",
                animation: "fadeIn 0.18s ease both",
              }}>
                <div style={{ padding: "10px 14px 8px", fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--ink3)", borderBottom: "1px solid var(--border)" }}>
                  Select Theme
                </div>
                {Object.entries(THEMES).map(([id, t], i, arr) => (
                  <div
                    key={id}
                    className="theme-item"
                    onClick={() => setThemeId(id)}
                    style={{
                      padding: "11px 14px",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                      background: themeId === id ? "var(--accent2)" : "transparent",
                      display: "flex", alignItems: "center", gap: 10,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, ${t.start} 0%, ${t.end} 100%)`,
                      boxShadow: "inset 0 1px 1px rgba(255,255,255,0.2)"
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: themeId === id ? "var(--accent)" : "var(--ink)" }}>
                        {t.name}
                      </div>
                    </div>
                    {themeId === id && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy menu */}
          <div ref={privacyMenuRef} style={{ position: "relative" }}>
            <button
              className="nav-icon-btn"
              onClick={() => { setShowPrivacyMenu(!showPrivacyMenu); setShowThemeMenu(false); }}
              title="Privacy settings"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </button>

            {showPrivacyMenu && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                width: 232, background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 12px 36px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
                zIndex: 9999, overflow: "hidden",
                animation: "fadeIn 0.18s ease both",
              }}>
                <div style={{ padding: "10px 14px 8px", fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--ink3)", borderBottom: "1px solid var(--border)" }}>
                  Privacy Level
                </div>
                {[
                  { id: 'standard', label: 'Public', desc: 'Show online & read receipts', icon: '🟢' },
                  { id: 'hide_online', label: 'Hide Online', desc: 'Hide typing & presence', icon: '🟡' },
                  { id: 'hide_read', label: 'Hide Blue Ticks', desc: 'Shows delivered only', icon: '🟠' },
                  { id: 'ghost', label: 'Ghost Mode', desc: 'Fully invisible', icon: '👻' },
                ].map((option, i, arr) => (
                  <div
                    key={option.id}
                    className="privacy-item"
                    onClick={() => handlePrivacyChange(option.id)}
                    style={{
                      padding: "11px 14px",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                      background: user?.privacyLevel === option.id ? "var(--accent2)" : "transparent",
                      display: "flex", alignItems: "center", gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{option.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: user?.privacyLevel === option.id ? "var(--accent)" : "var(--ink)" }}>
                        {option.label}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 1 }}>{option.desc}</div>
                    </div>
                    {user?.privacyLevel === option.id && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dark / Light mode toggle */}
          <button
            className="nav-icon-btn"
            onClick={() => setDark(!dark)}
            title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {dark ? (
              /* Sun icon */
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              /* Moon icon */
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              height: 34, padding: "0 14px",
              borderRadius: 9, border: "1px solid rgba(239,68,68,0.25)",
              background: "rgba(239,68,68,0.07)", color: "#ef4444",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.13)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.07)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)"; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {isMobile ? null : "Logout"}
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN LAYOUT — sidebar + chat window
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>



        {/* Mobile overlay */}
        {isMobile && isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.45)", zIndex: 95,
              backdropFilter: "blur(3px)",
              animation: "fadeIn 0.2s ease",
            }}
          />
        )}

        {/* ── SIDEBAR ── */}
        <div style={{
          width: isMobile ? 288 : 260,
          height: "100%",
          background: "var(--card)",
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          position: isMobile ? "absolute" : "relative",
          left: isMobile ? (isSidebarOpen ? "0px" : "-300px") : "0px",
          transition: "left 0.28s cubic-bezier(0.4,0,0.2,1)",
          zIndex: 100,
          boxShadow: isMobile && isSidebarOpen ? "6px 0 24px rgba(0,0,0,0.12)" : "none",
          flexShrink: 0,
        }}>

          {/* Tabs: Chats | Search */}
          <div style={{ display: "flex", padding: "12px 12px 0", gap: 4 }}>
            {["chats", "search"].map((tab) => (
              <button
                key={tab}
                className="tab-btn"
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: "8px 0",
                  background: activeTab === tab
                    ? "color-mix(in srgb, var(--accent) 14%, transparent)"
                    : "transparent",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12, fontWeight: 600,
                  color: activeTab === tab ? "var(--accent)" : "var(--ink3)",
                  textTransform: "capitalize",
                  letterSpacing: "0.02em",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {tab === "chats" ? "Chats" : "Search"}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>

            {/* ── Search tab ── */}
            {activeTab === "search" && (
              <div style={{ padding: "4px 4px 0", animation: "slideIn 0.18s ease both" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  <input
                    type="text"
                    className="nexus-input"
                    placeholder="Search username…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      flex: 1, minWidth: 0, padding: "9px 12px",
                      borderRadius: 9, fontSize: 13,
                      border: "1px solid var(--border)",
                      background: "var(--bg2)", color: "var(--ink)",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                  />
                  <button
                    onClick={async () => {
                      const response = await fetch(`http://localhost:5000/users/search?q=${searchQuery}`, { credentials: 'include' });
                      const data = await response.json();
                      setSearchResults(data);
                    }}
                    className="gradient-btn"
                    style={{
                      padding: "9px 14px", borderRadius: 9,
                      color: "#fff", border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 600,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    }}
                  >
                    Find
                  </button>
                </div>

                {searchResults.length > 0 ? (
                  searchResults.map((u) => (
                    <div
                      key={u._id}
                      className="chat-item"
                      onClick={() => { setSelectedUser(u); setActiveTab("chats"); setSearchQuery(""); if (isMobile) setIsSidebarOpen(false); }}
                      style={{
                        padding: "10px 10px", borderRadius: 10, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 10,
                        marginBottom: 4, background: "transparent",
                      }}
                    >
                      <Avatar src={u.avatar} name={u.username} size={36} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{u.username}</div>
                        {onlineUsers.has(u._id) && (
                          <div style={{ fontSize: 11, color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                            Online
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  searchQuery.length > 0 && (
                    <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink3)", marginTop: 24 }}>No users found.</p>
                  )
                )}
              </div>
            )}

            {/* ── Chats tab ── */}
            {activeTab === "chats" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {chatList.length > 0 ? (
                  chatList.map((chat) => {
                    const isActive = selectedUser?._id === chat._id;
                    return (
                      <div
                        key={chat._id}
                        className="chat-item"
                        onClick={() => { setSelectedUser(chat); if (isMobile) setIsSidebarOpen(false); }}
                        style={{
                          padding: "10px 10px", borderRadius: 10, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 10,
                          background: isActive
                            ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                            : "transparent",
                          border: isActive
                            ? "1px solid color-mix(in srgb, var(--accent) 25%, transparent)"
                            : "1px solid transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        {/* Avatar with online dot */}
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <Avatar src={chat.avatar} name={chat.username} size={40} />
                          {onlineUsers.has(chat._id) && (
                            <div style={{
                              position: "absolute", bottom: 0, right: 0,
                              width: 10, height: 10, borderRadius: "50%",
                              background: "#22c55e", border: "2px solid var(--card)",
                            }} />
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--accent)" : "var(--ink)" }}>
                              {chat.username}
                            </span>
                            <span style={{ fontSize: 10, color: "var(--ink3)", flexShrink: 0 }}>
                              {chat.time ? new Date(chat.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{
                              fontSize: 12, color: "var(--ink3)",
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                              maxWidth: chat.unreadCount > 0 ? "160px" : "100%",
                            }}>
                              {chat.lastMessage}
                            </span>
                            {chat.unreadCount > 0 && (
                              <div style={{
                                background: "var(--accent)", color: "#fff",
                                fontSize: 10, fontWeight: 700,
                                width: 20, height: 20, borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                              }}>
                                {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--ink3)" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }}>
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                    <p style={{ fontSize: 13 }}>No conversations yet</p>
                    <p style={{ fontSize: 11, marginTop: 4 }}>Search for someone to start chatting</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CHAT WINDOW — the palace room
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          background: "var(--bg)", position: "relative", minWidth: 0,
        }}>

          {selectedUser ? (
            <>
              {/* ── Chat Header ── */}
              <div style={{
                padding: "0 20px", height: 60,
                borderBottom: "1px solid var(--border)",
                background: "var(--card)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                flexShrink: 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    onClick={() => { 
                      setSelectedUser(null); 
                      setChatHistory([]); 
                      if (isMobile) setIsSidebarOpen(true); 
                    }}
                    title="Close chat"
                    className="nav-icon-btn"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <div style={{ position: "relative" }}>
                    <Avatar src={selectedUser?.avatar} name={selectedUser?.username} size={36} />
                    {onlineUsers.has(selectedUser._id) && (
                      <div style={{
                        position: "absolute", bottom: 0, right: 0,
                        width: 10, height: 10, borderRadius: "50%",
                        background: "#22c55e", border: "2px solid var(--card)",
                      }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{selectedUser?.username}</div>
                    <div style={{ fontSize: 11, color: onlineUsers.has(selectedUser._id) ? "#22c55e" : "var(--ink3)" }}>
                      {onlineUsers.has(selectedUser._id) ? "Online" : "Offline"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  {/* Video call */}
                  <button
                    onClick={initiateCall}
                    title="Start Video Call"
                    className="gradient-btn"
                    style={{
                      height: 34, padding: isMobile ? 0 : "0 14px",
                      width: isMobile ? 34 : "auto", justifyContent: "center",
                      borderRadius: 9,
                      color: "#fff", border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 6,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                    {isMobile ? null : "Call"}
                  </button>

                  {/* Clear chat */}
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    title="Delete all messages"
                    className="nav-icon-btn"
                    style={{ color: "#ef4444" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ── Privacy Banner ── */}
              {user?.privacyLevel && user.privacyLevel !== 'standard' && (() => {
                const badge = privacyBadge[user.privacyLevel];
                return badge ? (
                  <div style={{
                    padding: "7px 20px",
                    background: badge.bg, color: badge.color,
                    fontSize: 12, fontWeight: 500,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 6, borderBottom: "1px solid var(--border)", flexShrink: 0,
                  }}>
                    {badge.text}
                  </div>
                ) : null;
              })()}

              {/* ── Messages Area ── */}
              <div
                ref={messagesViewportRef}
                onScroll={onMessagesScroll}
                style={{
                flex: 1, overflowY: "auto",
                padding: "24px 20px 8px",
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                {chatHistory.map((msg, index) => {
                  const isMe = msg.sender === user.id;
                  const msgId = (typeof msg._id === "string")
                    ? msg._id
                    : (msg._id?.toString ? msg._id.toString() : "");
                  const timeStr = new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const showSeparator = shouldShowDateSeparator(chatHistory, index);

                  return (
                    <React.Fragment key={msgId || index}>
                      {showSeparator && (
                        <div style={{
                          display: "flex", justifyContent: "center",
                          margin: "24px 0 16px 0",
                          position: "sticky", top: 10, zIndex: 50,
                        }}>
                          <span style={{
                            background: "var(--bg2)",
                            opacity: 0.85,
                            backdropFilter: "blur(8px)",
                            padding: "4px 14px",
                            borderRadius: 14,
                            fontSize: 12, fontWeight: 600,
                            color: "var(--ink2)",
                            border: "1px solid var(--border)",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                            animation: "fadeIn 0.3s ease",
                          }}>
                            {formatSeparatorDate(msg.createdAt || msg.timestamp)}
                          </span>
                        </div>
                      )}
                    <div
                      className="msg-bubble"
                      ref={(node) => {
                        // Observe only real incoming messages (server IDs),
                        // never optimistic temp IDs / local placeholders.
                        const shouldObserve = !isMe && !!msgId && !msgId.startsWith("temp_") && msg.status !== "seen";
                        registerMessageNode(msgId, shouldObserve, node);
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isMe ? "flex-end" : "flex-start",
                        marginBottom: 6,
                      }}
                    >
                      {/* Bubble */}
                      <div style={{
                        maxWidth: "min(72%, 520px)",
                        background: isMe ? "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%)" : "var(--card)",
                        color: isMe ? "#fff" : "var(--ink)",
                        borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        padding: "10px 14px",
                        display: "flex", flexDirection: "column", gap: 8,
                        border: isMe ? "none" : "1px solid var(--border2)",
                        boxShadow: isMe
                          ? "0 2px 10px rgba(0,0,0,0.18)"
                          : "0 1px 4px rgba(0,0,0,0.06)",
                      }}>

                        {/* Text */}
                        {msg.text && (
                          <span style={{ wordBreak: "break-word", lineHeight: 1.5, fontSize: 14 }}>
                            {msg.text}
                          </span>
                        )}

                        {/* Image */}
                        {msg.fileUrl && msg.fileType?.startsWith('image/') && (
                          <SmartImage
                            src={msg.fileUrl}
                            alt="Attached"
                            style={{ border: isMe ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--border)" }}
                            onClick={() => window.open(msg.fileUrl, "_blank")}
                          />
                        )}

                        {/* Document */}
                        {msg.fileUrl && !msg.fileType?.startsWith('image/') && !msg.fileType?.startsWith('audio/') && (
                          <a
                            href={`http://localhost:5000/download?url=${encodeURIComponent(msg.fileUrl)}&filename=${encodeURIComponent(msg.fileName || 'document.pdf')}`}
                            style={{
                              display: "flex", alignItems: "center", gap: 8,
                              color: isMe ? "rgba(255,255,255,0.9)" : "var(--accent)",
                              textDecoration: "none",
                              background: isMe ? "rgba(255,255,255,0.12)" : "var(--bg2)",
                              padding: "9px 12px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="13 2 13 9 20 9" />
                            </svg>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {msg.fileName || "Download Document"}
                            </span>
                          </a>
                        )}

                        {/* Audio */}
                        {msg.fileUrl && msg.fileType?.startsWith('audio/') && (
                          <audio controls src={msg.fileUrl}
                            style={{ height: 36, width: 240, maxWidth: "100%", borderRadius: 20, outline: "none" }}
                          />
                        )}
                      </div>

                      {/* Time + status */}
                      <div style={{
                        display: "flex", alignItems: "center", gap: 4,
                        marginTop: 3, fontSize: 11, color: "var(--ink3)",
                      }}>
                        <span>{timeStr}</span>
                        {isMe && renderTicks(msg.status)}
                      </div>
                    </div>
                    </React.Fragment>
                  );
                })}

                <div ref={scrollRef} />
              </div>

              {/* ── Typing Indicator ── */}
              {isPartnerTyping && (
                <div style={{
                  padding: "0 24px 10px",
                  fontSize: 12, color: "var(--accent)",
                  fontStyle: "italic", animation: "fadeIn 0.25s ease",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                    {[0, 0.2, 0.4].map((d, i) => (
                      <div key={i} style={{
                        width: 5, height: 5, borderRadius: "50%", background: "var(--accent)",
                        animation: `pulse 1.2s ${d}s ease-in-out infinite`,
                      }} />
                    ))}
                  </div>
                  {selectedUser.username} is typing…
                </div>
              )}

              {/* ── File Preview + Progress ── */}
              {selectedFile && (
                <div style={{
                  padding: "10px 20px",
                  background: "var(--card2)",
                  borderTop: "1px solid var(--border)",
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink)", fontWeight: 500 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                      </svg>
                      {selectedFile.name}
                    </div>
                    {!isUploading ? (
                      <button onClick={() => setSelectedFile(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 11, fontWeight: 600 }}>
                        Remove
                      </button>
                    ) : (
                      <span style={{ color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>{uploadProgress}%</span>
                    )}
                  </div>
                  {isUploading && (
                    <div style={{ height: 3, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        width: `${uploadProgress}%`, height: "100%",
                        background: "var(--accent)", borderRadius: 3,
                        transition: "width 0.2s ease-out",
                      }} />
                    </div>
                  )}
                </div>
              )}

              {/* ── Input Area ── */}
              <div style={{
                padding: "12px 16px 16px",
                borderTop: "1px solid var(--border)",
                background: "var(--card)",
                flexShrink: 0,
              }}>
                <form onSubmit={sendMessage} style={{ display: "flex", gap: 8, alignItems: "center" }}>

                  {isRecording ? (
                    /* Recording UI */
                    <div style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "var(--bg2)", padding: "10px 16px", borderRadius: 24,
                      border: "1.5px solid #ef4444",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#ef4444", fontWeight: 600, fontSize: 13 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.4s infinite" }} />
                        Recording… {formatTime(recordingTime)}
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button type="button" onClick={cancelRecording}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink3)", fontSize: 12, fontWeight: 600 }}>
                          Cancel
                        </button>
                        <button type="button" onClick={stopRecording}
                          style={{ background: "#ef4444", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                          Stop & Attach
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Attachment */}
                      <label style={{ cursor: "pointer", color: "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg2)", flexShrink: 0, transition: "color 0.15s, background 0.15s, border-color 0.15s" }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.color = "#fff";
                          e.currentTarget.style.background = "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%)";
                          e.currentTarget.style.borderColor = "transparent";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.color = "var(--ink3)";
                          e.currentTarget.style.background = "var(--bg2)";
                          e.currentTarget.style.borderColor = "var(--border)";
                        }}>
                        <input type="file" style={{ display: "none" }} onChange={handleFileSelect} disabled={isUploading} />
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                        </svg>
                      </label>

                      {/* Text input */}
                      <input
                        type="text"
                        className="nexus-input"
                        value={message}
                        onChange={(e) => { setMessage(e.target.value); handleKeystroke(); }}
                        placeholder={isUploading ? "Uploading…" : selectedFile ? "Add a caption…" : "Type a message…"}
                        disabled={isUploading}
                        style={{
                          flex: 1, padding: "10px 16px",
                          borderRadius: 24, border: "1px solid var(--border)",
                          background: "var(--bg2)", color: "var(--ink)",
                          fontSize: 14, outline: "none",
                          transition: "border-color 0.15s, box-shadow 0.15s",
                        }}
                      />

                      {/* Mic or Send */}
                      {!message.trim() && !selectedFile ? (
                        <button type="button" onClick={startRecording}
                          title="Record voice note"
                          style={{
                            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                            border: "1px solid var(--border)", background: "var(--bg2)",
                            color: "var(--accent)", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "background 0.15s, color 0.15s, border-color 0.15s",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%)";
                            e.currentTarget.style.color = "#fff";
                            e.currentTarget.style.borderColor = "transparent";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = "var(--bg2)";
                            e.currentTarget.style.color = "var(--accent)";
                            e.currentTarget.style.borderColor = "var(--border)";
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3Z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" />
                          </svg>
                        </button>
                      ) : (
                        <button type="submit" disabled={isUploading}
                          className="gradient-btn"
                          style={{
                            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                            border: "none", color: "#fff",
                            cursor: isUploading ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            opacity: isUploading ? 0.6 : 1,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.22)",
                          }}
                          onMouseOver={(e) => { if (!isUploading) e.currentTarget.style.transform = "scale(1.07)"; }}
                          onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </form>
              </div>
            </>
          ) : (
            /* Empty state */
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              justifyContent: "center", alignItems: "center",
              color: "var(--ink3)", gap: 12, padding: 40,
              textAlign: "center",
            }}>
              {/* Hamburger hint on mobile */}
              {isMobile && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="gradient-btn"
                  style={{
                    position: "absolute", top: 14, left: 14,
                    width: 38, height: 38, borderRadius: 10,
                    color: "#fff", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.22)",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              )}
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "var(--card)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 4,
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink2)" }}>Select a conversation</p>
              <p style={{ fontSize: 13 }}>Choose from your chats or search for someone new.</p>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          WEBRTC OVERLAYS (unchanged logic, refined visuals)
      ══════════════════════════════════════════════════════════════════ */}

      {/* Incoming call modal */}
      {callStatus === "receiving" && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          background: "var(--card)", padding: "24px 32px", borderRadius: 16,
          boxShadow: "0 16px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
          zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
          border: "1px solid var(--accent)", animation: "rise 0.3s cubic-bezier(0.22,1,0.36,1) both",
          minWidth: 280,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", background: "var(--accent2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)", marginBottom: 4 }}>Incoming Video Call</div>
            <div style={{ fontSize: 13, color: "var(--ink3)" }}>{callerInfo.name} is calling…</div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={declineCall} style={{
              background: "rgba(239,68,68,0.1)", color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.2)", padding: "10px 22px",
              borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: "pointer",
              transition: "background 0.15s",
            }}>Decline</button>
            <button onClick={answerCall} style={{
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              color: "#fff", border: "none", padding: "10px 22px",
              borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: "pointer",
              boxShadow: "0 2px 10px rgba(34,197,94,0.35)",
              animation: "pulse 1.5s infinite",
              transition: "opacity 0.15s",
            }}>Answer</button>
          </div>
        </div>
      )}

      {/* Active / ringing video window */}
      {(callStatus === "active" || callStatus === "ringing") && (
        <div style={{
          position: "fixed", bottom: 28, right: 28,
          width: 340, height: 440,
          background: "#000", borderRadius: 18, overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)",
          zIndex: 999, border: "1px solid rgba(255,255,255,0.1)",
        }}>
          {callStatus === "active" ? (
            <video playsInline ref={userVideoRef} autoPlay style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.7)", flexDirection: "column", gap: 12, background: "#0a0a0a" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 1.8s infinite" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Calling {selectedUser?.username}…</div>
            </div>
          )}

          {/* PiP local video */}
          <div style={{
            position: "absolute", bottom: 70, right: 14,
            width: 90, height: 120, background: "#1a1a1a",
            borderRadius: 10, overflow: "hidden",
            border: "1.5px solid rgba(255,255,255,0.15)",
          }}>
            <video playsInline muted ref={myVideoRef} autoPlay style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
          </div>

          {/* Hang up */}
          <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)" }}>
            <button onClick={() => endCall(true)} style={{
              background: "#ef4444", color: "#fff", border: "none",
              width: 46, height: 46, borderRadius: "50%",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(239,68,68,0.45)",
              transition: "transform 0.1s",
            }}
              onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.07)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.42 19.42 0 01-3.33-2.67m-2.67-3.34a19.79 19.79 0 01-3.07-8.63A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91" />
                <line x1="23" y1="1" x2="1" y2="23" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {callNotification && (
        <div style={{
          position: "fixed", top: 36, left: "50%", transform: "translateX(-50%)",
          background: callNotification.type === "success" ? "rgba(22,163,74,0.96)" : "rgba(220,38,38,0.96)",
          backdropFilter: "blur(8px)",
          color: "#fff", padding: "10px 22px",
          borderRadius: 30, fontWeight: 600, fontSize: 13,
          boxShadow: callNotification.type === "success"
            ? "0 8px 24px rgba(22,163,74,0.3)"
            : "0 8px 24px rgba(220,38,38,0.3)",
          zIndex: 9999,
          display: "flex", alignItems: "center", gap: 8,
          animation: "rise 0.35s cubic-bezier(0.22,1,0.36,1) both",
        }}>
          {callNotification.type === "success" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          )}
          {callNotification.text}
        </div>
      )}
      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
          animation: "fadeIn 0.2s ease", padding: 20
        }}>
          <div style={{
            background: "var(--card)",
            width: "100%", maxWidth: 360,
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            border: "1px solid var(--border)",
            animation: "rise 0.2s ease"
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>Clear Conversation</h3>
            <p style={{ fontSize: 14, color: "var(--ink3)", lineHeight: 1.5, marginBottom: 24 }}>
              Are you sure you want to permanently delete all messages with <span style={{fontWeight: 600, color: "var(--ink)"}}>{selectedUser?.username}</span>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  padding: "10px 18px", borderRadius: 10,
                  background: "var(--bg2)", color: "var(--ink2)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: "1px solid var(--border)",
                  transition: "background 0.2s"
                }}
              >
                Cancel
              </button>
              <button
                onClick={executeClearChat}
                style={{
                  padding: "10px 18px", borderRadius: 10,
                  background: "#ef4444", color: "#fff",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)",
                  transition: "opacity 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = "0.85"}
                onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
              >
                Delete Messages
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;