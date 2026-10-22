import type { Campaign, CampaignMetrics } from '../schemas/campaignSchemas';

export interface CampaignMetricLabels {
  campaign: string;
  sendId: string;
  failed: string;
  failureReason: string;
  sent: string;
  delivered: string;
  opened: string;
  clicked: string;
  conversionsBooking: string;
  conversionsQr: string;
  revenue: string;
}

// Builds the metrics CSV client-side (like exportDevicesToCsv) so no download
// endpoint is needed. Header labels are passed in already translated.
export function exportCampaignMetricsToCsv(
  campaign: Campaign,
  metrics: CampaignMetrics,
  labels: CampaignMetricLabels,
  fileLabel: string
): void {
  const rows: Array<[string, string | number]> = [
    [labels.campaign, campaign.name],
    [labels.sendId, metrics.sendId],
    [labels.failed, metrics.failed],
    [labels.failureReason, metrics.failureReason ?? ''],
    [labels.sent, metrics.sent],
    [labels.delivered, metrics.delivered],
    [labels.opened, metrics.opened],
    [labels.clicked, metrics.clicked],
    [labels.conversionsBooking, metrics.conversionsBooking],
    [labels.conversionsQr, metrics.conversionsQr],
    [labels.revenue, metrics.revenue],
  ];
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = rows
    .map(([key, value]) => `${escape(key)},${escape(value)}`)
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileLabel}-${campaign.id}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
