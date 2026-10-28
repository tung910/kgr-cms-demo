import { z } from 'zod';

import {
  SERVICE_PACKAGE_TYPES,
  getServiceBillingTypes,
  type ServiceTypeCode,
} from '../constants/servicePackageTypes';
import { getEntitlementKind } from '../utils/entitlementRules';
import {
  servicePackageDetailsSchema,
  type ServicePackageConfiguration,
} from './servicePackageConfiguration';

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

// §5.1: a package's entitlement quota is either the default formula
// (entitlementRules.computeEntitlementQuota) or a fixed `customQuota`.
export const quotaModeSchema = z.enum(['default', 'custom']);
export type QuotaMode = z.infer<typeof quotaModeSchema>;

export interface ServicePackageListFilters {
  search: string;
  group?: ServicePackageGroup;
  billingType?: BillingType;
  status?: PackageStatus;
  page: number;
  pageSize: number;
}

export interface ServicePackageDetails {
  serviceTypeCode: ServiceTypeCode;
  purpose: string;
  includedItems: string[];
  excludedItems: string[];
  eligibilityDescription: string;
  modelScope: 'all' | 'selected';
  eligibleModelIds: string[];
  pricingMode: 'fixed' | 'free_or_included' | 'quotation';
  pricingDescription: string | null;
  additionalCostDescription: string | null;
  configuration: ServicePackageConfiguration;
}

export interface ServicePackage {
  details: ServicePackageDetails | null;
  id: string;
  code: string;
  name: string;
  group: ServicePackageGroup;
  billingType: BillingType;
  status: PackageStatus;
  // Price in VND (minor-unit-free; VND has no decimals).
  price: number | null;
  // Billing cadence for recurring/subscription packages; null for one-time.
  billingPeriodMonths: number | null;
  // Contract/coverage length (warranty extension, rental term); null if n/a.
  termMonths: number | null;
  // §5.1 quota override: 'custom' uses `customQuota` instead of the default
  // formula. `customQuota` is a positive integer when `quotaMode = 'custom'`,
  // otherwise null.
  quotaMode: QuotaMode;
  customQuota: number | null;
  // §4.1 auto-attach-on-stock-intake config. `autoAttachFrom` is an ISO date
  // (no time component); null unless `autoAttach` is true.
  autoAttach: boolean;
  autoAttachFrom: string | null;
  // How many product models this package may be attached to (eligibility map).
  eligibleModelCount: number;
  description: string | null;
  updatedAt: string;
}

