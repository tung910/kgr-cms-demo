import type { PortalTone } from '@/shared/components/portal';

// Campaign lifecycle (spec 7.5): Nháp → Chờ duyệt → Đã duyệt → Đang chạy →
// Kết thúc, plus a rejected branch that an approver sends back to draft.
// `labelKey` lives in the `campaigns` namespace; translate with
// `t(labelKey, { ns: 'campaigns' })`.
export const CAMPAIGN_STATUSES = [
  { value: 'draft', labelKey: 'status.draft' },
  { value: 'pending_approval', labelKey: 'status.pending_approval' },
  { value: 'approved', labelKey: 'status.approved' },
  { value: 'running', labelKey: 'status.running' },
  { value: 'paused', labelKey: 'status.paused' },
  { value: 'ended', labelKey: 'status.ended' },
  { value: 'rejected', labelKey: 'status.rejected' },
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]['value'];

export const CAMPAIGN_STATUS_LABEL_KEYS = Object.fromEntries(
  CAMPAIGN_STATUSES.map(({ value, labelKey }) => [value, labelKey])
) as Record<CampaignStatus, string>;

export const CAMPAIGN_STATUS_TONES: Record<CampaignStatus, PortalTone> = {
  draft: 'water',
  pending_approval: 'warning',
  approved: 'info',
  running: 'primary',
  paused: 'warning',
  ended: 'water',
  rejected: 'danger',
};
