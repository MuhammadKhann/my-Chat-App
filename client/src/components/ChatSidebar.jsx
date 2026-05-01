import React from 'react';
import Avatar from './Avatar';

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

function ChatSidebar({ 
  chatList, 
  onlineUsers, 
  selectedUser, 
  onSelectUser,
  searchQuery,
  onSearchChange,
  onSearch,
  searchResults,
  currentUser
}) {
  const displayList = searchQuery.trim() ? searchResults : chatList;

  return (
    <div
      style={{
        width: 320,
        height: "100%",
        borderRight: "1px solid var(--border)",
        background: "var(--card)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar src={currentUser?.avatar} name={currentUser?.username} size={36} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
              {currentUser?.username}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink3)" }}>Online</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search users..."
            className="nexus-input"
            style={{
              flex: 1,
              padding: "9px 12px",
              borderRadius: 9,
              fontSize: 13,
              border: "1px solid var(--border)",
              background: "var(--bg2)",
              color: "var(--ink)",
            }}
          />
          <button
            onClick={onSearch}
            className="gradient-btn"
            style={{
              padding: "9px 14px",
              borderRadius: 9,
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Search
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
        {displayList.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--ink3)",
              fontSize: 13,
            }}
          >
            {searchQuery.trim() ? "No users found" : "No conversations yet"}
          </div>
        ) : (
          displayList.map((chat) => {
            const isActive = selectedUser?._id === chat._id;
            const isOnline = onlineUsers.has(chat._id);

            return (
              <div
                key={chat._id}
                className="chat-item"
                onClick={() => onSelectUser(chat)}
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  background: isActive ? "var(--bg2)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                }}
              >
                <div style={{ position: "relative" }}>
                  <Avatar src={chat.avatar} name={chat.username} size={44} />
                  {isOnline && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "#22c55e",
                        border: "2px solid var(--card)",
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--ink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {chat.username}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ink3)" }}>
                      {formatTime(chat.time)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--ink2)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {chat.lastMessage || "No messages yet"}
                    </span>
                    {chat.unreadCount > 0 && (
                      <span
                        style={{
                          background: "var(--accent)",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 600,
                          minWidth: 18,
                          height: 18,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0 6px",
                        }}
                      >
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ChatSidebar;
