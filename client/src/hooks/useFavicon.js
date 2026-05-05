import { useEffect } from 'react';

/**
 * Dynamic favicon hook - updates favicon based on theme accent color
 * @param {string} themeAccent - The theme's accent color (e.g., "#6366f1")
 * @param {string} letter - The letter to display (default: "C" for Chat App)
 */
export const useFavicon = (themeAccent = "#6366f1", letter = "C") => {
  useEffect(() => {
    // Generate SVG with theme color
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="${themeAccent}"/>
  <text x="16" y="23" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="20" fill="white">${letter}</text>
</svg>
    `.trim();

    // Convert SVG to data URL
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);

    // Find existing favicon or create new one
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.type = 'image/svg+xml';
      document.head.appendChild(favicon);
    }

    // Update favicon URL
    favicon.href = url;

    // Cleanup: revoke old URL to prevent memory leaks
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [themeAccent, letter]);
};

export default useFavicon;
