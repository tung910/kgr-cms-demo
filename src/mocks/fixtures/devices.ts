import { customerMockData } from '@/features/customers/mocks/customerMockData';
import type {
  DeviceDto,
  DeviceStatus,
  DeviceWarrantyStatus,
} from '@/features/devices/schemas/deviceSchemas';

const models = ['KGR-A100', 'KGR-B200', 'KGR-C300'] as const;
const statuses: readonly DeviceStatus[] = ['online', 'offline', 'warning'];
const regions = ['Hà Nội', 'Hải Phòng', 'Đà Nẵng', 'Hồ Chí Minh'] as const;
const wardsByRegion: Record<(typeof regions)[number], readonly string[]> = {
  'Hà Nội': ['Phường Hoàng Mai', 'Phường Cầu Giấy', 'Phường Ba Đình'],
  'Hải Phòng': ['Phường Lê Chân', 'Phường Hồng Bàng', 'Phường Ngô Quyền'],
  'Đà Nẵng': ['Phường Hải Châu', 'Phường Sơn Trà', 'Phường Thanh Khê'],
  'Hồ Chí Minh': ['Phường Bến Thành', 'Phường Sài Gòn', 'Phường Tân Định'],
};
const warrantyStatuses: readonly DeviceWarrantyStatus[] = [
  'active',
  'expiring',
  'expired',
];

const iotDeviceFixtures: readonly DeviceDto[] = Array.from(
  { length: 36 },
  (_, index) => {
    const model = models[index % models.length]!;
    const status =
      statuses[Math.floor(index / models.length) % statuses.length]!;
    const region =
      regions[
        Math.floor(index / (models.length * statuses.length)) % regions.length
      ]!;
    const warrantyStatus = warrantyStatuses[index % warrantyStatuses.length]!;
    const number = index + 1;
    const customer = customerMockData[index % customerMockData.length]!;
    const ownerId = customer.id;
    const activatedAt = `2025-${String((index % 11) + 1).padStart(2, '0')}-01T08:00:00.000Z`;

    return {
      device_id: `KGR-${String(number).padStart(4, '0')}`,
      model_name: model,
      display_name: `Kangaroo ${number}`,
      region,
      connectivity: 'iot',
      ward: wardsByRegion[region][index % 3],
      status: index === 35 ? 'offline' : status,
      last_online_at:
        index === 35
          ? null
          : new Date(Date.now() - index * 17 * 60_000).toISOString(),
      manufactured_at: `2025-${String((index % 12) + 1).padStart(2, '0')}-15T00:00:00.000Z`,
      batch_code: `LOT-${model.replace('KGR-', '')}-${String(Math.floor(index / models.length) + 1).padStart(3, '0')}`,
      wifi_signal_dbm: index === 35 ? null : -40 - (index % 45),
      ...(index !== 35 && { latency_ms: 30 + ((index * 13) % 90) }),
      filter_life_percent: (index * 13) % 101,
      powered: true,
      module_firmware_version: `2.${index % 4}.${number}`,
      mainboard_firmware_version: `1.${index % 3}.${number}`,
      owner: {
        id: ownerId,
        name: customer.name,
        phone_masked: customer.phone,
        address: customer.address,
      },
      latest_telemetry:
        index === 35
          ? []
          : [
              {
                metric_key: 'tds_out',
                value: 30 + ((index * 7) % 40),
                unit: 'ppm',
                measured_at: `2026-09-${String((index % 9) + 1).padStart(2, '0')}T12:00:00.000Z`,
              },
              {
                metric_key: 'tds_in',
                value: 120 + ((index * 11) % 120),
                unit: 'ppm',
                measured_at: `2026-09-${String((index % 9) + 1).padStart(2, '0')}T12:00:00.000Z`,
              },
              {
                metric_key: 'temperature',
                value: 20 + (index % 12),
                unit: '°C',
                measured_at: `2026-09-${String((index % 9) + 1).padStart(2, '0')}T12:00:00.000Z`,
              },
              {
                metric_key: 'battery',
                value: 65 + (index % 30),
                unit: '%',
                measured_at: `2026-09-${String((index % 9) + 1).padStart(2, '0')}T12:05:00.000Z`,
              },
            ],
      activated_at: index === 35 ? undefined : activatedAt,
      install_address: `Số ${number} đường Kim Giang, ${region}`,
      internal_note: index % 5 === 0 ? 'Khách VIP, ưu tiên hỗ trợ.' : '',
      tags: index % 7 === 0 ? ['vip'] : index % 4 === 0 ? ['cho-thue'] : [],
      lifecycle_state: 'active',
      warranty_status: index === 35 ? 'none' : warrantyStatus,
      // active: >60 days left, expiring: <30 days, expired: already past.
      warranty_expires_at:
        index === 35
          ? undefined
          : warrantyStatus === 'active'
            ? `2028-${String((index % 12) + 1).padStart(2, '0')}-18T00:00:00.000Z`
            : warrantyStatus === 'expiring'
              ? `2026-10-${String((index % 20) + 1).padStart(2, '0')}T00:00:00.000Z`
              : `2026-0${(index % 8) + 1}-10T00:00:00.000Z`,
      open_ticket_count: index % 6 === 0 ? 1 : 0,
      open_appointment_count: index === 2 ? 1 : 0,
      open_alert_count: index === 3 ? 1 : 0,
      automation_count: index % 3 === 0 ? 2 : 0,
      app_sync_status: 'none',
      has_active_ota: index % 9 === 0,
      has_active_rental_contract: index % 4 === 0,
      shared_members:
        index % 3 === 0
          ? [
              {
                id: `member-${number}`,
                name: `Thành viên chia sẻ ${number}`,
                phone: `09${String(number).padStart(2, '0')}xxxx${String(
                  number * 7
                )
                  .padStart(3, '0')
                  .slice(-3)}`,
                address: `Số ${number} đường Kim Giang, ${region}`,
                permission: number % 2 === 0 ? 'control' : 'view',
                shared_at: activatedAt,
              },
            ]
          : [],
      owner_history: [
        {
          owner_id: ownerId,
          owner_name: customer.name,
          started_at: activatedAt,
        },
      ],
      operation_log: [],
    };
  }
);

