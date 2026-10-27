// Marker labels use thousands (spec §5.2): 14200 -> "14.2K", 850 -> "850".
export function formatDeviceCountShort(count: number): string {
  if (count < 1000) return String(count);
  const thousands = count / 1000;
  return `${thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1)}K`;
}

export const MAP_STATUS_COLORS = {
  stable: '#1F8A3B',
  warning: '#E8710A',
} as const;
