import dayjs, { type Dayjs } from 'dayjs';

import type { ButtonType, CoreMode } from '../../constants/campaignCta';
import {
  priorityOfGroup,
  type CampaignKind,
  type DedupeMode,
  type DisplayType,
  type AudienceLogic,
  type NotificationGroup,
  type SegmentWarrantyStatus,
  type TriggerPreset,
  type UsageType,
} from '../../constants/campaignEnums';
import { CAMPAIGN_TENANT_ID } from '../../constants/campaignTenant';
import type { ProductConnectivity } from '@/shared/constants/productConnectivity';
import type {
  AudienceConditions,
  AudienceDefinition,
} from '../../schemas/audienceSchemas';
import {
  DEFAULT_TRIGGER_CONFIG,
  type Campaign,
  type CampaignButton,
  type CampaignDraftInput,
  type CampaignOffer,
} from '../../schemas/campaignSchemas';

// Conditions an author can add to the audience (spec 7.2). The last two are
// "advanced" and sit in their own group of the picker.
export const SEGMENT_FIELDS = [
  { value: 'regions', labelKey: 'fields.regions', advanced: false },
  { value: 'models', labelKey: 'fields.models', advanced: false },
  {
    value: 'warrantyStatuses',
    labelKey: 'fields.warrantyStatuses',
    advanced: false,
  },
  {
    value: 'coreRemainingDays',
    labelKey: 'fields.coreRemainingDays',
    advanced: false,
  },
  { value: 'regionTds', labelKey: 'fields.regionTds', advanced: false },
  {
    value: 'loyaltyPoints',
    labelKey: 'fields.loyaltyPoints',
    advanced: false,
  },
  { value: 'usageTypes', labelKey: 'fields.usageTypes', advanced: false },
  {
    value: 'firmwareVersions',
    labelKey: 'fields.firmwareVersions',
    advanced: true,
  },
  {
    value: 'connectivities',
    labelKey: 'fields.connectivities',
    advanced: true,
  },
] as const;
export type SegmentField = (typeof SEGMENT_FIELDS)[number]['value'];

// One button as edited in the form. An empty label means "use the suggestion".
export interface ButtonValues {
  type: ButtonType;
  label?: string;
  coreMode?: CoreMode;
  coreSkus?: string[];
  screen?: string;
}

export type OfferKind = 'voucher_percent' | 'voucher_amount' | 'points';

export interface WizardValues {
  // B0 / B1
  kind: CampaignKind;
  name: string;
  displayType: DisplayType;
  notificationGroup: NotificationGroup;
  // B2 — one-off
  scheduleType: 'send_now' | 'scheduled';
  scheduledAt?: Dayjs;
  // B2 — trigger
  triggerPreset: TriggerPreset;
  coreDays: number;
  exitOnPurchase: boolean;
  exitOnWarrantyRenewed: boolean;
  cooldownDays: number;
  maxSends: number;
  quietFrom: string;
  quietTo: string;
  fallbackSmsZalo: boolean;
  startsOn?: Dayjs;
  endsOn?: Dayjs;
  // B3
  activeFields: SegmentField[];
  logic: AudienceLogic;
  regions?: string[];
  models?: string[];
  firmwareVersions?: string[];
  warrantyStatuses?: SegmentWarrantyStatus[];
  usageTypes?: UsageType[];
  connectivities?: ProductConnectivity[];
  coreMin?: number;
  coreMax?: number;
  tdsMin?: number;
  tdsMax?: number;
  loyaltyMin?: number;
  loyaltyMax?: number;
  dedupe: DedupeMode;
  suppressRecent: boolean;
  suppressTest: boolean;
  frequencyCap: number;
  // B4
  title: string;
  content: string;
  buttons: ButtonValues[];
  abEnabled: boolean;
  titleB?: string;
  bodyB?: string;
  splitB: number;
  // B5
  offerEnabled: boolean;
  offerKind: OfferKind;
  voucherCode?: string;
  discountValue?: number;
  points?: number;
  usageLimitTotal?: number;
  validUntil?: Dayjs;
  appliesTo?: string;
  // B6
  approverId?: string;
  testRecipients: string;
}

