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
    modelCode: dto.model_code,
    batchId: dto.batch_id,
    status: dto.status,
    ingestedAt: dto.ingested_at,
    usedAt: dto.used_at,
    usedByDeviceId: dto.used_by_device_id,
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
    modelCode: dto.model_code,
    total: dto.total,
    used: dto.used,
    ingestedAt: dto.ingested_at,
    recalledAt: dto.recalled_at,
    recallReason: dto.recall_reason,
  };
}
