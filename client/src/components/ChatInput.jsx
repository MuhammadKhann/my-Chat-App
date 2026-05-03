import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';

function ChatInput({
  message,
  onMessageChange,
  onSend,
  onTypingStart,
  onTypingStop,
  selectedFile,
  onFileSelect,
  isUploading,
  disabled
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const onEmojiClick = (emojiData) => {
    onMessageChange(message + emojiData.emoji);
  };

  return (
    <div
      style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--border)",
        background: "var(--card)",
        display: "flex",
        alignItems: "flex-end",
        gap: 10,
        position: "relative",
      }}
    >
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          style={{
            position: "absolute",
            bottom: "calc(100% + 10px)",
            left: 16,
            zIndex: 1000,
          }}
        >
          <EmojiPicker onEmojiClick={onEmojiClick} theme="auto" />
        </div>
      )}

      {/* Emoji Button */}
      <button
        type="button"
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: showEmojiPicker ? "var(--accent)" : "var(--ink2)",
          background: "none",
          border: "none",
          transition: "color 0.15s",
          padding: 0,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      </button>

      {/* File attachment button */}
      <label
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--ink2)",
          transition: "background 0.15s",
        }}
      >
        <input
          type="file"
          onChange={onFileSelect}
          style={{ display: "none" }}
          disabled={isUploading}
        />
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
      </label>

      {/* Message input */}
      <div style={{ flex: 1, position: "relative" }}>
        <textarea
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={onTypingStart}
          onBlur={onTypingStop}
          placeholder="Type a message..."
          disabled={disabled}
          autoComplete="off"
          spellCheck="false"
          autoCorrect="off"
          autoCapitalize="off"
          inputMode="text"
          style={{
            width: "100%",
            minHeight: 40,
            maxHeight: 120,
            padding: "10px 14px",
            borderRadius: 20,
            border: "1px solid var(--border)",
            background: "var(--bg2)",
            color: "var(--ink)",
            fontSize: 14,
            resize: "none",
            outline: "none",
          }}
        />
        {selectedFile && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: 0,
              right: 0,
              padding: "8px 12px",
              background: "var(--accent2)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{selectedFile.name}</span>
            <button
              onClick={() => onFileSelect({ target: { files: null } })}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "var(--ink2)",
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Send button */}
      <button
        onClick={onSend}
        disabled={(!message.trim() && !selectedFile) || isUploading || disabled}
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "none",
          background: "var(--accent)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: (!message.trim() && !selectedFile) || isUploading || disabled ? "not-allowed" : "pointer",
          opacity: (!message.trim() && !selectedFile) || isUploading || disabled ? 0.5 : 1,
          transition: "transform 0.1s",
        }}
      >
        {isUploading ? (
          <svg width="20" height="20" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" fill="none"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        )}
      </button>
    </div>
  );
}

export default ChatInput;
