import React from 'react';

const PRIVACY_OPTIONS = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Show online status and read receipts',
    icon: '🌐',
  },
  {
    id: 'hide_online',
    name: 'Hide Online',
    description: 'Hide online status but show read receipts',
    icon: '👤',
  },
  {
    id: 'hide_read',
    name: 'Hide Read',
    description: 'Show online status but hide read receipts',
    icon: '👁️',
  },
  {
    id: 'ghost',
    name: 'Ghost Mode',
    description: 'Hide both online status and read receipts',
    icon: '👻',
  },
];

function PrivacyMenu({ currentLevel, onPrivacyChange, onClose }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: 240,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        zIndex: 9999,
        overflow: "hidden",
        animation: "fadeIn 0.18s ease both",
      }}
    >
      <div
        style={{
          padding: "10px 14px 8px",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "var(--ink3)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        Privacy Mode
      </div>
      {PRIVACY_OPTIONS.map((option) => (
        <div
          key={option.id}
          className="privacy-item"
          onClick={() => {
            onPrivacyChange(option.id);
            onClose();
          }}
          style={{
            padding: "11px 14px",
            borderBottom: "1px solid var(--border)",
            background: currentLevel === option.id ? "var(--accent2)" : "transparent",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 16 }}>{option.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
              {option.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>
              {option.description}
            </div>
          </div>
          {currentLevel === option.id && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

export default PrivacyMenu;
