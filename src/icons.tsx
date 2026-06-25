// 工具图标集合
const iconProps = {
  width: 28, height: 28, viewBox: "0 0 24 24",
  fill: "none", stroke: "currentColor", strokeWidth: 1.5,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};

export const icons: Record<string, React.ReactNode> = {
  merge: (
    <svg {...iconProps}>
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  split: (
    <svg {...iconProps}>
      <rect x="2" y="4" width="8" height="16" rx="1" />
      <rect x="14" y="4" width="8" height="16" rx="1" />
      <path d="M10 12h4" />
    </svg>
  ),
  extract: (
    <svg {...iconProps}>
      <path d="M15 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7z" />
      <path d="M14 2v4a2 2 0 002 2h4" />
      <path d="M10 9l4 3-4 3" />
    </svg>
  ),
  word: (
    <svg {...iconProps}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h2M8 17h2M14 13h2M14 17h2" />
    </svg>
  ),
  image: (
    <svg {...iconProps}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  photo: (
    <svg {...iconProps}>
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  compress: (
    <svg {...iconProps}>
      <path d="M4 14l4-8 4 8M4 14h4M4 14l4 8 4-8M20 10l-4 8-4-8" />
      <path d="M8 14h4M16 10h-4" />
    </svg>
  ),
  lock: (
    <svg {...iconProps}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  unlock: (
    <svg {...iconProps}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 019.9-1" />
    </svg>
  ),
  water: (
    <svg {...iconProps}>
      <path d="M12 2C8 7 4 10 4 14a8 8 0 0016 0c0-4-4-7-8-12z" />
      <path d="M12 22v-8M8 18h8" />
    </svg>
  ),
  dewater: (
    <svg {...iconProps}>
      <path d="M12 2C8 7 4 10 4 14a8 8 0 0016 0c0-4-4-7-8-12z" />
      <line x1="4" y1="4" x2="20" y2="20" />
    </svg>
  ),
  rotate: (
    <svg {...iconProps}>
      <path d="M21 12a9 9 0 11-9-9c2.52 0 4.85.83 6.72 2.24" />
      <path d="M21 3v6h-6" />
    </svg>
  ),
  trash: (
    <svg {...iconProps}>
      <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  ),
  sign: (
    <svg {...iconProps}>
      <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  ),
  ocr: (
    <svg {...iconProps}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h5M12 12h5M12 17h5" />
    </svg>
  ),
  compare: (
    <svg {...iconProps}>
      <rect x="2" y="3" width="7" height="18" rx="1" />
      <rect x="15" y="3" width="7" height="18" rx="1" />
      <path d="M9 12h6" />
    </svg>
  ),
  order: (
    <svg {...iconProps}>
      <path d="M3 6h18M3 12h18M3 18h18" />
      <circle cx="19" cy="6" r="2" fill="currentColor" />
      <circle cx="9" cy="12" r="2" fill="currentColor" />
      <circle cx="19" cy="18" r="2" fill="currentColor" />
    </svg>
  ),
  batch: (
    <svg {...iconProps}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      <path d="M12 12v3" />
    </svg>
  ),
  unlock2: (
    <svg {...iconProps}>
      <path d="M9 12l2 2 4-4" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
};