export const DEFAULT_WIZARD_VALUES: WizardValues = {
  kind: 'manual',
  name: '',
  displayType: 'push',
  notificationGroup: 'core',
  scheduleType: 'send_now',
  triggerPreset: 'core_due',
  coreDays: DEFAULT_TRIGGER_CONFIG.coreDays ?? 15,
  exitOnPurchase: DEFAULT_TRIGGER_CONFIG.exitOnPurchase,
  exitOnWarrantyRenewed: DEFAULT_TRIGGER_CONFIG.exitOnWarrantyRenewed,
  cooldownDays: DEFAULT_TRIGGER_CONFIG.cooldownDays,
  maxSends: DEFAULT_TRIGGER_CONFIG.maxSends,
  quietFrom: DEFAULT_TRIGGER_CONFIG.quietFrom,
  quietTo: DEFAULT_TRIGGER_CONFIG.quietTo,
  fallbackSmsZalo: false,
  startsOn: dayjs(),
  activeFields: [],
  logic: 'and',
  dedupe: 'account',
  suppressRecent: true,
  suppressTest: true,
  frequencyCap: 1,
  title: '',
  content: '',
  buttons: [{ type: 'buy_core', coreMode: 'auto' }],
  abEnabled: false,
  splitB: 50,
  offerEnabled: false,
  offerKind: 'voucher_percent',
  testRecipients: '',
};

const range = (min?: number | null, max?: number | null) => {
  if (min == null && max == null) return undefined;
  return {
    ...(min != null ? { min } : {}),
    ...(max != null ? { max } : {}),
  };
};

// Only conditions the author added count; removing a row clears its filter.
export function buildConditions(
  values: Partial<WizardValues>
): AudienceConditions {
  const active = new Set(values.activeFields ?? []);
  const on = (field: SegmentField) => active.has(field);
  return {
    logic: values.logic ?? 'and',
    regions: on('regions') ? (values.regions ?? []) : [],
    models: on('models') ? (values.models ?? []) : [],
    firmwareVersions: on('firmwareVersions')
      ? (values.firmwareVersions ?? [])
      : [],
    warrantyStatuses: on('warrantyStatuses')
      ? (values.warrantyStatuses ?? [])
      : [],
    usageTypes: on('usageTypes') ? (values.usageTypes ?? []) : [],
    connectivities: on('connectivities') ? (values.connectivities ?? []) : [],
    coreRemainingDays: on('coreRemainingDays')
      ? range(values.coreMin, values.coreMax)
      : undefined,
    regionTds: on('regionTds')
      ? range(values.tdsMin, values.tdsMax)
      : undefined,
    loyaltyPoints: on('loyaltyPoints')
      ? range(values.loyaltyMin, values.loyaltyMax)
      : undefined,
  };
}

export function buildAudienceDefinition(
  values: Partial<WizardValues>
): AudienceDefinition {
  return {
    conditions: buildConditions(values),
    dedupe: values.dedupe ?? 'account',
    suppression: {
      recentCampaign: values.suppressRecent ?? true,
      testAccounts: values.suppressTest ?? true,
    },
  };
}

// SKUs of every "Mua lõi" button that targets specific cores: the default
// scope of an attached offer (spec 7.4).
export function buttonCoreSkus(values: Partial<WizardValues>): string[] {
  return [
    ...new Set(
      (values.buttons ?? []).flatMap((button) =>
        button.type === 'buy_core' && button.coreMode === 'specific'
          ? (button.coreSkus ?? [])
          : []
      )
    ),
  ];
}

export type ButtonLabeler = (button: ButtonValues) => string;

