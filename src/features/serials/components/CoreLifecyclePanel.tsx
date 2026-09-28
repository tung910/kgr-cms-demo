import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  Button,
  Popconfirm,
  Select,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { modelReferenceQueries } from '@/core/reference/modelReferenceQueries';
import { PortalCard } from '@/shared/components/portal';
import { formatDateTime } from '@/shared/lib/format';

import { updateCoreLifecycleConfig } from '../api/coreLifecycleApi';
import { coreLifecycleQueries } from '../queries/coreLifecycleQueries';
import type {
  CoreLifecycleConfig,
  CoreSku,
} from '../schemas/coreLifecycleSchemas';
import { CampaignModal } from './CampaignModal';
import { CoreSkuModal } from './CoreSkuModal';
import { ModelLayoutModal } from './ModelLayoutModal';

export interface CoreLifecyclePanelProps {
  config: CoreLifecycleConfig;
  modelId?: string;
}

export function CoreLifecyclePanel({
  config,
  modelId,
}: CoreLifecyclePanelProps) {
  const { t } = useTranslation('serials');
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: '/serials/core-config' });
  const models = useQuery(modelReferenceQueries.list());
  const [editingCore, setEditingCore] = useState<CoreSku | null>(null);
  const [editLayoutOpen, setEditLayoutOpen] = useState(false);
  const [addCampaignOpen, setAddCampaignOpen] = useState(false);
  const canEditCore =
    !!session &&
    (hasCapability(session.role, 'core_config.write') ||
      hasCapability(session.role, 'core_config.tune'));
  const selectedModelId = modelId ?? models.data?.[0]?.id;
  const layout = config.modelLayouts.find(
    (item) => item.modelId === selectedModelId
  );
  const coreName = (sku: string) =>
    config.cores.find((core) => core.sku === sku)?.name ?? sku;

  const removeCampaign = useMutation({
    mutationFn: (campaignId: string) =>
      updateCoreLifecycleConfig({
        campaigns: config.campaigns.filter((item) => item.id !== campaignId),
        changes: [
          {
            field: `campaign (${campaignId})`,
            beforeValue: t('coreLifecycle.entryExists'),
            afterValue: t('coreLifecycle.entryRemoved'),
          },
        ],
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: coreLifecycleQueries.all,
      });
    },
    onError: () => void message.error(t('editModal.error')),
  });

  return (
    <PortalCard title={t('coreLifecycle.title')}>
      <p className="mb-4 mt-0 text-sm text-[#636466]">
        {t('coreLifecycle.precedenceNote')}
      </p>
      <Tabs
        items={[
          {
            key: 'cores',
            label: t('coreLifecycle.tabs.cores'),
            children: (
              <div className="space-y-3">
                <p className="m-0 text-sm text-[#636466]">
                  {t('coreLifecycle.skuSourceNote')}
                </p>
                <Table
                  rowKey="sku"
                  size="small"
                  pagination={false}
                  scroll={{ x: true }}
                  dataSource={config.cores}
                  columns={[
                    { title: t('coreLifecycle.sku'), dataIndex: 'sku' },
                    { title: t('coreLifecycle.coreName'), dataIndex: 'name' },
                    {
                      title: t('coreLifecycle.kind'),
                      key: 'kind',
                      render: (_, row) => t(`coreLifecycle.kinds.${row.kind}`),
                    },
                    {
                      title: t('coreLifecycle.lifespan'),
                      key: 'lifespan',
                      render: (_, row) =>
                        t('coreLifecycle.lifespanValue', {
                          months: row.lifespanMonths,
                          liters: row.lifespanLiters,
                        }),
                    },
                    {
                      title: t('coreLifecycle.warningThreshold'),
                      key: 'thresholds',
                      render: (_, row) =>
                        `${row.warningLevel1Percent}% / ${row.warningLevel2Percent}%`,
                    },
                    {
                      title: t('coreLifecycle.tdsFactors'),
                      key: 'tdsFactors',
                      render: (_, row) =>
                        row.tdsFactors.length === 0
                          ? '×1'
                          : row.tdsFactors
                              .map(
                                (item) =>
                                  `${item.minPpm}–${item.maxPpm ?? '∞'}: ×${item.factor}`
                              )
                              .join('; '),
                    },
                    {
                      title: t('coreLifecycle.saleRegions'),
                      key: 'saleRegions',
                      render: (_, row) =>
                        row.saleRegions.length === 0
                          ? t('coreLifecycle.allRegions')
                          : row.saleRegions.map((region) => (
                              <Tag key={region}>{region}</Tag>
                            )),
                    },
                    ...(canEditCore
                      ? [
                          {
                            title: t('table.columns.actions'),
                            key: 'actions',
                            render: (_: unknown, row: CoreSku) => (
                              <Button
                                type="link"
                                size="small"
                                onClick={() => setEditingCore(row)}
                              >
                                {t('coreLifecycle.edit')}
                              </Button>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            ),
          },
          {
            key: 'layout',
            label: t('coreLifecycle.tabs.layout'),
            children: (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Select
                    showSearch
                    optionFilterProp="label"
                    className="w-full sm:w-96"
                    loading={models.isFetching}
                    value={selectedModelId}
                    placeholder={t('coreConfigPage.modelPickerPlaceholder')}
                    options={models.data?.map((model) => ({
                      value: model.id,
                      label: `${model.code} · ${model.name}`,
                    }))}
                    onChange={(value) =>
                      void navigate({ search: { modelId: value } })
                    }
                  />
                  {selectedModelId && (
                    <PermissionGuard capability="core_config.write">
                      <Button onClick={() => setEditLayoutOpen(true)}>
                        {t('coreLifecycle.editLayout')}
                      </Button>
                    </PermissionGuard>
                  )}
                </div>
                <p className="m-0 text-sm text-[#636466]">
                  {t('coreConfigPage.modelSourceNote')}
                </p>
                <Table
                  rowKey="position"
                  size="small"
                  pagination={false}
                  dataSource={layout?.positions ?? []}
                  locale={{ emptyText: t('coreConfigPage.empty') }}
                  columns={[
                    {
                      title: t('coreLifecycle.position'),
                      key: 'position',
                      render: (_, row) => `${row.position} · ${row.name}`,
                    },
                    {
                      title: t('coreLifecycle.compatibleSkus'),
                      key: 'compatibleSkus',
                      render: (_, row) =>
                        row.compatibleSkus.map((sku) => (
                          <Tag
                            key={sku}
                            color={sku === row.defaultSku ? 'blue' : undefined}
                          >
                            {sku} · {coreName(sku)}
                          </Tag>
                        )),
                    },
                    {
                      title: t('coreLifecycle.defaultSku'),
                      dataIndex: 'defaultSku',
                    },
                  ]}
                />
              </div>
            ),
          },
          {
            key: 'campaign',
            label: t('coreLifecycle.tabs.campaign'),
            children: (
              <div className="space-y-3">
                <PermissionGuard capability="core_config.tune">
                  <div className="flex justify-end">
                    <Button onClick={() => setAddCampaignOpen(true)}>
                      {t('coreLifecycle.addCampaign')}
                    </Button>
                  </div>
                </PermissionGuard>
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={config.campaigns}
                  columns={[
                    {
                      title: t('coreLifecycle.campaignName'),
                      dataIndex: 'name',
                      key: 'name',
                    },
                    {
                      title: t('coreLifecycle.sku'),
                      key: 'sku',
                      render: (_, row) => row.sku ?? t('coreLifecycle.allSkus'),
                    },
                    {
                      title: t('coreLifecycle.pushContent'),
                      dataIndex: 'pushContent',
                      key: 'pushContent',
                    },
                    {
                      title: t('coreLifecycle.cta'),
                      key: 'cta',
                      render: (_, row) => `${row.ctaLabel} → ${row.deeplink}`,
                    },
                    {
                      title: t('coreLifecycle.runWindow'),
                      key: 'runWindow',
                      render: (_, row) =>
                        t('coreLifecycle.effectiveWindowValue', {
                          from: formatDateTime(row.startsAt),
                          to: formatDateTime(row.endsAt),
                        }),
                    },
                    {
                      title: t('table.columns.actions'),
                      key: 'actions',
                      render: (_, row) => (
                        <PermissionGuard capability="core_config.tune">
                          <Popconfirm
                            title={t('coreLifecycle.confirmDelete')}
                            onConfirm={() => removeCampaign.mutate(row.id)}
                          >
                            <Button danger type="link" size="small">
                              {t('coreLifecycle.delete')}
                            </Button>
                          </Popconfirm>
                        </PermissionGuard>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />
      <Typography.Title level={5} className="mb-2 mt-6">
        {t('coreLifecycle.auditLog')}
      </Typography.Title>
      {config.auditLog.length === 0 ? (
        <p className="text-sm text-[#636466]">
          {t('coreLifecycle.auditLogEmpty')}
        </p>
      ) : (
        <Timeline
          items={config.auditLog.map((entry) => ({
            key: entry.id,
            children: (
              <div className="text-sm">
                <div className="font-medium">
                  {t('coreLifecycle.auditEntryTitle', {
                    field: entry.field,
                    actor: entry.actor,
                  })}
                </div>
                <div className="break-all text-xs text-[#636466]">
                  {formatDateTime(entry.changedAt)} ·{' '}
                  {t('coreLifecycle.auditEntryChange', {
                    before: entry.beforeValue,
                    after: entry.afterValue,
                  })}
                </div>
              </div>
            ),
          }))}
        />
      )}
      <CoreSkuModal
        cores={config.cores}
        core={editingCore}
        onClose={() => setEditingCore(null)}
      />
      {selectedModelId && (
        <ModelLayoutModal
          modelId={selectedModelId}
          cores={config.cores}
          modelLayouts={config.modelLayouts}
          open={editLayoutOpen}
          onClose={() => setEditLayoutOpen(false)}
        />
      )}
      <CampaignModal
        cores={config.cores}
        campaigns={config.campaigns}
        open={addCampaignOpen}
        onClose={() => setAddCampaignOpen(false)}
      />
    </PortalCard>
  );
}
