import React from 'react';

function SmartVideo({ src, onClick, isMe }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        width: 220,
        height: 160,
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--bg2)",
        cursor: "pointer",
        border: isMe ? "2px solid var(--accent)" : "2px solid var(--border)",
      }}
    >
      <video
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

export default SmartVideo;
