import React, { useState } from 'react';

const forceDownloadMedia = async (url, customFilename, setDownloading) => {
  try {
    setDownloading(true);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = customFilename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download failed:', error);
    alert('Download failed. Please try again.');
  } finally {
    setDownloading(false);
  }
};

function DownloadButton({ url, filename }) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  return (
    <button
      onClick={() => forceDownloadMedia(url, filename, setIsDownloading)}
      disabled={isDownloading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--card)",
        color: "var(--ink2)",
        fontSize: 12,
        cursor: isDownloading ? "wait" : "pointer",
        opacity: isDownloading ? 0.7 : 1,
      }}
    >
      {isDownloading ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" fill="none"/>
          </svg>
          Downloading...
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download
        </>
      )}
    </button>
  );
}

export default DownloadButton;
