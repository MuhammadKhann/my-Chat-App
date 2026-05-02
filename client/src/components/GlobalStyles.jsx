export const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Bricolage+Grotesque:wght@400;500;600;700&display=swap');
  `}</style>
);

export const THEMES = {
  // ─── Dark themes (darkest to lighter) ────────────────────────
  midnight:  { name: "Midnight", start: "#020617", end: "#0f172a", accent: "#818cf8", accentH: "#4338ca" },
  nebula:    { name: "Nebula", start: "#0b1120", end: "#7c3aed", accent: "#22d3ee", accentH: "#0f172a" },
  aurora:    { name: "Aurora", start: "#0f172a", end: "#0d9488", accent: "#38bdf8", accentH: "#0f766e" },
  slate:     { name: "Slate", start: "#475569", end: "#1e293b", accent: "#475569", accentH: "#1e293b" },
  sapphire:  { name: "Sapphire", start: "#172554", end: "#2563eb", accent: "#1E44A0", accentH: "#153075" },
  // ─── Mid / vibrant themes ───────────────────────────────────
  cyberpunk: { name: "Cyberpunk", start: "#06b6d4", end: "#d946ef", accent: "#A24EEF", accentH: "#8B3CD6" },
  cosmic:    { name: "Cosmic", start: "#3B82F6", end: "#8B5CF6", accent: "#5C6BF6", accentH: "#4956D6" },
  orchid:    { name: "Orchid", start: "#6d28d9", end: "#ec4899", accent: "#f472b6", accentH: "#9333ea" },
  oceanic:   { name: "Oceanic", start: "#06b6d4", end: "#3b82f6", accent: "#1A84E8", accentH: "#1468B8" },
  emerald:   { name: "Emerald", start: "#0f766e", end: "#10b981", accent: "#34d399", accentH: "#115e59" },
  // ─── Light / warm themes ────────────────────────────────────
  sunset:    { name: "Sunset", start: "#f97316", end: "#ec4899", accent: "#F35D58", accentH: "#D34945" },
  sunrise:   { name: "Sunrise", start: "#f97316", end: "#ea580c", accent: "#fbbf24", accentH: "#d97706" },
};

export const GlobalStyles = ({ dark, themeId = "cosmic" }) => {
  const theme = THEMES[themeId] || THEMES.cosmic;

  return (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #F7F6F3;
      --bg2:       #EDECEA;
      --bg3:       #E3E1DE;
      --card:      #FFFFFF;
      --card2:     #F2F1EE;
      --ink:       #18181A;
      --ink2:      #4A4A52;
      --ink3:      #9898A4;
      --border:    rgba(0,0,0,0.08);
      --border2:   rgba(0,0,0,0.14);
      --accent:    ${theme.accent};
      --accent-h:  ${theme.accentH};
      --accent2:   color-mix(in srgb, ${theme.accent} 13%, #ffffff);
      --gradient-start: ${theme.start};
      --gradient-end: ${theme.end};
      --shadow:   0 2px 12px rgba(20,30,60,0.08), 0 0 0 1px rgba(20,30,60,0.05);
      --r:        12px;
      --rs:       8px;
    }

    ${dark ? `
    :root {
      --bg:        #0E0E10;
      --bg2:       #16161A;
      --bg3:       #1E1E24;
      --card:      #16161A;
      --card2:     #1E1E24;
      --ink:       #F0F0F4;
      --ink2:      #A0A0B0;
      --ink3:      #56566A;
      --border:    rgba(255,255,255,0.07);
      --border2:   rgba(255,255,255,0.13);
      --accent2:   color-mix(in srgb, ${theme.accent} 18%, #000000);
      --shadow:   0 2px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04);
    }` : ""}

    html, body, #root {
      min-height: 100vh;
      min-height: calc(var(--vh, 1vh) * 100);
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--ink);
      transition: background 0.3s, color 0.3s;
    }

    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus {
      -webkit-box-shadow: 0 0 0px 1000px var(--bg2) inset !important;
      -webkit-text-fill-color: var(--ink) !important;
      transition: background-color 5000s ease-in-out 0s;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes rise {
      from { opacity: 0; transform: translateY(16px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes pulse {
      0%   { opacity: 1; transform: scale(1); }
      50%  { opacity: 0.45; transform: scale(1.25); }
      100% { opacity: 1; transform: scale(1); }
    }
  `}</style>
);
}
