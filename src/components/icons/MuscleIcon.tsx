import React from 'react';
import {
  ChestIcon,
  ShouldersIcon,
  UpperBackIcon,
  LowerBackIcon,
  BicepsIcon,
  TricepsIcon,
  AbsCoreIcon,
  GlutesIcon,
  QuadsIcon,
  HamstringsIcon,
  CalvesIcon,
  NeckIcon,
} from './muscleIcons';

interface MuscleIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const MuscleIcon: React.FC<MuscleIconProps> = ({
  name,
  className = 'w-3.5 h-3.5',
  size = 14,
}) => {
  const norm = name.toLowerCase().trim();

  if (norm.includes('bryst') || norm.includes('pectoral')) {
    return <ChestIcon className={className} size={size} />;
  }
  if (norm.includes('skulder') || norm.includes('deltoid')) {
    return <ShouldersIcon className={className} size={size} />;
  }
  if (norm.includes('øvre rygg') || norm.includes('trapezius') || norm.includes('rygg')) {
    return <UpperBackIcon className={className} size={size} />;
  }
  if (norm.includes('korsrygg') || norm.includes('erector')) {
    return <LowerBackIcon className={className} size={size} />;
  }
  if (norm.includes('biceps') || norm.includes('arm')) {
    return <BicepsIcon className={className} size={size} />;
  }
  if (norm.includes('triceps')) {
    return <TricepsIcon className={className} size={size} />;
  }
  if (norm.includes('mage') || norm.includes('kjerne') || norm.includes('abs') || norm.includes('core')) {
    return <AbsCoreIcon className={className} size={size} />;
  }
  if (norm.includes('sete') || norm.includes('glute') || norm.includes('rumpe')) {
    return <GlutesIcon className={className} size={size} />;
  }
  if (norm.includes('quad') || norm.includes('forside lår') || norm.includes('lår') || norm.includes('ben')) {
    return <QuadsIcon className={className} size={size} />;
  }
  if (norm.includes('hamstring') || norm.includes('bakside lår')) {
    return <HamstringsIcon className={className} size={size} />;
  }
  if (norm.includes('legg') || norm.includes('calf') || norm.includes('ankel')) {
    return <CalvesIcon className={className} size={size} />;
  }
  if (norm.includes('nakke')) {
    return <NeckIcon className={className} size={size} />;
  }

  return <AbsCoreIcon className={className} size={size} />;
};
