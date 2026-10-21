import type { PageResponse } from '@/shared/types/pagination';

import type {
  InventoryCounts,
  InventoryCountsDto,
  InventoryDevice,
  InventoryDeviceDto,
  InventoryDevicePageDto,
} from '../schemas/inventorySchemas';

export function mapInventoryDevice(dto: InventoryDeviceDto): InventoryDevice {
  return {
    id: dto.device_id,
    modelName: dto.model_name,
    connectivity: dto.connectivity,
    batchCode: dto.batch_code,
    manufacturedAt: dto.manufactured_at,
    receivedAt: dto.received_at,
    qcStatus: dto.qc_status,
    moduleFirmwareVersion: dto.module_firmware_version,
    mainboardFirmwareVersion: dto.mainboard_firmware_version,
    firmwareOutdated: dto.firmware_outdated,
  };
}

export function mapInventoryDevicePage(
  dto: InventoryDevicePageDto
): PageResponse<InventoryDevice> {
  return {
    items: dto.items.map(mapInventoryDevice),
    page: dto.page,
    pageSize: dto.page_size,
    total: dto.total,
  };
}

export function mapInventoryCounts(dto: InventoryCountsDto): InventoryCounts {
  return {
    total: dto.total,
    iot: dto.iot,
    nonIot: dto.non_iot,
    aging: dto.aging,
    aged: dto.aged,
  };
}
