import type {
  InventoryDeviceDto,
  InventoryQcStatus,
} from '@/features/devices/schemas/inventorySchemas';

// One in three units is a non-IoT line.
const models = [
  'KGR-A100',
  'KGR-B200',
  'KGR-N110',
  'KGR-C300',
  'KGR-A100',
  'KGR-N120',
] as const;
const nonIotModels: readonly string[] = ['KGR-N110', 'KGR-N120'];
const dayMs = 86_400_000;

// Never-activated units: no owner, telemetry or warranty yet. Received dates
// are relative to "now" so the stock-age column stays meaningful.
export const inventoryDeviceFixtures: readonly InventoryDeviceDto[] =
  Array.from({ length: 48 }, (_, index) => {
    const model = models[index % models.length]!;
    const ageDays = 2 + ((index * 37) % 380);
    const receivedAt = new Date(Date.now() - ageDays * dayMs);
    const manufacturedAt = new Date(receivedAt.getTime() - 7 * dayMs);
    const qcStatus: InventoryQcStatus =
      index % 8 === 7 ? (index % 16 === 7 ? 'failed' : 'pending') : 'passed';
    const number = 1001 + index;
    const iot = !nonIotModels.includes(model);

    return {
      device_id: `KGR-${number}`,
      model_name: model,
      connectivity: iot ? 'iot' : 'non_iot',
      batch_code: `LOT-${model.replace('KGR-', '')}-${String(Math.floor(index / 6) + 20).padStart(3, '0')}`,
      manufactured_at: manufacturedAt.toISOString(),
      received_at: receivedAt.toISOString(),
      qc_status: qcStatus,
      module_firmware_version: iot ? `2.${index % 2}.${index % 5}` : null,
      mainboard_firmware_version: iot ? `1.${index % 3}.0` : null,
      // Units older than ~6 months shipped with firmware before the current track.
      firmware_outdated: iot && ageDays > 150,
    };
  });
