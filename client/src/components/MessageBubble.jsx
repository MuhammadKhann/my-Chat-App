import React from 'react';
import SmartImage from './SmartImage';
import SmartVideo from './SmartVideo';
import Avatar from './Avatar';
import AudioPlayer from './AudioPlayer';

const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const renderTicks = (status) => {
  if (status === 'seen') {
    return (
      <span style={{ color: '#4fc3f7', marginLeft: 4 }}>
        <svg width="14" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 7l-8 8-4-4" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M12 15l8-8" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span style={{ color: 'var(--ink3)', marginLeft: 4 }}>
        <svg width="14" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 7l-8 8-4-4" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M12 15l8-8" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      </span>
    );
  }
  return (
    <span style={{ color: 'var(--ink3)', marginLeft: 4 }}>
      <svg width="8" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" fill="none"/>
      </svg>
    </span>
  );
};

function MessageBubble({ 
  msg, 
  isMe, 
  partnerName, 
  onImageClick, 
  onVideoClick,
  showAvatar = true 
}) {
  if (msg.isSystem) {
    return (
      <div style={{ display: "flex", justifyContent: "center", margin: "16px 0", width: "100%" }}>
        <div style={{
          padding: "6px 14px",
          background: "rgba(0,0,0,0.05)",
          color: "var(--ink3)",
          fontSize: 12,
          fontWeight: 500,
          borderRadius: 20,
          border: "1px solid var(--border)",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          {msg.text}
        </div>
      </div>
    );
  }

  const isImage = msg.fileType?.startsWith('image/');
  const isVideo = msg.fileType?.startsWith('video/');
  const isAudio = msg.fileType?.startsWith('audio/');

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMe ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 8,
        marginBottom: 12,
      }}
    >
      {showAvatar && !isMe && (
        <Avatar src={msg.senderAvatar} name={partnerName} size={28} />
      )}
      
      <div
        className="msg-bubble"
        style={{
          maxWidth: "70%",
          padding: isImage || isVideo ? 4 : "10px 14px",
          borderRadius: 16,
          background: isMe ? "var(--accent)" : "var(--card)",
          color: isMe ? "#fff" : "var(--ink)",
          border: isMe ? "none" : "1px solid var(--border)",
          wordBreak: "break-word",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      >
        {isImage && msg.fileUrl && (
          <SmartImage
            src={msg.fileUrl}
            alt="Shared image"
            style={{ width: 220, height: 160, borderRadius: 12 }}
            onClick={() => onImageClick(msg.fileUrl)}
          />
        )}
        
        {isVideo && msg.fileUrl && (
          <SmartVideo
            src={msg.fileUrl}
            onClick={() => onVideoClick(msg.fileUrl)}
            isMe={isMe}
          />
        )}
        
        {isAudio && msg.fileUrl && (
          <AudioPlayer
            src={msg.fileUrl}
            isMe={isMe}
            id={msg._id || msg.id || msg.fileUrl}
          />
        )}
        
        {msg.text && (
          <div style={{ fontSize: 14, lineHeight: 1.4 }}>{msg.text}</div>
        )}
        
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 4,
            marginTop: 4,
            fontSize: 11,
            opacity: 0.7,
          }}
        >
          {formatMessageTime(msg.createdAt || msg.timestamp)}
          {isMe && renderTicks(msg.status)}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
