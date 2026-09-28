import type {
  AlertHistoryEntryDto,
  ConnectivityEventDto,
  FilterChangeEntryDto,
  OtaHistoryEntryDto,
  ServiceHistoryEntryDto,
} from '@/features/devices/schemas/deviceDetailSchemas';

// Deterministic per-device pseudo-randomness so refetching the same device
// always returns the same mock history (no backend to persist it against).
function seedFrom(deviceId: string): number {
  let hash = 0;
  for (let i = 0; i < deviceId.length; i += 1) {
    hash = (hash * 31 + deviceId.charCodeAt(i)) % 1000;
  }
  return hash;
}

const errorCodesBySeverity: Record<string, string[]> = {
  P1: ['ER00051', 'ER00052'],
  P2: ['ER00053', 'ER00054'],
  P3: ['ER00066', 'ER00067'],
  P4: ['ER00068', 'ER00069'],
};

export function buildAlertHistory(deviceId: string): AlertHistoryEntryDto[] {
  const seed = seedFrom(deviceId);
  const count = 1 + (seed % 3);
  return Array.from({ length: count }, (_, i) => {
    const severity = (['P2', 'P3', 'P1', 'P4'] as const)[(seed + i) % 4]!;
    const code = errorCodesBySeverity[severity]![i % 2]!;
    const closed = i > 0;
    return {
      id: `${deviceId}-alert-${i}`,
      code,
      title: `Lỗi ${code}`,
      severity,
      status: closed ? 'closed' : 'open',
      occurred_at: `2026-09-${String(1 + ((seed + i) % 9)).padStart(2, '0')}T09:00:00.000Z`,
      ...(closed && {
        closed_at: `2026-09-${String(2 + ((seed + i) % 9)).padStart(2, '0')}T09:00:00.000Z`,
      }),
    };
  });
}

export function buildFilterChangeHistory(
  deviceId: string,
  corePositions: readonly { position: string; core_name: string }[]
): FilterChangeEntryDto[] {
  const seed = seedFrom(deviceId);
  if (corePositions.length === 0) return [];
  const changed = corePositions.slice(0, 1 + (seed % 2));
  return changed.map((core, i) => ({
    id: `${deviceId}-filter-${core.position}`,
    position: core.position,
    core_name: core.core_name,
    ...(i === 0 && { old_serial: `CORE-OLD-${seed}` }),
    new_serial: `CORE-${deviceId}-${core.position}-${seed}`,
    changed_at: `2026-0${1 + (i % 8)}-10T10:00:00.000Z`,
    channel: seed % 2 === 0 ? 'technician' : 'app',
  }));
}

export function buildOtaHistory(deviceId: string): OtaHistoryEntryDto[] {
  const seed = seedFrom(deviceId);
  if (seed % 4 === 0) return [];
  return [
    {
      id: `${deviceId}-ota-1`,
      track: seed % 2 === 0 ? 'mainboard' : 'module',
      from_version: '1.0.0',
      to_version: '1.1.0',
      result: seed % 7 === 0 ? 'rolled_back' : 'success',
      started_at: '2026-08-20T02:00:00.000Z',
      completed_at: '2026-08-20T02:04:00.000Z',
    },
  ];
}

export function buildServiceHistory(
  deviceId: string
): ServiceHistoryEntryDto[] {
  const seed = seedFrom(deviceId);
  if (seed % 3 === 0) return [];
  return [
    {
      id: `${deviceId}-service-1`,
      ticket_id: `WT-${seed}`,
      type: 'warranty',
      summary: 'Thay lõi lọc theo bảo hành.',
      technician: 'Nguyễn Văn Kỹ Thuật',
      status: 'done',
      scheduled_at: '2026-07-15T08:00:00.000Z',
      completed_at: '2026-07-15T09:30:00.000Z',
    },
  ];
}

// Newest first, alternating offline/online, spaced 2–11 hours apart.
export function buildConnectivityHistory(
  deviceId: string
): ConnectivityEventDto[] {
  const seed = seedFrom(deviceId);
  const now = Date.now();
  let offsetMs = 0;
  return Array.from({ length: 20 }, (_, i) => {
    offsetMs += (2 + ((seed + i) % 10)) * 3_600_000;
    return {
      id: `${deviceId}-conn-${i}`,
      event: i % 2 === 0 ? 'offline' : 'online',
      occurred_at: new Date(now - offsetMs).toISOString(),
      duration_seconds: 60 * (5 + ((seed * (i + 1)) % 180)),
    };
  });
}
