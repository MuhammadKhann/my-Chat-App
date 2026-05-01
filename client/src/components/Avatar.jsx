import React from 'react';

function Avatar({ src, name, size = 38, border = false, accent = false }) {
  const s = {
    width: size, 
    height: size, 
    borderRadius: "50%", 
    flexShrink: 0,
    objectFit: "cover",
    border: border ? `2px solid var(--accent)` : accent ? `2px solid var(--accent)` : "none",
  };
  
  if (src) {
    return (
      <img 
        src={src} 
        alt={name} 
        style={s} 
        onError={(e) => { 
          e.target.src = `https://ui-avatars.com/api/?name=${name}&background=random`; 
        }} 
      />
    );
  }
  
  return (
    <div 
      style={{
        ...s,
        background: `linear-gradient(135deg, var(--accent), var(--accent-h))`,
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "#fff",
        fontWeight: 600,
        fontSize: size * 0.4,
      }}
    >
      {name?.charAt(0).toUpperCase()}
    </div>
  );
}

export default Avatar;
