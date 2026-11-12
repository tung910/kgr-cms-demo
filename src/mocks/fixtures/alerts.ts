import type {
  AlertHandlerGroup,
  AlertSeverity,
  ServiceType,
  TechnicianSpecialty,
} from '@/features/alerts/constants/alertEnums';

// Illustrative only. The production error-code catalogue is still awaiting KGR confirmation.
export const alertErrorCatalog = [
  ...[1, 2, 3, 4, 5].map((position) => ({
    errorCode: `ER0006${position}`,
    name: `Lõi ${position} vượt ngưỡng thay mức 2`,
    handlerGroup: 'cskh' as const,
    severity: 'medium' as const,
    suggestedServiceType: 'core_replacement' as const,
  })),
  {
    errorCode: 'ER00051',
    name: 'Áp suất đầu vào vượt ngưỡng an toàn',
    handlerGroup: 'cskh',
    severity: 'critical',
    suggestedServiceType: 'repair',
  },
  {
    errorCode: 'ER00074',
    name: 'Cảm biến TDS báo lỗi hiệu chuẩn',
    handlerGroup: 'cskh',
    severity: 'medium',
    suggestedServiceType: 'repair',
  },
  {
    errorCode: 'ER00070',
    name: 'Nhiệt độ nước ra ngoài dải khuyến nghị',
    handlerGroup: 'cskh',
    severity: 'low',
    suggestedServiceType: 'repair',
  },
  {
    errorCode: 'ER00052',
    name: 'Mất kết nối hàng loạt theo khu vực',
    handlerGroup: 'technical',
    severity: 'critical',
    suggestedServiceType: 'repair',
  },
  {
    errorCode: 'ER00053',
    name: 'Tỷ lệ lỗi tăng sau cập nhật firmware',
    handlerGroup: 'technical',
    severity: 'medium',
    suggestedServiceType: 'repair',
  },
] satisfies Array<{
  errorCode: string;
  name: string;
  handlerGroup: AlertHandlerGroup;
  severity: AlertSeverity;
  suggestedServiceType: ServiceType;
}>;

export interface AlertSeed {
  id: string;
  deviceIndex: number;
  catalogIndex: number;
  ageMs: number;
  status?:
    'new' | 'acknowledged' | 'unreachable' | 'ticketed' | 'declined' | 'closed';
  contactAttempts?: number;
  handlerOther?: boolean;
  recoversAfterMs?: number;
  seededTicket?: boolean;
}

export const alertSeeds: AlertSeed[] = Array.from(
  { length: 28 },
  (_, index) => ({
    id: `ALT-${String(index + 1).padStart(4, '0')}`,
    deviceIndex: index === 1 ? 0 : index,
    catalogIndex: index % alertErrorCatalog.length,
    ageMs: index === 2 ? 3 * 86_400_000 : (index + 1) * 18 * 60_000,
    ...(index === 3 && { status: 'acknowledged' as const, handlerOther: true }),
    ...(index === 4 && { status: 'unreachable' as const, contactAttempts: 2 }),
    ...(index === 5 && { status: 'ticketed' as const, seededTicket: true }),
    ...(index === 6 && { status: 'declined' as const }),
    ...(index === 7 && { status: 'closed' as const }),
    ...(index === 8 && { recoversAfterMs: 60_000 }),
  })
);

export const stationFixtures = [
  { id: 'station-hn', name: 'Trạm Hà Nội', region: 'Hà Nội' },
  { id: 'station-hp', name: 'Trạm Hải Phòng', region: 'Hải Phòng' },
  { id: 'station-dn', name: 'Trạm Đà Nẵng', region: 'Đà Nẵng' },
  { id: 'station-hcm', name: 'Trạm Hồ Chí Minh', region: 'TP. Hồ Chí Minh' },
] as const;

export type TechnicianMockBehavior =
  'accept' | 'decline' | 'ignore' | 'accept_then_cancel';
export interface TechnicianFixture {
  id: string;
  name: string;
  stationId: string;
  specialty: TechnicianSpecialty;
  rating: number;
  ticketsToday: number;
  busySlots: string[];
  mockBehavior: TechnicianMockBehavior;
}

// Per station: first accepts repair work, second declines, third ignores, fourth accepts then cancels.
export const technicianFixtures: TechnicianFixture[] = stationFixtures.flatMap(
  (station, stationIndex) =>
    (['accept', 'decline', 'ignore', 'accept_then_cancel'] as const).map(
      (mockBehavior, index) => ({
        id: `tech-${stationIndex + 1}-${index + 1}`,
        name: `KTV ${stationIndex + 1}.${index + 1} · ${mockBehavior}`,
        stationId: station.id,
        specialty: index === 0 ? 'repair' : 'general',
        rating: 4.9 - index * 0.2,
        ticketsToday: index + 1,
        busySlots: index === 1 ? ['08:00-10:00'] : [],
        mockBehavior,
      })
    )
);
