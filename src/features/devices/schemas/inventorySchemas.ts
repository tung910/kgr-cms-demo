import { z } from 'zod';

import type { ProductConnectivity } from '@/shared/constants/productConnectivity';

import { entitlementSummaryDtoSchema } from './entitlementSchemas';
import type { EntitlementSummary } from './entitlementSchemas';
import { productConnectivitySchema } from './productConnectivitySchema';

// Devices that left the factory but have never been bound to a customer
// (no cloud activation yet). They carry no owner, so no PII is involved.

export const inventoryQcStatusSchema = z.enum(['passed', 'pending', 'failed']);
export type InventoryQcStatus = z.infer<typeof inventoryQcStatusSchema>;

export const inventoryDeviceDtoSchema = z.object({
  device_id: z.string().min(1),
  model_name: z.string().min(1),
  connectivity: productConnectivitySchema,
  batch_code: z.string().min(1),
  manufactured_at: z.string().datetime({ offset: true }),
  received_at: z.string().datetime({ offset: true }),
  qc_status: inventoryQcStatusSchema,
  // Null for non-IoT products (no IoT module, nothing to flash).
  module_firmware_version: z.string().min(1).nullable(),
  mainboard_firmware_version: z.string().min(1).nullable(),
  firmware_outdated: z.boolean(),
  // Legacy records predate this field (spec §11): nullish → mapper default [].
  entitlements_summary: z.array(entitlementSummaryDtoSchema).nullish(),
});
export type InventoryDeviceDto = z.infer<typeof inventoryDeviceDtoSchema>;

export const inventoryDevicePageDtoSchema = z.object({
  items: z.array(inventoryDeviceDtoSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export type InventoryDevicePageDto = z.infer<
  typeof inventoryDevicePageDtoSchema
>;

export const inventoryCountsDtoSchema = z.object({
  total: z.number().int().nonnegative(),
  iot: z.number().int().nonnegative(),
  non_iot: z.number().int().nonnegative(),
  aging: z.number().int().nonnegative(),
  aged: z.number().int().nonnegative(),
});
export type InventoryCountsDto = z.infer<typeof inventoryCountsDtoSchema>;

// Pulls never-activated units from the production/warehouse system.
export const inventorySyncResultDtoSchema = z.object({
  synced_at: z.string().datetime({ offset: true }),
  added: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  // Service entitlements auto-attached to newly received units (spec §4.2).
  // Legacy/other callers predate this field: nullish → mapper default 0.
  entitlements_attached: z.number().int().nonnegative().nullish(),
});
export type InventorySyncResultDto = z.infer<
  typeof inventorySyncResultDtoSchema
>;

export interface InventorySyncResult {
  syncedAt: string;
  added: number;
  updated: number;
  entitlementsAttached: number;
}

export interface InventoryDevice {
  id: string;
  modelName: string;
  connectivity: ProductConnectivity;
  batchCode: string;
  manufacturedAt: string;
  receivedAt: string;
  qcStatus: InventoryQcStatus;
  moduleFirmwareVersion: string | null;
  mainboardFirmwareVersion: string | null;
  firmwareOutdated: boolean;
  entitlementsSummary: EntitlementSummary[];
}

export interface InventoryCounts {
  total: number;
  iot: number;
  nonIot: number;
  /** Units in stock AGING_WARNING_DAYS..AGED_STOCK_DAYS. */
  aging: number;
  /** Units in stock longer than AGED_STOCK_DAYS. */
  aged: number;
}

export interface InventoryListFilters {
  search: string;
  model?: string;
  page: number;
  pageSize: number;
}

// Counts ignore pagination, like the in-use cards.
export type InventoryCountFilters = Omit<
  InventoryListFilters,
  'page' | 'pageSize'
>;
