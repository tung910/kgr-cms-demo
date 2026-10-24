import type { PortalTone } from '@/shared/components/portal';

// Campaign lifecycle (spec 7.5): Nháp → Chờ duyệt → Đã duyệt → Đang chạy ⇄
// Tạm dừng → Kết thúc. An approver who rejects sends it back to Nháp with a
// reason. `labelKey` lives in the `campaigns` namespace.
export const CAMPAIGN_STATUSES = [
  { value: 'draft', labelKey: 'status.draft' },
  { value: 'pending_approval', labelKey: 'status.pending_approval' },
  { value: 'approved', labelKey: 'status.approved' },
  { value: 'running', labelKey: 'status.running' },
  { value: 'paused', labelKey: 'status.paused' },
  { value: 'ended', labelKey: 'status.ended' },
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
};
