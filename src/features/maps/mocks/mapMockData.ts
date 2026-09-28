export type MarkerStatus = 'online' | 'offline' | 'alert';

export interface MapMarker {
  id: string;
  region: string;
  status: MarkerStatus;
  x: number;
  y: number;
}

export const mapMockData: MapMarker[] = [
  { id: 'KGR-000123', region: 'Hà Nội', status: 'online', x: 32, y: 24 },
  { id: 'KGR-000456', region: 'Hà Nội', status: 'alert', x: 38, y: 30 },
  { id: 'KGR-000789', region: 'Đà Nẵng', status: 'online', x: 55, y: 48 },
  { id: 'KGR-000234', region: 'Đà Nẵng', status: 'offline', x: 60, y: 52 },
  {
    id: 'KGR-000567',
    region: 'TP. Hồ Chí Minh',
    status: 'online',
    x: 45,
    y: 78,
  },
  {
    id: 'KGR-000890',
    region: 'TP. Hồ Chí Minh',
    status: 'alert',
    x: 50,
    y: 82,
  },
  { id: 'KGR-001123', region: 'Cần Thơ', status: 'online', x: 40, y: 88 },
];
