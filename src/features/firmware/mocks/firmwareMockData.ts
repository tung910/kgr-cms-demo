export type FirmwareAction = 'pause' | 'resume' | 'cancel';
export type CampaignStatus = 'running' | 'paused' | 'completed' | 'cancelled';
export type FirmwareTrack = 'module' | 'mainboard';

export interface FirmwareCampaign {
  id: string;
  name: string;
  track: FirmwareTrack;
  targetVersion: string;
  status: CampaignStatus;
  progressPercent: number;
  errorRatePercent: number;
  errorThresholdPercent: number;
  deviceCount: number;
  startedAt: string;
}

export const firmwareMockData: FirmwareCampaign[] = [
  {
    id: 'OTA-2001',
    name: 'Cập nhật module lọc nước KGR-A100',
    track: 'module',
    targetVersion: 'v2.4.1',
    status: 'running',
    progressPercent: 62,
    errorRatePercent: 0.8,
    errorThresholdPercent: 5,
    deviceCount: 12800,
    startedAt: '2026-09-10T01:00:00Z',
  },
  {
    id: 'OTA-2002',
    name: 'Vá lỗi mainboard KGR-B200',
    track: 'mainboard',
    targetVersion: 'v5.1.0',
    status: 'paused',
    progressPercent: 34,
    errorRatePercent: 4.6,
    errorThresholdPercent: 5,
    deviceCount: 6400,
    startedAt: '2026-09-08T09:30:00Z',
  },
  {
    id: 'OTA-2003',
    name: 'Cập nhật bảo mật mainboard KGR-C300',
    track: 'mainboard',
    targetVersion: 'v3.9.2',
    status: 'completed',
    progressPercent: 100,
    errorRatePercent: 0.2,
    errorThresholdPercent: 5,
    deviceCount: 4200,
    startedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'OTA-2004',
    name: 'Thử nghiệm firmware module thế hệ mới',
    track: 'module',
    targetVersion: 'v3.0.0-beta',
    status: 'cancelled',
    progressPercent: 8,
    errorRatePercent: 9.4,
    errorThresholdPercent: 5,
    deviceCount: 500,
    startedAt: '2026-09-05T15:00:00Z',
  },
];
