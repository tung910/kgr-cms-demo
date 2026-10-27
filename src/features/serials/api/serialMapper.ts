import type { PageResponse } from '@/shared/types/pagination';

import type {
  Serial,
  SerialBatch,
  SerialBatchDto,
  SerialDto,
} from '../schemas/serialSchemas';

export function mapSerial(dto: SerialDto): Serial {
  return {
    serial: dto.serial,
    maskedKey: dto.masked_key,
    coreType: dto.core_type,
    batchId: dto.batch_id,
    status: dto.status,
    ingestedAt: dto.ingested_at,
    usedAt: dto.used_at,
    usedByDeviceId: dto.used_by_device_id,
    lockedLifespan: dto.locked_lifespan,
  };
}

export function mapSerialPage(dto: {
  items: SerialDto[];
  page: number;
  page_size: number;
  total: number;
}): PageResponse<Serial> {
  return {
    items: dto.items.map(mapSerial),
    page: dto.page,
    pageSize: dto.page_size,
    total: dto.total,
  };
}

export function mapSerialBatch(dto: SerialBatchDto): SerialBatch {
  return {
    id: dto.batch_id,
    coreType: dto.core_type,
    region: dto.region,
    lifespanStatus: dto.lifespan_status,
    lifespanMonths: dto.lifespan_months,
    lifespanHours: dto.lifespan_hours,
    total: dto.total,
    used: dto.used,
    ingestedAt: dto.ingested_at,
    recalledAt: dto.recalled_at,
    recallReason: dto.recall_reason,
  };
}
