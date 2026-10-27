import { z } from 'zod';

// Add-on service packages sold alongside a product (M11, e-commerce
// counterpart). These enums are used only inside this slice, so they stay here
// rather than in src/shared/constants (see AGENTS.md). Labels live in the
// `servicePackages` i18n namespace and are translated at render time.

// The five groups an add-on package can belong to, in display order.
export const servicePackageGroupSchema = z.enum([
  'installation',
  'warranty',
  'maintenance',
  'care',
  'bundle',
]);
export type ServicePackageGroup = z.infer<typeof servicePackageGroupSchema>;

// How the customer is billed. `one_time` is a single charge; `recurring`
// renews each period; `subscription` is a fixed-term contract (e.g. rental).
export const billingTypeSchema = z.enum([
  'one_time',
  'recurring',
  'subscription',
]);
export type BillingType = z.infer<typeof billingTypeSchema>;

// Catalogue lifecycle: a draft is editable and hidden from the storefront,
// `active` is published to the app/storefront, `archived` is retired.
export const packageStatusSchema = z.enum(['draft', 'active', 'archived']);
export type PackageStatus = z.infer<typeof packageStatusSchema>;

export interface ServicePackageListFilters {
  search: string;
  group?: ServicePackageGroup;
  billingType?: BillingType;
  status?: PackageStatus;
  page: number;
  pageSize: number;
}

export interface ServicePackage {
  id: string;
  code: string;
  name: string;
  group: ServicePackageGroup;
  billingType: BillingType;
  status: PackageStatus;
  // Price in VND (minor-unit-free; VND has no decimals).
  price: number;
  // Billing cadence for recurring/subscription packages; null for one-time.
  billingPeriodMonths: number | null;
  // Contract/coverage length (warranty extension, rental term); null if n/a.
  termMonths: number | null;
  // How many product models this package may be attached to (eligibility map).
  eligibleModelCount: number;
  description: string | null;
  updatedAt: string;
}

export const servicePackageDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  group: servicePackageGroupSchema,
  billing_type: billingTypeSchema,
  status: packageStatusSchema,
  price: z.number().int().nonnegative(),
  billing_period_months: z.number().int().positive().nullable(),
  term_months: z.number().int().positive().nullable(),
  eligible_model_count: z.number().int().nonnegative(),
  description: z.string().nullable(),
  updated_at: z.string().datetime({ offset: true }),
});
export type ServicePackageDto = z.infer<typeof servicePackageDtoSchema>;

export const servicePackagePageDtoSchema = z.object({
  items: z.array(servicePackageDtoSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export type ServicePackagePageDto = z.infer<typeof servicePackagePageDtoSchema>;

// Whole-catalogue counts for the stat cards (ignores list filters, like the
// device status-counts endpoint).
export interface ServicePackageStats {
  total: number;
  active: number;
  recurring: number;
}

export const servicePackageStatsDtoSchema = z.object({
  total: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  recurring: z.number().int().nonnegative(),
});
export type ServicePackageStatsDto = z.infer<
  typeof servicePackageStatsDtoSchema
>;

// Fields captured when creating a new package. A new package always starts as
// a `draft`; status is changed later through the publish/archive action.
export interface ServicePackageDraftInput {
  code: string;
  name: string;
  group: ServicePackageGroup;
  billingType: BillingType;
  price: number;
  billingPeriodMonths: number | null;
  termMonths: number | null;
  eligibleModelCount: number;
  description: string | null;
}

// Wire shape the mock backend validates (snake_case).
export const servicePackageDraftInputSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Z0-9][A-Z0-9-]*$/),
  name: z.string().trim().min(1),
  group: servicePackageGroupSchema,
  billing_type: billingTypeSchema,
  price: z.number().int().nonnegative(),
  billing_period_months: z.number().int().positive().nullable(),
  term_months: z.number().int().positive().nullable(),
  eligible_model_count: z.number().int().nonnegative(),
  description: z.string().trim().min(1).nullable(),
});

// State-changing action (publish/archive): the reason feeds the immutable
// audit log, mirroring the device lifecycle mutation contract.
export interface SetPackageStatusInput {
  status: PackageStatus;
  reason: string;
}

export const packageAuditChangeSchema = z.object({
  field: z.string().min(1),
  before_value: z.string(),
  after_value: z.string(),
});
export const packageStatusMutationSchema = z.object({
  status: packageStatusSchema,
  reason: z.string().trim().min(1),
  changes: z.array(packageAuditChangeSchema).min(1),
});