const nonIotModels = ['KGR-N110', 'KGR-N120'] as const;

// Sold non-IoT units: registered through serial/warranty activation (QR scan
// or service ticket), so they have an owner and warranty but never report a
// connection, telemetry or firmware.
const nonIotDeviceFixtures: readonly DeviceDto[] = Array.from(
  { length: 14 },
  (_, index) => {
    const model = nonIotModels[index % nonIotModels.length]!;
    const region = regions[index % regions.length]!;
    const warrantyStatus =
      warrantyStatuses[(index + 1) % warrantyStatuses.length]!;
    const number = 37 + index;
    const customer = customerMockData[(index + 3) % customerMockData.length]!;
    const activatedAt = `2025-${String((index % 11) + 1).padStart(2, '0')}-10T08:00:00.000Z`;

    return {
      device_id: `KGR-${String(number).padStart(4, '0')}`,
      model_name: model,
      display_name: `Kangaroo ${number}`,
      region,
      ward: wardsByRegion[region][index % 3],
      connectivity: 'non_iot',
      status: null,
      last_online_at: null,
      manufactured_at: `2025-${String((index % 12) + 1).padStart(2, '0')}-05T00:00:00.000Z`,
      batch_code: `LOT-${model.replace('KGR-', '')}-${String(Math.floor(index / 2) + 1).padStart(3, '0')}`,
      wifi_signal_dbm: null,
      filter_life_percent: (index * 17 + 9) % 101,
      powered: true,
      module_firmware_version: null,
      mainboard_firmware_version: null,
      owner: {
        id: customer.id,
        name: customer.name,
        phone_masked: customer.phone,
        address: customer.address,
      },
      latest_telemetry: [],
      activated_at: activatedAt,
      install_address: `Số ${number} đường Nguyễn Trãi, ${region}`,
      internal_note: '',
      tags: [],
      lifecycle_state: 'active',
      warranty_status: warrantyStatus,
      warranty_expires_at:
        warrantyStatus === 'active'
          ? `2027-${String((index % 12) + 1).padStart(2, '0')}-10T00:00:00.000Z`
          : warrantyStatus === 'expiring'
            ? `2026-11-${String((index % 20) + 1).padStart(2, '0')}T00:00:00.000Z`
            : `2026-0${(index % 8) + 1}-10T00:00:00.000Z`,
      open_ticket_count: index % 5 === 0 ? 1 : 0,
      open_appointment_count: index === 4 ? 1 : 0,
      open_alert_count: 0,
      automation_count: 0,
      app_sync_status: 'none',
      has_active_ota: false,
      has_active_rental_contract: false,
      shared_members: [],
      owner_history: [
        {
          owner_id: customer.id,
          owner_name: customer.name,
          started_at: activatedAt,
        },
      ],
      operation_log: [],
    };
  }
);

export const deviceFixtures: readonly DeviceDto[] = [
  ...iotDeviceFixtures,
  ...nonIotDeviceFixtures,
];
