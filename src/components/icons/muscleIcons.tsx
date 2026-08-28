import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const ChestIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 7c3-2 8-2 16 0-1 6-4 10-8 12-4-2-7-6-8-12z" />
    <path d="M12 5v14" />
    <path d="M7 10c2 2 3 2 5 2s3 0 5-2" />
  </svg>
);

export const ShouldersIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="7" r="3" />
    <path d="M5 18v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
    <path d="M2 14c1-2 2-3 4-3" />
    <path d="M22 14c-1-2-2-3-4-3" />
  </svg>
);

export const UpperBackIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 6h16l-3 7-5 7-5-7-3-7z" />
    <path d="M12 6v14" />
    <path d="M7 10h10" />
  </svg>
);

export const LowerBackIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="6" y="8" width="12" height="10" rx="3" />
    <path d="M12 4v4" />
    <path d="M12 18v2" />
    <path d="M9 13h6" />
  </svg>
);

export const BicepsIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 11c0-4-3-7-7-7-2 0-4 1-5 3L3 13c1 3 4 5 7 5h4c2 0 4-2 4-7z" />
    <path d="M11 4c2 2 3 5 3 7" />
  </svg>
);

export const TricepsIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 4h6a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    <path d="M16 10l4 4-2 2-4-4" />
  </svg>
);

export const AbsCoreIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="5" y="4" width="14" height="16" rx="3" />
    <line x1="12" y1="4" x2="12" y2="20" />
    <line x1="5" y1="9" x2="19" y2="9" />
    <line x1="5" y1="15" x2="19" y2="15" />
  </svg>
);

export const GlutesIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 5c-3 0-7 3-7 8 0 4 3 7 7 7s7-3 7-7c0-5-4-8-7-8z" />
    <path d="M12 5v15" />
  </svg>
);

export const QuadsIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 3h12l-2 11-4 7-4-7-2-11z" />
    <line x1="12" y1="3" x2="12" y2="14" />
  </svg>
);

export const HamstringsIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 4h8l-1 12-3 5-3-5-1-12z" />
    <line x1="12" y1="4" x2="12" y2="16" />
    <path d="M9 10c2 1 4 1 6 0" />
  </svg>
);

export const CalvesIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 4c0 4-2 7-2 10 0 4 3 6 6 6s6-2 6-6c0-3-2-6-2-10H8z" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

export const NeckIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="6" r="3" />
    <path d="M9 12h6l2 8H7l2-8z" />
    <path d="M9 12c1 2 2 3 3 3s2-1 3-3" />
  </svg>
);
