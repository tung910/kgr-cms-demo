import { Tag } from 'antd';
import type { PresetStatusColorType } from 'antd/es/_util/colors';

const statusColors: Record<string, PresetStatusColorType> = {
  active: 'success',
  online: 'success',
  completed: 'success',
  inactive: 'default',
  offline: 'default',
  pending: 'warning',
  warning: 'warning',
  error: 'error',
  failed: 'error',
};

export interface StatusTagProps {
  status: string;
  label?: string;
}

export function StatusTag({ status, label }: StatusTagProps) {
  const normalized = status.toLowerCase();

  return <Tag color={statusColors[normalized]}>{label ?? status}</Tag>;
}