export function buildButtons(
  values: Partial<WizardValues>,
  labelFor: ButtonLabeler
): CampaignButton[] {
  return (values.buttons ?? []).map((button) => ({
    type: button.type,
    label: button.label?.trim() || labelFor(button),
    ...(button.type === 'buy_core'
      ? {
          coreMode: button.coreMode ?? 'auto',
          ...(button.coreMode === 'specific'
            ? { coreSkus: button.coreSkus ?? [] }
            : {}),
        }
      : {}),
    ...(button.type === 'open_screen' && button.screen
      ? { screen: button.screen }
      : {}),
  }));
}

export function buildOffer(values: WizardValues): CampaignOffer | null {
  if (!values.offerEnabled) return null;
  const appliesTo =
    values.appliesTo?.trim() || buttonCoreSkus(values).join(', ');
  const common = {
    ...(values.validUntil
      ? { validUntil: values.validUntil.toISOString() }
      : {}),
    ...(appliesTo ? { appliesTo } : {}),
  };
  if (values.offerKind === 'points') {
    return {
      type: 'loyalty_points',
      ...(values.points != null ? { points: values.points } : {}),
      ...common,
    };
  }
  return {
    type: 'voucher',
    discountType: values.offerKind === 'voucher_percent' ? 'percent' : 'amount',
    ...(values.voucherCode?.trim()
      ? { voucherCode: values.voucherCode.trim() }
      : {}),
    ...(values.discountValue != null
      ? { discountValue: values.discountValue }
      : {}),
    ...(values.usageLimitTotal != null
      ? { usageLimitTotal: values.usageLimitTotal }
      : {}),
    ...common,
  };
}

