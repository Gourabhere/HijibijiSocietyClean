import React from 'react';
import { TaskType } from './types';
import {
  Trash2,
  Wind,
  Droplets,
  CarFront,
  Sparkles,
  GalleryVerticalEnd
} from 'lucide-react';

export const getTaskIcon = (type: TaskType): React.ReactElement => {
  const iconStyle = { width: 20, height: 20 };
  switch (type) {
    case TaskType.ROUTINE_HOUSEKEEPING: return <Trash2 style={{ ...iconStyle, color: '#ef4444' }} />;
    case TaskType.BROOMING: return <Wind style={{ ...iconStyle, color: '#f97316' }} />;
    case TaskType.MOPPING: return <Droplets style={{ ...iconStyle, color: '#3b82f6' }} />;
    case TaskType.DRIVEWAY: return <CarFront style={{ ...iconStyle, color: '#64748b' }} />;
    case TaskType.GLASS_CLEANING: return <Sparkles style={{ ...iconStyle, color: '#06b6d4' }} />;
    case TaskType.STAIRCASE: return <GalleryVerticalEnd style={{ ...iconStyle, color: '#8b5cf6' }} />;
    default: return <Sparkles style={{ ...iconStyle, color: '#94a3b8' }} />;
  }
};
