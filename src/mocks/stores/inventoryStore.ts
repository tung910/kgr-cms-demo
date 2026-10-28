import { inventoryDeviceFixtures } from '@/mocks/fixtures/inventoryDevices';
import type { InventoryDeviceDto } from '@/features/devices/schemas/inventorySchemas';

// Shared in-memory mock backend for never-activated stock ("Tồn kho").
// Shared by stock reads and confirmed batch imports. Resets on reload.
// Kept as a `const` array mutated via push, never reassigned, so every
// importer holds the same live reference.
export const inventoryStore: InventoryDeviceDto[] = [
  ...inventoryDeviceFixtures,
];

const dayMs = 86_400_000;
let nextSyncedNumber = 2001;

// Reserves candidate serials without writing stock; confirmation commits the batch.
export function previewNewUnits(): InventoryDeviceDto[] {
  const models = ['KGR-A100', 'KGR-B200', 'KGR-C300'] as const;
  const count = 1 + (nextSyncedNumber % 3);
  const received: InventoryDeviceDto[] = Array.from(
    { length: count },
    (_, index) => {
      const number = nextSyncedNumber + index;
      const model = models[number % models.length]!;
      const receivedAt = new Date(Date.now() - index * 7 * 60_000);
      return {
        device_id: `KGR-${number}`,
        model_name: model,
        connectivity: 'iot',
        batch_code: `LOT-${model.replace('KGR-', '')}-SYNC`,
        manufactured_at: new Date(
          receivedAt.getTime() - 3 * dayMs
        ).toISOString(),
        received_at: receivedAt.toISOString(),
        qc_status: 'passed',
        module_firmware_version: '2.1.4',
        mainboard_firmware_version: '1.2.0',
        firmware_outdated: false,
      };
    }
  );
  nextSyncedNumber += received.length;
  return received;
}
