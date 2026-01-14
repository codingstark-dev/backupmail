/**
 * CYBERPUNK Theme - Neon colors and futuristic vibes 🔮⚡
 */

export const theme = {
  colors: {
    // NEON CYBERPUNK PALETTE
    primary: '#00FFFF',        // Neon Cyan ⚡
    primaryGlow: '#0FF',       // Bright cyan glow
    secondary: '#FF00FF',      // Hot Magenta 💗
    accent: '#9D00FF',         // Electric Purple 🔮
    success: '#39FF14',        // Neon Green ✨
    error: '#FF0055',          // Hot Pink Error ❌
    warning: '#FFFF00',        // Electric Yellow ⚠
    info: '#00FFFF',           // Neon Cyan ℹ
    muted: '#666666',          // Dark Gray
    background: '#000000',     // Pure Black 🌑
    backgroundLight: '#0a0a0a', // Slightly lighter black
    backgroundPanel: '#111111', // Panel background
    border: '#00FFFF',         // Neon Cyan borders
    borderGlow: '#FF00FF',     // Magenta glow borders
    text: '#FFFFFF',           // Pure White
    textGlow: '#00FFFF',       // Cyan glowing text
    textDim: '#888888',        // Dimmed text
    textNeon: '#39FF14',       // Neon green text
  },
  
  borders: {
    single: 'single' as const,
    double: 'double' as const,
    rounded: 'rounded' as const,
  },
  
  spacing: {
    padding: 2,
    margin: 1,
  },
  
  // CYBERPUNK ASCII ART
  ascii: {
    // Box drawing
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    
    // Dividers
    divider: '▬',
    heavyDivider: '━',
    lightDivider: '─',
    
    // Progress
    progressFull: '█',
    progressEmpty: '░',
    progressPartial: '▓',
    
    // Glitch
    glitch1: '▒',
    glitch2: '▓',
    
    // Pointers
    arrowRight: '►',
    arrowLeft: '◄',
    pointer: '▶',
    
    // Shapes
    diamond: '◆',
    circle: '●',
    square: '■',
  },
  
  icons: {
    // CYBERPUNK ICONS
    email: '◉',
    add: '⊕',
    list: '◈',
    migrate: '⟲',
    settings: '⚙',
    exit: '⊗',
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: '◉',
    folder: '◢',
    inbox: '◤',
    sent: '◥',
    drafts: '◣',
    trash: '⌫',
    spam: '⊘',
    spinner: '◐',
    check: '✓',
    uncheck: '○',
    checked: '◉',
    unchecked: '○',
    arrow: '→',
    arrowUp: '↑',
    arrowDown: '↓',
    arrowLeft: '←',
    arrowRight: '→',
    bolt: '⚡',
    star: '★',
    cpu: '◉',
    network: '◈',
    download: '⇓',
    upload: '⇑',
    sync: '⟲',
  },
  
  // Neon text effects
  neon: {
    prefix: '[',
    suffix: ']',
    glow: '◆',
    bracket: '【',
    bracketEnd: '】',
  }
};

export type Theme = typeof theme;

// Create glowing neon text
export function glowText(text: string): string {
  return `${theme.neon.glow} ${text} ${theme.neon.glow}`;
}

// Create cyberpunk header box
export function cyberpunkHeader(text: string): string {
  const line = theme.ascii.heavyDivider.repeat(text.length + 4);
  return `${theme.ascii.topLeft}${line}${theme.ascii.topRight}\n${theme.ascii.vertical}  ${text}  ${theme.ascii.vertical}\n${theme.ascii.bottomLeft}${line}${theme.ascii.bottomRight}`;
}

// Create neon scanline
export function scanline(width: number): string {
  return theme.ascii.lightDivider.repeat(width);
}

// Create neon box
export function neonBox(width: number, height: number): string[] {
  const lines: string[] = [];
  const top = theme.ascii.topLeft + theme.ascii.horizontal.repeat(width - 2) + theme.ascii.topRight;
  const middle = theme.ascii.vertical + ' '.repeat(width - 2) + theme.ascii.vertical;
  const bottom = theme.ascii.bottomLeft + theme.ascii.horizontal.repeat(width - 2) + theme.ascii.bottomRight;
  
  lines.push(top);
  for (let i = 0; i < height - 2; i++) {
    lines.push(middle);
  }
  lines.push(bottom);
  
  return lines;
}
