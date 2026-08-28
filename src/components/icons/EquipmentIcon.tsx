import React from 'react';
import {
  KettlebellIcon,
  DumbbellIcon,
  MatIcon,
  ChairIcon,
  BandIcon,
  BodyweightIcon,
  BarbellIcon,
  TowelIcon,
} from './equipmentIcons';

interface EquipmentIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const EquipmentIcon: React.FC<EquipmentIconProps> = ({
  name,
  className = 'w-3.5 h-3.5',
  size = 14,
}) => {
  const norm = name.toLowerCase().trim();

  if (norm.includes('kettlebell')) {
    return <KettlebellIcon className={className} size={size} />;
  }
  if (norm.includes('hantel') || norm.includes('manual') || norm.includes('frivekt') || norm.includes('dumbbell')) {
    return <DumbbellIcon className={className} size={size} />;
  }
  if (norm.includes('matte') || norm.includes('underlag') || norm.includes('gulv')) {
    return <MatIcon className={className} size={size} />;
  }
  if (norm.includes('stol') || norm.includes('pult') || norm.includes('benk') || norm.includes('vegg')) {
    return <ChairIcon className={className} size={size} />;
  }
  if (norm.includes('strikk') || norm.includes('band') || norm.includes('miniband')) {
    return <BandIcon className={className} size={size} />;
  }
  if (norm.includes('vektstang') || norm.includes('barbell')) {
    return <BarbellIcon className={className} size={size} />;
  }
  if (norm.includes('håndkle') || norm.includes('towel')) {
    return <TowelIcon className={className} size={size} />;
  }

  // Egenvekt / ingen
  return <BodyweightIcon className={className} size={size} />;
};
