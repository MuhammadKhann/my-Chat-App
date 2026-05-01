import React, { useRef, useState, useEffect } from 'react';
import DownloadButton from './DownloadButton';

function VideoPlayerModal({ src, onClose }) {
  const videoRef = useRef(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e) => { 
      if (e.key === "Escape") onClose(); 
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.95)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          maxWidth: "90vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <video
          ref={videoRef}
          src={src}
          controls
          autoPlay
          style={{
            maxWidth: "90vw",
            maxHeight: "80vh",
            borderRadius: 12,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 4px",
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: "#fff", fontSize: 12, opacity: 0.7 }}>Speed:</span>
            {[0.5, 1, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: playbackSpeed === speed ? "var(--accent)" : "rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <DownloadButton url={src} filename="video.mp4" />
            <button
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "none",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayerModal;
