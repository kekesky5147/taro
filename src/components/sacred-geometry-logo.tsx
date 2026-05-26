"use client";

export function SacredGeometryLogo({
  className = "",
  hideGlow = false,
  idPrefix = "sg",
}: {
  className?: string;
  hideGlow?: boolean;
  /** SVG filter/gradient id 충돌 방지 (카드 3장 등 복수 인스턴스) */
  idPrefix?: string;
}) {
  const glowId = `${idPrefix}-glow`;
  const gradientId = `${idPrefix}-cosmicGradient`;

  return (
    <div className={`relative ${className}`}>
      {/* Outer glow effect */}
      {!hideGlow && <div className="absolute inset-0 blur-2xl bg-[oklch(0.7_0.15_260/0.3)] rounded-full scale-150" />}
      
      <svg
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid meet"
        className="block h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Glow filters */}
        <defs>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.8 0.18 190)" />
            <stop offset="50%" stopColor="oklch(0.75 0.15 280)" />
            <stop offset="100%" stopColor="oklch(0.75 0.2 330)" />
          </linearGradient>
        </defs>
        
        {/* Outer circle */}
        <circle 
          cx="100" 
          cy="100" 
          r="90" 
          stroke={`url(#${gradientId})`}
          strokeWidth="1.5" 
          filter={`url(#${glowId})`}
          className="opacity-60"
        />
        
        {/* Middle circle */}
        <circle 
          cx="100" 
          cy="100" 
          r="70" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="1" 
          filter={`url(#${glowId})`}
          className="opacity-50"
        />
        
        {/* Inner circle */}
        <circle 
          cx="100" 
          cy="100" 
          r="50" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="1" 
          filter={`url(#${glowId})`}
          className="opacity-40"
        />
        
        {/* Sacred triangle pointing up */}
        <path 
          d="M100 30 L165 130 L35 130 Z" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="1.5" 
          fill="none"
          filter={`url(#${glowId})`}
          className="opacity-70"
        />
        
        {/* Sacred triangle pointing down */}
        <path 
          d="M100 170 L35 70 L165 70 Z" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="1.5" 
          fill="none"
          filter={`url(#${glowId})`}
          className="opacity-70"
        />
        
        {/* Center eye / third eye */}
        <ellipse 
          cx="100" 
          cy="100" 
          rx="25" 
          ry="15" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="1.5"
          fill="none"
          filter={`url(#${glowId})`}
          className="opacity-80"
        />
        
        {/* Center pupil */}
        <circle 
          cx="100" 
          cy="100" 
          r="8" 
          fill={`url(#${gradientId})`}
          filter={`url(#${glowId})`}
          className="opacity-90"
        />
        
        {/* Radiating lines */}
        {[0, 30, 60, 90, 120, 150].map((angle) => (
          <line
            key={angle}
            x1="100"
            y1="10"
            x2="100"
            y2="30"
            stroke={`url(#${gradientId})`}
            strokeWidth="1"
            filter={`url(#${glowId})`}
            className="opacity-40"
            transform={`rotate(${angle} 100 100)`}
          />
        ))}
        
        {/* Moon crescent left */}
        <path 
          d="M40 100 A30 30 0 0 1 40 70 A25 25 0 0 0 40 100" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="1"
          fill="none"
          filter={`url(#${glowId})`}
          className="opacity-50"
        />
        
        {/* Moon crescent right */}
        <path 
          d="M160 100 A30 30 0 0 0 160 70 A25 25 0 0 1 160 100" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="1"
          fill="none"
          filter={`url(#${glowId})`}
          className="opacity-50"
        />
      </svg>
    </div>
  );
}
