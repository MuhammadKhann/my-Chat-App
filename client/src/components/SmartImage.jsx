import React, { useState } from 'react';

function SmartImage({ src, alt, style, onClick }) {
  const [status, setStatus] = useState("loading");
  
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 12,
        background: "var(--bg2)",
        ...style,
      }}
    >
      {status === "loading" && (
        <div
          className="shimmer"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 12,
          }}
        />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        onClick={onClick}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: status === "loaded" ? "block" : "none",
          cursor: onClick ? "pointer" : "default",
        }}
      />
    </div>
  );
}

export default SmartImage;
