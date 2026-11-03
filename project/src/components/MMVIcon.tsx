export function MMVIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Globe circle */}
      <circle cx="58" cy="52" r="36" fill="currentColor" opacity="0.85" />

      {/* Globe latitude lines */}
      <ellipse cx="58" cy="52" rx="36" ry="18" fill="none" stroke="white" strokeWidth="1.5" opacity="0.4" />
      <line x1="22" y1="52" x2="94" y2="52" stroke="white" strokeWidth="1.5" opacity="0.4" />

      {/* Globe meridian lines */}
      <ellipse cx="58" cy="52" rx="18" ry="36" fill="none" stroke="white" strokeWidth="1.5" opacity="0.4" />

      {/* Cross on top-right of globe */}
      <rect x="62" y="20" width="10" height="30" rx="2" fill="white" />
      <rect x="55" y="28" width="24" height="10" rx="2" fill="white" />

      {/* Dove body */}
      <path
        d="M8 58 C10 46 22 38 32 40 C36 41 40 44 42 48 C44 52 43 57 40 60 C38 62 35 63 32 62 C30 61 28 59 26 58 C22 56 16 57 12 60 Z"
        fill="white"
        opacity="0.95"
      />

      {/* Dove head */}
      <circle cx="42" cy="44" r="6" fill="white" opacity="0.95" />
      <circle cx="44" cy="43" r="1.5" fill="#8B2635" />

      {/* Dove beak */}
      <path d="M47 44 L52 43 L47 46 Z" fill="white" opacity="0.9" />

      {/* Dove wing (upper) */}
      <path
        d="M26 54 C22 46 16 40 10 38 C14 36 22 38 28 44 C32 48 34 53 32 56 Z"
        fill="white"
        opacity="0.9"
      />

      {/* Dove wing (secondary feathers) */}
      <path
        d="M30 56 C28 50 20 44 12 44 C16 42 24 44 30 50 C34 54 35 58 33 60 Z"
        fill="white"
        opacity="0.7"
      />

      {/* Dove tail */}
      <path
        d="M10 60 C8 64 6 68 8 72 C12 70 16 66 14 62 Z"
        fill="white"
        opacity="0.85"
      />
      <path
        d="M14 62 C14 66 12 70 14 74 C18 72 20 68 18 64 Z"
        fill="white"
        opacity="0.7"
      />
    </svg>
  );
}
