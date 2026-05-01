import React from 'react';
import { THEMES } from './GlobalStyles';

function ThemePicker({ currentTheme, onThemeChange, onClose }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: 200,
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
        Select Theme
      </div>
      {Object.entries(THEMES).map(([id, theme]) => (
        <div
          key={id}
          className="theme-item"
          onClick={() => {
            onThemeChange(id);
            onClose();
          }}
          style={{
            padding: "11px 14px",
            borderBottom: "1px solid var(--border)",
            background: currentTheme === id ? "var(--accent2)" : "transparent",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              flexShrink: 0,
              background: `linear-gradient(135deg, ${theme.start} 0%, ${theme.end} 100%)`,
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.2)",
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
              {theme.name}
            </div>
          </div>
          {currentTheme === id && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

export default ThemePicker;
