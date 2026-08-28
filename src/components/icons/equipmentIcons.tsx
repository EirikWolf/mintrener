import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const KettlebellIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 7V4a3 3 0 0 1 6 0v3" />
    <circle cx="12" cy="14" r="7" />
  </svg>
);

export const DumbbellIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6.5 6.5 11 11" />
    <path d="m21 21-1-1a2 2 0 0 0-2.8 0l-1.4 1.4a2 2 0 0 1-2.8 0l-7.8-7.8a2 2 0 0 1 0-2.8L6.6 9.4a2 2 0 0 0 0-2.8L5.6 5.6" />
    <path d="m3 3 1 1a2 2 0 0 0 2.8 0l1.4-1.4a2 2 0 0 1 2.8 0l7.8 7.8a2 2 0 0 1 0 2.8l-1.4 1.4a2 2 0 0 0 0 2.8l1 1" />
  </svg>
);

export const MatIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="7" width="18" height="11" rx="2" />
    <line x1="7" y1="7" x2="7" y2="18" />
    <line x1="17" y1="7" x2="17" y2="18" />
  </svg>
);

export const ChairIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 3v11h12V3" />
    <path d="M6 14v7" />
    <path d="M18 14v7" />
    <path d="M4 14h16" />
  </svg>
);

export const BandIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <ellipse cx="12" cy="12" rx="8" ry="5" />
    <ellipse cx="12" cy="12" rx="4" ry="2.5" />
  </svg>
);

export const BodyweightIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v8" />
    <path d="M8 10l4-2 4 2" />
    <path d="M9 20l3-5 3 5" />
  </svg>
);

export const BarbellIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="2" y1="12" x2="22" y2="12" />
    <rect x="5" y="7" width="2" height="10" rx="1" />
    <rect x="17" y="7" width="2" height="10" rx="1" />
    <rect x="3" y="9" width="2" height="6" rx="1" />
    <rect x="19" y="9" width="2" height="6" rx="1" />
  </svg>
);

export const TowelIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M4 17h16" />
    <path d="M4 19h16" />
  </svg>
);
