import type { AudienceCustomerDto } from '@/features/campaigns/schemas/audienceSchemas';

// Mock customer dataset for campaign audience segmentation (spec 7.2). Built
// deterministically (no randomness) so the "số KH thỏa điều kiện" preview
// returns stable counts across reloads. Field values are spread across the
// catalogues the device/warranty data uses so segmentation stays consistent.

const regions = ['Hà Nội', 'Hải Phòng', 'Đà Nẵng', 'Hồ Chí Minh'] as const;
const models = [
  'KGR-A100',
  'KGR-B200',
  'KGR-C300',
  'KGR-N110',
  'KGR-N120',
] as const;
const firmwareVersions = ['2.1.4', '2.0.9', '1.9.5'] as const;
const warrantyStatuses = ['active', 'expiring', 'expired', 'none'] as const;

const AUDIENCE_SIZE = 120;

export const campaignAudienceFixtures: AudienceCustomerDto[] = Array.from(
  { length: AUDIENCE_SIZE },
  (_, index): AudienceCustomerDto => {
    const padded = String(index + 1).padStart(4, '0');
    return {
      customer_id: `CUS-${padded}`,
      name: `Khách hàng ${padded}`,
      devices: Array.from({ length: 1 + (index % 3) }, (_, deviceIndex) => {
        const seed = index + deviceIndex * 17;
        return {
          device_id: `DEV-${padded}-${deviceIndex + 1}`,
          region: regions[seed % regions.length]!,
          model_name: models[seed % models.length]!,
          firmware_version: firmwareVersions[seed % firmwareVersions.length]!,
          core_remaining_days: (seed * 7) % 180,
          warranty_status: warrantyStatuses[seed % warrantyStatuses.length]!,
          warranty_remaining_days: ((seed * 13) % 400) - 30,
          region_tds: 20 + ((seed * 3) % 60),
        };
      }),
      loyalty_points: (index * 37) % 1000,
      // 30..929 days of tenure.
      first_activated_at: new Date(
        Date.now() - (30 + ((index * 11) % 900)) * 86_400_000
      ).toISOString(),
      tenure_days: 30 + ((index * 11) % 900),
      // Marketing consent: every 9th customer has opted out and is hard-
      // excluded from all send sets (spec 7.7.a).
      opt_in: index % 9 !== 0,
    };
  }
);
