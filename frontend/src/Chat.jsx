import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import Peer from "simple-peer/simplepeer.min.js";

// --- UPGRADED: SECURE SOCKET CONNECTION ---
const socket = io("http://localhost:5000", {
  withCredentials: true, // CRITICAL: Allows the socket to send the JWT cookie to the server
  transports: ["websocket"]
});

function Chat({ user, setPage, setUser, dark, setDark }) {
  const [activeTab, setActiveTab] = useState("chats");
  const [selectedUser, setSelectedUser] = useState(null);
  const selectedUserRef = useRef(null); // Ref mirror to avoid stale closures in socket handlers
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

  // --- AVATAR UPLOAD STATE ---
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // --- VOICE NOTE STATES ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // --- 🎥 WEBRTC VIDEO CALLING STATES ---
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState("idle"); // idle | ringing | receiving | active
  const [callerInfo, setCallerInfo] = useState({ id: "", name: "", signal: null });
  const [callNotification, setCallNotification] = useState(null);

  // These 'refs' physically connect to the <video> tags on the screen
  const myVideoRef = useRef(null);
  const userVideoRef = useRef(null);
  const connectionRef = useRef(null); // Holds the actual Peer-to-Peer connection object



  // --- PRIVACY STATE ---
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);

  // --- PRIVACY UPDATE HANDLER ---
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
        // Normalize ID
        data.id = data._id || data.id;
        setUser(data);
        if (localStorage.getItem("nexusUser")) {
          localStorage.setItem("nexusUser", JSON.stringify(data));
        }
        setShowPrivacyMenu(false);

        // Emit real-time change to backend so presence updates instantly
        socket.emit("privacy_changed", { userId: data.id, privacyLevel: level });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- ENTERPRISE AVATAR UPLOAD HANDLER ---
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Client-Side Security: Enforce the 5MB limit before hitting the server
    if (file.size > 5 * 1024 * 1024) {
      alert("⚠️ Image too large. Please select a photo under 5MB.");
      e.target.value = ""; // Clear the input
      return;
    }

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch("http://localhost:5000/api/users/avatar", {
        method: "POST",
        credentials: "include", // Mandatory for the JWT Auth Guard
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        // Normalize data id in case backend returns _id
        data.id = data._id || data.id;

        // 2. Update the React State so the UI changes instantly
        setUser(data);

        // 3. Update Storage so the image persists on refresh depending on rememberMe state
        if (localStorage.getItem("nexusUser")) {
          localStorage.setItem("nexusUser", JSON.stringify(data));
        }
      } else {
        alert(data.error || "Failed to upload avatar.");
      }
    } catch (error) {
      console.error("Avatar Upload Error:", error);
      alert("Network error. Could not upload avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

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
  // Keep the ref in sync with the latest selectedUser state
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

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

      // Read the LIVE value from the ref, not the stale closure
      const currentSelectedUser = selectedUserRef.current;

      // If the sender's chat is currently open, mark as 'seen' instantly
      if (currentSelectedUser && normalizedMsg.sender === currentSelectedUser._id) {
        normalizedMsg.status = "seen";
        setChatHistory((prev) => [...prev, normalizedMsg]);

        // Tell the server so it updates the DB and notifies the sender (blue double ticks)
        socket.emit("update_status", {
          msgId: incomingMsg._id,
          senderId: (incomingMsg.sender || incomingMsg.senderId).toString(),
          receiverId: user.id,
          status: "seen"
        });
      } else {
        // Chat is not open — add as 'delivered' and tell the server
        setChatHistory((prev) => [...prev, normalizedMsg]);

        // Notify the server so the sender gets double ticks (✓✓)
        socket.emit("update_status", {
          msgId: incomingMsg._id,
          senderId: (incomingMsg.sender || incomingMsg.senderId).toString(),
          receiverId: user.id,
          status: "delivered"
        });
      }

      // --- REAL-TIME SIDEBAR UPDATE ---
      const senderId = (incomingMsg.sender || incomingMsg.senderId).toString();
      const isChatOpen = currentSelectedUser && senderId === currentSelectedUser._id;

      setChatList((prev) => {
        const existingIndex = prev.findIndex(chat => chat._id === senderId);

        if (existingIndex !== -1) {
          // Sender already in the list — update and bump to top
          const updated = [...prev];
          const entry = { ...updated[existingIndex] };
          entry.lastMessage = incomingMsg.text || "📎 File";
          entry.time = incomingMsg.createdAt || new Date().toISOString();
          if (!isChatOpen) {
            entry.unreadCount = (entry.unreadCount || 0) + 1;
          }
          updated.splice(existingIndex, 1); // Remove from old position
          return [entry, ...updated];       // Place at top
        } else {
          // New conversation — add a fresh entry at the top
          const newEntry = {
            _id: senderId,
            username: incomingMsg.senderUsername || senderId,
            lastMessage: incomingMsg.text || "📎 File",
            time: incomingMsg.createdAt || new Date().toISOString(),
            unreadCount: isChatOpen ? 0 : 1
          };
          return [newEntry, ...prev];
        }
      });
    });

    socket.on("status_changed", ({ msgId, status }) => {
      setChatHistory(prev => prev.map(m => m._id === msgId ? { ...m, status } : m));
    });

    socket.on("room_marked_seen", ({ finalStatus }) => {
      setChatHistory(prev => prev.map(m => ({ ...m, status: finalStatus || 'seen' })));
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
      const currentSelectedUser = selectedUserRef.current;
      if (currentSelectedUser && data.senderId === currentSelectedUser._id) {
        setIsPartnerTyping(data.typing);
      }
    });

    // --- LISTEN FOR INCOMING VIDEO CALLS ---
    socket.on("incoming_call", ({ from, callerName, signal }) => {
      // If we are already in a call, ignore it (or you could emit a "busy" signal)
      console.log("🚨 INCOMING CALL DETECTED FROM:", callerName);
      if (callStatus === "active") return;

      setCallerInfo({ id: from, name: callerName, signal: signal });
      setCallStatus("receiving"); // Triggers the "Ringing" UI Modal
    });

    // --- LISTEN FOR HANG UPS (ENDED CALLS) ---
    socket.on("call_ended", () => {
      endCall(false); // Cleanly shut down the UI and camera

      // --- SHOW TOAST WHEN THE OTHER PERSON HANGS UP ---
      // You can change this text to "Call declined" if you prefer!
      setCallNotification({ text: "Call ended", type: "error" });

      setTimeout(() => {
        setCallNotification(null);
      }, 3000);
    });

    // --- LISTEN FOR DECLINED CALLS ---
    socket.on("call_declined", () => {
      endCall(false);

      // UPGRADE: Pass an object with the type
      setCallNotification({ text: "Call declined by user", type: "error" });

      setTimeout(() => {
        setCallNotification(null);
      }, 3000);
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
      socket.off("incoming_call");
      socket.off("call_ended");
      socket.off("call_declined");
    };
  }, [user.id, callStatus]);

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

  // --- 🎙️ START RECORDING ---
  const startRecording = async () => {
    try {
      // 1. Request Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. Initialize the MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      // 3. Collect the audio data chunks as they stream in
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // 4. Handle the Stop Event
      mediaRecorderRef.current.onstop = () => {
        // Combine chunks into a single binary Blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Convert Blob to a File object (Makes it compatible with your existing upload logic!)
        const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, {
          type: 'audio/webm',
          lastModified: Date.now()
        });

        // Set it as the selected file so the user can send it
        setSelectedFile(audioFile);

        // Stop all microphone tracks to turn off the red recording light on the browser tab
        stream.getTracks().forEach(track => track.stop());
      };

      // 5. Start the engine and the timer
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Please allow microphone permissions to send voice notes.");
    }
  };

  // --- 🛑 STOP RECORDING ---
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  // --- ❌ CANCEL RECORDING ---
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Remove the onstop listener so it doesn't create a file
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();

      // Kill the mic
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
      setRecordingTime(0);
      audioChunksRef.current = [];
    }
  };

  // Helper to format the timer (e.g., 01:05)
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- 📞 1. INITIATE THE CALL (Caller) ---
  const initiateCall = async () => {
    try {
      // 1. Get hardware access
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setCallStatus("ringing");

      // 2. We use a slight delay to ensure React has rendered the <video> tag before we attach the stream
      setTimeout(() => {
        if (myVideoRef.current) myVideoRef.current.srcObject = stream;
      }, 100);

      // 3. Create the Peer Initiator
      const peer = new Peer({
        initiator: true,
        trickle: false, // Wait for all ICE candidates before signaling (more reliable for basic setups)
        stream: stream,
      });

      // 4. When our browser is ready, "ring" the other user via Socket.io
      peer.on("signal", (data) => {
        socket.emit("call_user", {
          userToCall: selectedUser._id,
          signalData: data,
          from: user.id,
          callerName: user.username,
        });
      });

      // 5. When they answer, attach their video stream to our UI
      peer.on("stream", (currentStream) => {
        setRemoteStream(currentStream);
        if (userVideoRef.current) userVideoRef.current.srcObject = currentStream;
      });

      // 6. Listen for the backend telling us they picked up
      socket.on("call_accepted", (signal) => {
        setCallStatus("active");
        peer.signal(signal); // Complete the cryptographic handshake

        // --- ADD THE CONNECTED TOAST ---
        setCallNotification({ text: "Connected", type: "success" });

        setTimeout(() => {
          setCallNotification(null);
        }, 3000);
      });

      connectionRef.current = peer;

    } catch (err) {
      console.error("Webcam Error:", err);
      alert("Camera or Microphone access denied. Check browser permissions.");
      setCallStatus("idle");
    }
  };

  // --- 📞 2. ANSWER THE CALL (Receiver) ---
  const answerCall = async () => {
    try {
      setCallStatus("active");

      // --- SHOW CONNECTED TOAST TO THE RECEIVER ---
      setCallNotification({ text: "Connected", type: "success" });
      setTimeout(() => {
        setCallNotification(null);
      }, 3000);
      // -------------------------------------------------

      // 1. Get hardware access
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      setTimeout(() => {
        if (myVideoRef.current) myVideoRef.current.srcObject = stream;
      }, 100);

      // 2. Create the Answering Peer
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: stream,
      });

      // 3. Send our handshake data back to the caller
      peer.on("signal", (data) => {
        socket.emit("answer_call", { signal: data, to: callerInfo.id });
      });

      // 4. Attach the caller's video stream to our UI
      peer.on("stream", (currentStream) => {
        setRemoteStream(currentStream);
        if (userVideoRef.current) userVideoRef.current.srcObject = currentStream;
      });

      // 5. Inject the initial handshake data we received when the phone "rang"
      peer.signal(callerInfo.signal);
      connectionRef.current = peer;

    } catch (err) {
      console.error("Webcam Error:", err);
      alert("Camera or Microphone access denied.");
      setCallStatus("idle");
    }
  };

  // --- 🛑 3. END THE CALL (Cleanup) ---
  const endCall = (emitToServer = true) => {
    // 1. Tell the other person we hung up
    if (emitToServer && callStatus !== "idle") {
      const targetId = callerInfo.id || (selectedUser ? selectedUser._id : null);
      if (targetId) socket.emit("end_call", { to: targetId });
    }

    // 2. Reset UI States instantly
    setCallStatus("idle");
    setCallerInfo({ id: "", name: "", signal: null });

    // 3. THE FIX: Use functional state updates to bypass stale closures!
    setLocalStream((prevStream) => {
      if (prevStream) {
        prevStream.getTracks().forEach((track) => track.stop()); // Kills the hardware light
      }
      return null;
    });

    setRemoteStream(null);

    // 4. Rip the streams out of the HTML video tags to ensure no ghost frames remain
    if (myVideoRef.current) myVideoRef.current.srcObject = null;
    if (userVideoRef.current) userVideoRef.current.srcObject = null;

    // 5. Sever the WebRTC peer connection completely
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }

    socket.off("call_accepted");
  };

  // --- 🚫 4. DECLINE THE CALL ---
  const declineCall = () => {
    // Tell the caller we hit the red button
    if (callerInfo.id) {
      socket.emit("decline_call", { to: callerInfo.id });
    }

    // Reset our own receiving UI
    setCallStatus("idle");
    setCallerInfo({ id: "", name: "", signal: null });
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

        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          {/* --- DYNAMIC CLICKABLE AVATAR --- */}
          <label
            htmlFor="avatar-upload"
            style={{
              cursor: isUploadingAvatar ? "wait" : "pointer",
              position: "relative",
              display: "block"
            }}
            title="Click to change profile picture"
          >
            <input
              id="avatar-upload"
              type="file"
              accept="image/jpeg, image/png, image/webp"
              style={{ display: "none" }}
              onChange={handleAvatarUpload}
              disabled={isUploadingAvatar}
            />

            {/* 1. Show Cloudinary Image if it exists */}
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="Profile"
                style={{
                  width: 40, height: 40, borderRadius: "50%", objectFit: "cover",
                  border: "2px solid var(--accent)", opacity: isUploadingAvatar ? 0.5 : 1
                }}
              />
            ) : (
              <div style={{
                width: 40, height: 40, borderRadius: "50%", background: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: "bold", fontSize: "16px",
                opacity: isUploadingAvatar ? 0.5 : 1
              }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
            )}

            {/* Loading Spinner Overlay */}
            {isUploadingAvatar && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="3" strokeDasharray="30" />
                </svg>
              </div>
            )}
          </label>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 16 }}>{user?.username}</span>
            <span style={{ fontSize: "11px", color: "var(--ink3)" }}>My Workspace</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {/* --- PRIVACY TOGGLE MENU --- */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
              style={{ cursor: "pointer", background: "var(--bg2)", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              Privacy
            </button>

            {showPrivacyMenu && (
              <div style={{
                position: "absolute", top: "110%", right: 0, width: "220px",
                background: dark ? "#181818" : "#ffffff",
                border: "1px solid var(--border)", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 9999
              }}>
                {[
                  { id: 'standard', label: '🟢 Public (Default)', desc: 'Show online & blue ticks' },
                  { id: 'hide_online', label: '🟡 Hide Online', desc: 'Hide typing & online status' },
                  { id: 'hide_read', label: '🟠 Hide Blue Ticks', desc: 'Shows delivered (✓✓) only' },
                  { id: 'ghost', label: '👻 Full Ghost Mode', desc: 'Shows sent (✓) only' }
                ].map(option => (
                  <div
                    key={option.id}
                    onClick={() => handlePrivacyChange(option.id)}
                    style={{
                      padding: "12px", borderBottom: "1px solid var(--border)", cursor: "pointer",
                      background: user?.privacyLevel === option.id ? "var(--bg3)" : "transparent"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = "var(--bg3)"}
                    onMouseOut={(e) => e.currentTarget.style.background = user?.privacyLevel === option.id ? "var(--bg3)" : "transparent"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: user?.privacyLevel === option.id ? "var(--accent)" : "var(--ink)" }}>
                        {option.label}
                      </div>
                      {user?.privacyLevel === option.id && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--ink3)", marginTop: "2px" }}>{option.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                      {/* --- NEW: DYNAMIC SEARCH RESULT AVATAR --- */}
                      {u.avatar ? (
                        <img
                          src={u.avatar}
                          alt={u.username}
                          onError={(e) => { e.target.src = "https://ui-avatars.com/api/?name=" + u.username }}
                          style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold" }}>
                          {u.username[0].toUpperCase()}
                        </div>
                      )}
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
                      {/* --- NEW: DYNAMIC SIDEBAR AVATAR --- */}
                      {chat.avatar ? (
                        <img
                          src={chat.avatar}
                          alt={chat.username}
                          onError={(e) => { e.target.src = "https://ui-avatars.com/api/?name=" + chat.username }}
                          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", flexShrink: 0 }}>
                          {chat.username[0].toUpperCase()}
                        </div>
                      )}
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
                  {/* --- NEW: DYNAMIC CHAT HEADER AVATAR --- */}
                  {selectedUser?.avatar ? (
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.username}
                      onError={(e) => { e.target.src = "https://ui-avatars.com/api/?name=" + selectedUser.username }}
                      style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "12px", fontWeight: "bold" }}>
                      {selectedUser?.username[0].toUpperCase()}
                    </div>
                  )}
                  <span style={{ fontWeight: 600 }}>{selectedUser?.username}</span>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {/* VIDEO CALL BUTTON */}
                  <button
                    onClick={initiateCall}
                    title="Start Video Call"
                    style={{
                      background: "var(--accent)", border: "none", color: "white",
                      padding: "6px 12px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "600",
                      display: "flex", alignItems: "center", gap: "4px"
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                    Call
                  </button>

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

              {/* --- NEW: VISUAL PRIVACY BANNER --- */}
              {user?.privacyLevel && user.privacyLevel !== 'standard' && (
                <div style={{
                  background: user.privacyLevel === 'ghost' ? "rgba(168, 85, 247, 0.35)" :
                    user.privacyLevel === 'hide_read' ? "rgba(249, 115, 22, 0.35)" :
                      "rgba(234, 179, 8, 0.35)",
                  color: user.privacyLevel === 'ghost' ? "#c084fc" :
                    user.privacyLevel === 'hide_read' ? "#fb923c" :
                      "#facc15",
                  padding: "8px 24px",
                  fontSize: "12px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  borderBottom: "1px solid var(--border)",
                  flexShrink: 0
                }}>
                  {user.privacyLevel === 'ghost' ? "👻 Ghost Mode Active: You are completely invisible." :
                    user.privacyLevel === 'hide_read' ? "🟠 Hide Blue Ticks Active: Read receipts are disabled." :
                      "🟡 Hide Online Active: Your online presence and typing is hidden."}
                </div>
              )}

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
                        {msg.fileUrl && !msg.fileType?.startsWith('image/') && !msg.fileType?.startsWith('audio/') && (
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

                        {/* 4. AUDIO LAYER (Native HTML5 Player) */}
                        {msg.fileUrl && msg.fileType?.startsWith('audio/') && (
                          <div style={{ marginTop: "4px" }}>
                            <audio
                              controls
                              src={msg.fileUrl}
                              style={{
                                height: "40px",
                                width: "250px",
                                outline: "none",
                                borderRadius: "20px"
                              }}
                            />
                          </div>
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
              <form onSubmit={sendMessage} style={{ padding: "20px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px", alignItems: "center" }}>

                {/* --- CONDITIONAL UI: RECORDING MODE vs TYPING MODE --- */}
                {isRecording ? (
                  // 🎙️ RECORDING ACTIVE UI
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg2)", padding: "10px 20px", borderRadius: "25px", border: "1px solid #ef4444" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#ef4444", fontWeight: "600" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }}></div>
                      Recording... {formatTime(recordingTime)}
                    </div>
                    <div style={{ display: "flex", gap: "15px" }}>
                      <button type="button" onClick={cancelRecording} style={{ color: "var(--ink3)", background: "none", border: "none", cursor: "pointer", fontWeight: "600" }}>Cancel</button>
                      <button type="button" onClick={stopRecording} style={{ color: "white", background: "#ef4444", border: "none", padding: "6px 16px", borderRadius: "20px", cursor: "pointer", fontWeight: "600" }}>Stop & Attach</button>
                    </div>
                  </div>
                ) : (
                  // ⌨️ NORMAL TYPING UI
                  <>
                    {/* Attachment Button */}
                    <label style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 10px", color: "var(--ink3)" }}>
                      <input type="file" style={{ display: "none" }} onChange={handleFileSelect} disabled={isUploading} />
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                    </label>

                    {/* Text Input */}
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => { setMessage(e.target.value); handleKeystroke(); }}
                      placeholder={isUploading ? "Uploading file..." : selectedFile ? "Add a message to your file..." : "Type a message..."}
                      disabled={isUploading}
                      style={{ flex: 1, padding: "12px", borderRadius: "25px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--ink)", outline: "none" }}
                    />

                    {/* Mic / Send Button Logic */}
                    {!message.trim() && !selectedFile ? (
                      // Show Mic button if text input is empty and no file is attached
                      <button type="button" onClick={startRecording} style={{ padding: "10px", borderRadius: "50%", border: "none", background: "var(--bg2)", color: "var(--accent)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Record Voice Note">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
                      </button>
                    ) : (
                      // Show Send button if there is text OR a file attached
                      <button type="submit" disabled={isUploading} style={{ padding: "10px 20px", borderRadius: "25px", border: "none", background: "var(--accent)", color: "white", fontWeight: 600, cursor: isUploading ? "not-allowed" : "pointer" }}>
                        {isUploading ? "..." : "Send"}
                      </button>
                    )}
                  </>
                )}

                {/* Optional: Add this tiny CSS keyframe for the blinking recording dot to your FontLoader/GlobalStyles */}
                <style>{`
                      @keyframes pulse {
                          0% { opacity: 1; transform: scale(1); }
                          50% { opacity: 0.4; transform: scale(1.2); }
                          100% { opacity: 1; transform: scale(1); }
                      }
                  `}</style>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", color: "var(--ink3)" }}>
              <p>Select a user to start messaging.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- 🎥 WEBRTC VIDEO OVERLAYS --- */}

      {/* 1. INCOMING CALL MODAL (Ringing) */}
      {callStatus === "receiving" && (
        <div style={{
          position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
          background: "var(--card)", padding: "20px 30px", borderRadius: "16px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)", zIndex: 1000,
          display: "flex", flexDirection: "column", alignItems: "center", gap: "15px",
          border: "1px solid var(--accent)"
        }}>
          <div style={{ fontWeight: "700", fontSize: "18px", color: "var(--ink)" }}>📞 Incoming Video Call</div>
          <div style={{ color: "var(--ink2)" }}>{callerInfo.name} is calling you...</div>
          <div style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
            <button onClick={declineCall} style={{ background: "#ef4444", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>Decline</button>
            <button onClick={answerCall} style={{ background: "#10b981", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", animation: "pulse 1.5s infinite" }}>Answer</button>
          </div>
        </div>
      )}

      {/* 2. ACTIVE VIDEO / RINGING WINDOW */}
      {(callStatus === "active" || callStatus === "ringing") && (
        <div style={{
          position: "fixed", bottom: "30px", right: "30px", width: "350px", height: "450px",
          background: "#000", borderRadius: "16px", overflow: "hidden",
          boxShadow: "0 15px 50px rgba(0,0,0,0.3)", zIndex: 999, border: "2px solid var(--border)"
        }}>

          {/* Remote Video (The other person) */}
          {callStatus === "active" ? (
            <video playsInline ref={userVideoRef} autoPlay style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexDirection: "column", gap: "10px" }}>
              <div style={{ animation: "pulse 1.5s infinite" }}>Calling...</div>
            </div>
          )}

          {/* Local Video (You) - Picture in Picture */}
          <div style={{
            position: "absolute", bottom: "20px", right: "20px", width: "100px", height: "140px",
            background: "#222", borderRadius: "10px", overflow: "hidden", border: "2px solid rgba(255,255,255,0.2)"
          }}>
            <video playsInline muted ref={myVideoRef} autoPlay style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
          </div>

          {/* Hang Up Button */}
          <div style={{ position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)" }}>
            <button onClick={() => endCall(true)} style={{
              background: "#ef4444", color: "white", border: "none", padding: "12px", borderRadius: "50%",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 15px rgba(239, 68, 68, 0.4)"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
            </button>
          </div>
        </div>
      )}

      {/* --- 🔔 DYNAMIC TOAST NOTIFICATION --- */}
      {callNotification && (
        <div style={{
          position: "fixed", top: "40px", left: "50%", transform: "translateX(-50%)",
          // DYNAMIC BACKGROUND: Green if success, Red if error
          background: callNotification.type === "success" ? "rgba(16, 185, 129, 0.95)" : "rgba(239, 68, 68, 0.95)",
          backdropFilter: "blur(8px)",
          color: "white", padding: "12px 24px",
          borderRadius: "30px", fontWeight: "600", fontSize: "14px",
          // DYNAMIC GLOW
          boxShadow: callNotification.type === "success" ? "0 10px 30px rgba(16, 185, 129, 0.3)" : "0 10px 30px rgba(239, 68, 68, 0.3)",
          zIndex: 9999,
          display: "flex", alignItems: "center", gap: "8px",
          animation: "rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards"
        }}>
          {/* DYNAMIC ICON */}
          {callNotification.type === "success" ? (
            // Green Checkmark Icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ) : (
            // Red 'X' Icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          )}

          {/* DYNAMIC TEXT */}
          {callNotification.text}
        </div>
      )}
    </div>
  );
}

export default Chat;