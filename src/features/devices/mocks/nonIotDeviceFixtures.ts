import type { DeviceWarrantyStatus } from '../schemas/deviceSchemas';
import type { NonIotDeviceDto } from '../schemas/nonIotDeviceSchemas';

// ⚠️ Assumption: model codes of the non-IoT lines are placeholders until
// the product catalogue lists them.
const models = ['KGR-N110', 'KGR-N120'] as const;
const locations = [
  { region: 'Hà Nội', ward: 'Phường Hoàng Mai' },
  { region: 'Hải Phòng', ward: 'Phường Hồng Bàng' },
  { region: 'Đà Nẵng', ward: 'Phường Thanh Khê' },
  { region: 'Hồ Chí Minh', ward: 'Phường Bến Nghé' },
] as const;
const warrantyCycle: readonly DeviceWarrantyStatus[] = [
  'expiring',
  'expired',
  'active',
  'active',
  'expiring',
];
const owners = ['CUS-2001', 'CUS-2002', 'CUS-2003', 'CUS-2004'] as const;

// Sold non-IoT units, registered by serial/QR warranty activation.
export const nonIotDeviceFixtures: readonly NonIotDeviceDto[] = Array.from(
  { length: 14 },
  (_, index) => {
    const model = models[index % models.length]!;
    const location = locations[index % locations.length]!;
    const warrantyStatus = warrantyCycle[index % warrantyCycle.length]!;
    const month = String((index % 11) + 1).padStart(2, '0');
    const expiresYear =
      warrantyStatus === 'expired'
        ? 2026
        : warrantyStatus === 'expiring'
          ? 2026
          : 2027;
    const expiresMonth =
      warrantyStatus === 'expired'
        ? '02'
        : warrantyStatus === 'expiring'
          ? '11'
          : month;
    return {
      device_id: `KGR-N${String(1 + index).padStart(4, '0')}`,
      model_name: model,
      region: location.region,
      ward: location.ward,
      owner_id: owners[index % owners.length]!,
      batch_code: `LOT-${model.replace('KGR-', '')}-${String(Math.floor(index / 2) + 1).padStart(3, '0')}`,
      manufactured_at: `2025-${month}-05T00:00:00.000Z`,
      activated_at: `2025-${month}-10T08:00:00.000Z`,
      warranty_status: warrantyStatus,
      warranty_expires_at: `${expiresYear}-${expiresMonth}-10T00:00:00.000Z`,
      filter_life_percent: (index * 17 + 9) % 101,
    };
  }
);
