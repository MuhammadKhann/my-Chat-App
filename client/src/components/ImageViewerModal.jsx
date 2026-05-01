import React, { useEffect } from 'react';
import DownloadButton from './DownloadButton';

function ImageViewerModal({ src, onClose }) {
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

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
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
        }}
      >
        <img
          src={src}
          alt="View"
          style={{
            maxWidth: "90vw",
            maxHeight: "90vh",
            borderRadius: 12,
            objectFit: "contain",
          }}
        />
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
          <DownloadButton url={src} filename="image.jpg" />
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "none",
              background: "rgba(0,0,0,0.6)",
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
  );
}

export default ImageViewerModal;
