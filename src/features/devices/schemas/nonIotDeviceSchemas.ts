import { z } from 'zod';

import {
  deviceWarrantyStatusSchema,
  type DeviceWarrantyStatus,
} from './deviceSchemas';

// Sold units of non-IoT product lines. They have no IoT module, so there is
// no connection state, telemetry or firmware: they are registered through
// serial/warranty activation and followed up by warranty and core changes.
// Only the owner's customer ID is carried (no PII), like the in-use table.

export const nonIotDeviceDtoSchema = z.object({
  device_id: z.string().min(1),
  model_name: z.string().min(1),
  region: z.string().min(1),
  ward: z.string().min(1).optional(),
  owner_id: z.string().min(1).optional(),
  batch_code: z.string().min(1),
  manufactured_at: z.string().datetime({ offset: true }),
  activated_at: z.string().datetime({ offset: true }).optional(),
  warranty_status: deviceWarrantyStatusSchema,
  warranty_expires_at: z.string().datetime({ offset: true }).optional(),
});
export type NonIotDeviceDto = z.infer<typeof nonIotDeviceDtoSchema>;

export const nonIotDevicePageDtoSchema = z.object({
  items: z.array(nonIotDeviceDtoSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export const nonIotDeviceCountsDtoSchema = z.object({
  total: z.number().int().nonnegative(),
  warranty_active: z.number().int().nonnegative(),
  warranty_expiring: z.number().int().nonnegative(),
  warranty_expired: z.number().int().nonnegative(),
});

export interface NonIotDevice {
  id: string;
  modelName: string;
  region: string;
  ward?: string;
  ownerId?: string;
  batchCode: string;
  manufacturedAt: string;
  activatedAt?: string;
  warrantyStatus: DeviceWarrantyStatus;
  warrantyExpiresAt?: string;
}

export interface NonIotDeviceCounts {
  total: number;
  warrantyActive: number;
  warrantyExpiring: number;
  warrantyExpired: number;
}

export interface NonIotDeviceListFilters {
  search: string;
  region?: string;
  /** "none" is never filtered on: every sold unit has a warranty record. */
  warrantyStatus?: Exclude<DeviceWarrantyStatus, 'none'>;
  page: number;
  pageSize: number;
}