export const servicePackageDtoSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().min(1),
    name: z.string().min(1),
    group: servicePackageGroupSchema,
    billing_type: billingTypeSchema,
    status: packageStatusSchema,
    price: z.number().int().nonnegative().nullable(),
    billing_period_months: z.number().int().positive().nullable(),
    term_months: z.number().int().positive().nullable(),
    // Old records predate these fields; nullish → default/null (spec §11).
    quota_mode: quotaModeSchema.nullish(),
    custom_quota: z.number().int().positive().nullish(),
    auto_attach: z.boolean().nullish(),
    auto_attach_from: z.string().date().nullish(),
    eligible_model_count: z.number().int().nonnegative().default(0),
    description: z.string().nullable(),
    updated_at: z.string().datetime({ offset: true }),
  })
  .extend({
    service_type_code:
      servicePackageDetailsSchema.shape.service_type_code.nullish(),
    purpose: servicePackageDetailsSchema.shape.purpose.nullish(),
    included_items: servicePackageDetailsSchema.shape.included_items.nullish(),
    excluded_items: servicePackageDetailsSchema.shape.excluded_items.nullish(),
    eligibility_description:
      servicePackageDetailsSchema.shape.eligibility_description.nullish(),
    model_scope: servicePackageDetailsSchema.shape.model_scope.nullish(),
    eligible_model_ids:
      servicePackageDetailsSchema.shape.eligible_model_ids.nullish(),
    pricing_mode: servicePackageDetailsSchema.shape.pricing_mode.nullish(),
    pricing_description:
      servicePackageDetailsSchema.shape.pricing_description.nullish(),
    additional_cost_description:
      servicePackageDetailsSchema.shape.additional_cost_description.nullish(),
    configuration: servicePackageDetailsSchema.shape.configuration.nullish(),
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
export interface ServicePackageDraftInput extends ServicePackageDetails {
  code: string;
  name: string;
  group: ServicePackageGroup;
  billingType: BillingType;
  price: number | null;
  billingPeriodMonths: number | null;
  termMonths: number | null;
  quotaMode: QuotaMode;
  customQuota: number | null;
  autoAttach: boolean;
  autoAttachFrom: string | null;
  eligibleModelCount: number;
  description: string | null;
}

// Wire shape the mock backend validates (snake_case).
export const servicePackageDraftInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Z0-9][A-Z0-9-]*$/),
    name: z.string().trim().min(1),
    group: servicePackageGroupSchema,
    billing_type: billingTypeSchema,
    price: z.number().int().nonnegative().nullable(),
    billing_period_months: z.number().int().positive().nullable(),
    term_months: z.number().int().positive().nullable(),
    // `.default(...)` (not strictly required) so this schema can still
    // re-validate pre-existing packages created before these fields existed
    // (see the publish-transition `configurationRequired` check below, which
    // reuses this same schema against already-stored DTOs).
    quota_mode: quotaModeSchema.default('default'),
    custom_quota: z.number().int().positive().nullable().default(null),
    auto_attach: z.boolean().default(false),
    auto_attach_from: z.string().date().nullable().default(null),
    eligible_model_count: z.number().int().nonnegative().default(0),
    description: z.string().trim().min(1).nullable(),
  })
  .extend(servicePackageDetailsSchema.shape)
  .superRefine((value, ctx) => {
    const issue = (path: string | string[], message: string) =>
      ctx.addIssue({
        code: 'custom',
        path: Array.isArray(path) ? path : [path],
        message,
      });
    const type = SERVICE_PACKAGE_TYPES.find(
      (item) => item.value === value.service_type_code
    );
    if (value.group !== type?.group) issue('group', 'typeGroup');
    if (value.configuration.type !== value.service_type_code)
      issue('configuration', 'typeMismatch');
    if (
      value.pricing_mode === 'fixed' &&
      (value.price === null || value.price <= 0)
    )
      issue('price', 'positivePrice');
    if (value.pricing_mode === 'free_or_included' && value.price !== 0)
      issue('price', 'freePrice');
    if (value.pricing_mode === 'quotation' && value.price !== null)
      issue('price', 'quotationPrice');
    if (value.pricing_mode !== 'fixed' && !value.pricing_description)
      issue('pricing_description', 'required');
    if (
      value.billing_type === 'one_time'
        ? value.billing_period_months !== null
        : value.billing_period_months === null
    )
      issue('billing_period_months', 'billingPeriod');
    if (
      ['BH-EXT', 'BH-ADP', 'BH-CMP', 'BT-CLN', 'TG-ALL', 'TG-SUB'].includes(
        value.service_type_code
      ) &&
      value.term_months === null
    )
      issue('term_months', 'required');
    if (
      !getServiceBillingTypes(value.service_type_code).includes(
        value.billing_type
      )
    )
      issue('billing_type', 'billingType');
    if (
      value.configuration.type === 'TG-ALL' &&
      new Set(value.configuration.packages.map((item) => item.id)).size !==
        value.configuration.packages.length
    )
      issue(['configuration', 'packages'], 'duplicate');

    // §5.1: quota customization applies only to one_time/counted kinds;
    // time_only (and bundle, which has no entitlement kind of its own) must
    // stay on the default/null pair.
    const kind = getEntitlementKind(value.service_type_code);
    if (kind === 'time_only' || kind === null) {
      if (value.quota_mode !== 'default')
        issue('quota_mode', 'timeOnlyQuotaMode');
      if (value.custom_quota !== null)
        issue('custom_quota', 'timeOnlyQuotaMode');
    } else {
      if (value.quota_mode === 'custom' && value.custom_quota === null)
        issue('custom_quota', 'quotaRequired');
      if (value.quota_mode === 'default' && value.custom_quota !== null)
        issue('custom_quota', 'quotaNotAllowed');
    }
  });

export type ServicePackageDraftDto = z.infer<
  typeof servicePackageDraftInputSchema
>;

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
