import React from 'react';

const ChatStyles = () => (
  <style>{`
    @keyframes pulse {
      0%   { opacity: 1; transform: scale(1); }
      50%  { opacity: 0.45; transform: scale(1.25); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .spinning { animation: spin 1s linear infinite; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes rise {
      from { opacity: 0; transform: translateY(16px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-8px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes msgIn {
      from { opacity: 0; transform: translateY(8px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body, #root {
      height: 100%;
      font-family: 'DM Sans', sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border2, rgba(0,0,0,0.15)); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--ink3); }

    /* Sidebar chat item hover */
    .chat-item { transition: background 0.15s ease; }
    .chat-item:hover { background: var(--bg3) !important; }

    /* Nav icon buttons */
    .nav-icon-btn {
      display: flex; align-items: center; justify-content: center;
      width: 34px; height: 34px; border-radius: 9px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--ink2);
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .nav-icon-btn:hover {
      background: var(--bg2);
      color: var(--ink);
      border-color: var(--border2);
    }

    /* Input focus ring */
    .chat-app-input:focus {
      outline: none;
      border-color: var(--accent) !important;
      box-shadow: 0 0 0 3px var(--accent2);
    }

    /* Privacy menu item */
    .privacy-item { transition: background 0.12s; cursor: pointer; }
    .privacy-item:hover { background: var(--bg3) !important; }

    /* Theme menu item */
    .theme-item { transition: background 0.12s; cursor: pointer; }
    .theme-item:hover { background: var(--bg3) !important; }

    /* Message bubble animation */
    .msg-bubble { animation: msgIn 0.22s cubic-bezier(0.22,1,0.36,1) both; }

    /* Audio player */
    audio { accent-color: var(--accent); }

    /* Tab button */
    .tab-btn { transition: color 0.15s, border-color 0.15s; }

    /* Send / action buttons */
    .action-btn {
      display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--ink2);
      cursor: pointer;
      transition: transform 0.08s, background 0.15s, color 0.15s;
    }
    .action-btn:hover { background: var(--bg2); color: var(--ink); }
    .action-btn:active { transform: scale(0.96); }

    /* Shimmer loader */
    .shimmer {
      background: linear-gradient(
        90deg,
        var(--bg2) 0%,
        color-mix(in srgb, var(--bg2) 70%, var(--card)) 50%,
        var(--bg2) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `}</style>
);

export default ChatStyles;
