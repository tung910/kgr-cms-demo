import { z } from 'zod';

export const INVENTORY_IMPORT_MAX_ROWS = 10_000;
export const INVENTORY_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
const id = z.string().trim().min(1);
export const inventoryImportRowSchema = z.object({ serial: id, model: id });
export type InventoryImportRow = z.infer<typeof inventoryImportRowSchema>;
export const inventoryImportSourceSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('csv'),
    rows: z
      .array(inventoryImportRowSchema)
      .min(1)
      .max(INVENTORY_IMPORT_MAX_ROWS),
  }),
  z.object({ source: z.literal('warehouse') }),
]);
export type InventoryImportSource = z.infer<typeof inventoryImportSourceSchema>;
export const inventoryImportPreviewDtoSchema = z.object({
  preview_id: id,
  items: z
    .array(inventoryImportRowSchema.extend({ row_id: id }))
    .min(1)
    .max(INVENTORY_IMPORT_MAX_ROWS),
});
export type InventoryImportPreviewDto = z.infer<
  typeof inventoryImportPreviewDtoSchema
>;
export interface InventoryImportPreview {
  previewId: string;
  items: (InventoryImportRow & { rowId: string })[];
}
const benefitDtoSchema = z.object({
  id,
  code: id,
  name: id,
  quota: z.number().int().nonnegative().nullable(),
  term_months: z.number().int().positive().nullable(),
});
export const inventoryImportPackageOptionsDtoSchema = z.array(
  z.object({
    id,
    code: id,
    name: id,
    benefits: z.array(benefitDtoSchema).min(1),
  })
);
export interface InventoryImportBenefit {
  id: string;
  code: string;
  name: string;
  quota: number | null;
  termMonths: number | null;
}
export interface InventoryImportPackageOption {
  id: string;
  code: string;
  name: string;
  benefits: InventoryImportBenefit[];
}
export const inventoryImportConfirmDtoSchema = z.object({
  preview_id: id,
  assignments: z
    .array(
      z.object({
        row_id: id,
        package_ids: z
          .array(id)
          .refine((ids) => new Set(ids).size === ids.length),
      })
    )
    .min(1)
    .max(INVENTORY_IMPORT_MAX_ROWS),
});
export interface InventoryImportConfirmInput {
  previewId: string;
  assignments: { rowId: string; packageIds: string[] }[];
}
export const inventoryImportResultDtoSchema = z.object({
  items: z.array(
    z.object({
      row_id: id,
      serial: id,
      status: z.enum(['added', 'skipped', 'failed']),
      code: id,
      entitlements_attached: z.number().int().nonnegative(),
    })
  ),
  added: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  entitlements_attached: z.number().int().nonnegative(),
});
export type InventoryImportResultDto = z.infer<
  typeof inventoryImportResultDtoSchema
>;
export interface InventoryImportResult {
  items: {
    rowId: string;
    serial: string;
    status: 'added' | 'skipped' | 'failed';
    code: string;
    entitlementsAttached: number;
  }[];
  added: number;
  skipped: number;
  failed: number;
  entitlementsAttached: number;
}
