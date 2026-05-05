import { useEffect } from 'react';

/**
 * Dynamic favicon hook - updates favicon with exact theme gradient
 * @param {Object} theme - The theme object with start and end colors
 * @param {string} letter - The letter to display (default: "C" for Chat App)
 */
export const useFavicon = (theme = { start: "#6d28d9", end: "#ec4899" }, letter = "C") => {
  useEffect(() => {
    const startColor = theme.start || "#6d28d9";
    const endColor = theme.end || "#ec4899";

    // Generate SVG with exact theme gradient
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="favgrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${startColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${endColor};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="url(#favgrad)"/>
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
  }, [theme, letter]);
};

export default useFavicon;