export function splitRecipients(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildDraftInput(
  values: WizardValues,
  audienceCount: number | null,
  reason: string,
  labelFor: ButtonLabeler
): CampaignDraftInput {
  const isTrigger = values.kind === 'trigger';
  const scheduled = !isTrigger && values.scheduleType === 'scheduled';
  return {
    reason,
    priority: priorityOfGroup(values.notificationGroup),
    tenantId: CAMPAIGN_TENANT_ID,
    name: values.name.trim(),
    kind: values.kind,
    displayType: values.displayType,
    notificationGroup: values.notificationGroup,
    title: values.title?.trim() ?? '',
    content: values.content?.trim() ?? '',
    buttons: buildButtons(values, labelFor),
    scheduleType: isTrigger ? 'send_now' : values.scheduleType,
    startsAt: isTrigger
      ? (values.startsOn?.toISOString() ?? null)
      : scheduled && values.scheduledAt
        ? values.scheduledAt.toISOString()
        : null,
    endsAt: isTrigger ? (values.endsOn?.toISOString() ?? null) : null,
    triggerPreset: isTrigger ? values.triggerPreset : null,
    triggerConfig: isTrigger
      ? {
          ...(values.triggerPreset === 'core_due'
            ? { coreDays: values.coreDays }
            : {}),
          exitOnPurchase: values.exitOnPurchase,
          exitOnWarrantyRenewed: values.exitOnWarrantyRenewed,
          cooldownDays: values.cooldownDays,
          maxSends: values.maxSends,
          quietFrom: values.quietFrom,
          quietTo: values.quietTo,
          fallbackSmsZalo: values.fallbackSmsZalo,
        }
      : null,
    frequencyCapPerCustomer: values.frequencyCap,
    audience: buildConditions(values),
    dedupe: values.dedupe,
    suppression: {
      recentCampaign: values.suppressRecent,
      testAccounts: values.suppressTest,
    },
    audienceCount,
    abTest: values.abEnabled
      ? {
          titleB: values.titleB?.trim() ?? '',
          bodyB: values.bodyB?.trim() ?? '',
          splitB: values.splitB,
        }
      : null,
    offer: buildOffer(values),
    testRecipients: splitRecipients(values.testRecipients ?? ''),
  };
}

function activeFieldsOf(a: AudienceConditions): SegmentField[] {
  const fields: SegmentField[] = [];
  if (a.regions.length) fields.push('regions');
  if (a.models.length) fields.push('models');
  if (a.warrantyStatuses.length) fields.push('warrantyStatuses');
  if (a.coreRemainingDays) fields.push('coreRemainingDays');
  if (a.regionTds) fields.push('regionTds');
  if (a.loyaltyPoints) fields.push('loyaltyPoints');
  if (a.usageTypes.length) fields.push('usageTypes');
  if (a.firmwareVersions.length) fields.push('firmwareVersions');
  if (a.connectivities.length) fields.push('connectivities');
  return fields;
}

export function fromCampaign(campaign: Campaign): WizardValues {
  const a = campaign.audience;
  const offer = campaign.offer;
  const config = campaign.triggerConfig;
  return {
    ...DEFAULT_WIZARD_VALUES,
    kind: campaign.kind,
    name: campaign.name,
    displayType: campaign.displayType,
    notificationGroup: campaign.notificationGroup,
    scheduleType: campaign.scheduleType,
    scheduledAt:
      campaign.kind === 'manual' && campaign.startsAt
        ? dayjs(campaign.startsAt)
        : undefined,
    triggerPreset:
      campaign.triggerPreset ?? DEFAULT_WIZARD_VALUES.triggerPreset,
    coreDays: config?.coreDays ?? DEFAULT_WIZARD_VALUES.coreDays,
    exitOnPurchase: config?.exitOnPurchase ?? true,
    exitOnWarrantyRenewed: config?.exitOnWarrantyRenewed ?? false,
    cooldownDays: config?.cooldownDays ?? DEFAULT_WIZARD_VALUES.cooldownDays,
    maxSends: config?.maxSends ?? DEFAULT_WIZARD_VALUES.maxSends,
    quietFrom: config?.quietFrom ?? DEFAULT_WIZARD_VALUES.quietFrom,
    quietTo: config?.quietTo ?? DEFAULT_WIZARD_VALUES.quietTo,
    fallbackSmsZalo: config?.fallbackSmsZalo ?? false,
    startsOn:
      campaign.kind === 'trigger' && campaign.startsAt
        ? dayjs(campaign.startsAt)
        : dayjs(),
    endsOn:
      campaign.kind === 'trigger' && campaign.endsAt
        ? dayjs(campaign.endsAt)
        : undefined,
    activeFields: activeFieldsOf(a),
    logic: a.logic,
    regions: a.regions,
    models: a.models,
    firmwareVersions: a.firmwareVersions,
    warrantyStatuses: a.warrantyStatuses,
    usageTypes: a.usageTypes,
    connectivities: a.connectivities,
    coreMin: a.coreRemainingDays?.min,
    coreMax: a.coreRemainingDays?.max,
    tdsMin: a.regionTds?.min,
    tdsMax: a.regionTds?.max,
    loyaltyMin: a.loyaltyPoints?.min,
    loyaltyMax: a.loyaltyPoints?.max,
    dedupe: campaign.dedupe,
    suppressRecent: campaign.suppression.recentCampaign,
    suppressTest: campaign.suppression.testAccounts,
    frequencyCap: campaign.frequencyCapPerCustomer,
    title: campaign.title,
    content: campaign.content,
    buttons: campaign.buttons.map((button) => ({ ...button })),
    abEnabled: campaign.abTest != null,
    titleB: campaign.abTest?.titleB,
    bodyB: campaign.abTest?.bodyB,
    splitB: campaign.abTest?.splitB ?? 50,
    offerEnabled: offer != null,
    offerKind:
      offer?.type === 'loyalty_points'
        ? 'points'
        : offer?.discountType === 'amount'
          ? 'voucher_amount'
          : 'voucher_percent',
    voucherCode: offer?.voucherCode,
    discountValue: offer?.discountValue,
    points: offer?.points,
    usageLimitTotal: offer?.usageLimitTotal,
    validUntil: offer?.validUntil ? dayjs(offer.validUntil) : undefined,
    appliesTo: offer?.appliesTo,
    approverId: campaign.approverId ?? undefined,
    testRecipients: campaign.testRecipients.join(', '),
  };
}
