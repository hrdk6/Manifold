import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' } as const;

export const IconChevron = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
export const IconSearch = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </svg>
);
export const IconSun = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
  </svg>
);
export const IconMoon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />
  </svg>
);
export const IconMenu = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const IconPlay = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7 5l12 7-12 7V5z" fill="currentColor" stroke="none" />
  </svg>
);
export const IconPause = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 5v14M16 5v14" strokeWidth="3" />
  </svg>
);
export const IconPrev = (p: P) => (
  <svg {...base} {...p}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);
export const IconNext = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
export const IconReset = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 12a8 8 0 108-8H8" />
    <path d="M10 1L7 4l3 3" />
  </svg>
);
export const IconBook = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5v-15z" />
    <path d="M4 20.5A2.5 2.5 0 016.5 18H20v3H6.5" />
  </svg>
);
export const IconCalc = (p: P) => (
  <svg {...base} {...p}>
    <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
    <path d="M8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" />
  </svg>
);
export const IconList = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
  </svg>
);
export const IconSigma = (p: P) => (
  <svg {...base} {...p}>
    <path d="M18 5H6l6 7-6 7h12" />
  </svg>
);
export const IconCards = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="7" width="13" height="14" rx="2" />
    <path d="M8 3h11a2 2 0 012 2v11" />
  </svg>
);
export const IconCheck = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const IconX = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const IconBulb = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" />
  </svg>
);
export const IconTarget = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" />
  </svg>
);
export const IconAlert = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.5l9.5 16.5h-19L12 3.5z" />
    <path d="M12 10v4.5M12 17.5h.01" />
  </svg>
);
export const IconSpark = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />
  </svg>
);
export const IconQuiz = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 115 .2c0 1.8-2.5 2-2.5 3.8M12 17h.01" />
  </svg>
);
export const IconHome = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z" />
  </svg>
);
export const IconShuffle = (p: P) => (
  <svg {...base} {...p}>
    <path d="M16 4h4v4M20 4l-7 7M4 20l6-6M16 20h4v-4M20 20l-5-5M4 4l5 5" />
  </svg>
);
export const IconPlus = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconTrash = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);
export const IconExternal = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />
  </svg>
);
export const IconCopy = (p: P) => (
  <svg {...base} {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" />
  </svg>
);
export const IconSend = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);
export const IconStop = (p: P) => (
  <svg {...base} {...p}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />
  </svg>
);
export const IconGear = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </svg>
);
export const IconHistory = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3.5 12a8.5 8.5 0 102.5-6L3.5 8.5" />
    <path d="M3.5 4v4.5H8M12 7.5V12l3 2" />
  </svg>
);
export const IconChat = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 12.5a7.5 7.5 0 01-11 6.6L4 20l1-4.3A7.5 7.5 0 1120 12.5z" />
    <path d="M9 11h.01M12.5 11h.01M16 11h.01" />
  </svg>
);
export const IconLayers = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 12.5l9 5 9-5M3 17l9 5 9-5" />
  </svg>
);
export const IconUpload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M4 15v4a1 1 0 001 1h14a1 1 0 001-1v-4" />
  </svg>
);
export const IconFilter = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 5h16l-6 7.5V19l-4 1.5v-8L4 5z" />
  </svg>
);
