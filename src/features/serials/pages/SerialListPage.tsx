import { useState } from 'react';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Button, Tabs } from 'antd';
import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PageState } from '@/shared/components/PageState';
import {
  PortalCard,
  PortalPageHeader,
  PortalStatCard,
} from '@/shared/components/portal';

import { BatchRecallModal } from '../components/BatchRecallModal';
import { SerialBatchTable } from '../components/SerialBatchTable';
import { SerialFilters } from '../components/SerialFilters';
import { SerialIngestModal } from '../components/SerialIngestModal';
import { SerialTable } from '../components/SerialTable';
import { serialQueries } from '../queries/serialQueries';
import type { SerialBatch, SerialListFilters } from '../schemas/serialSchemas';

const defaultFilters: SerialListFilters = {
  search: '',
  page: 1,
  pageSize: 20,
};

export interface SerialListPageProps {
  filters: SerialListFilters;
}

export function SerialListPage({ filters }: SerialListPageProps) {
  const { t } = useTranslation('serials');
  const navigate = useNavigate({ from: '/serials/' });
  const { data } = useSuspenseQuery(serialQueries.list(filters));
  const batches = useQuery(serialQueries.batches());
  const [ingestOpen, setIngestOpen] = useState(false);
  const [recallTarget, setRecallTarget] = useState<SerialBatch>();

  const batchList = batches.data ?? [];
  const totalSerials = batchList.reduce((sum, batch) => sum + batch.total, 0);
  const usedSerials = batchList.reduce((sum, batch) => sum + batch.used, 0);
  const recalledBatches = batchList.filter((batch) => batch.recalledAt).length;

  const updateFilters = (changes: Partial<SerialListFilters>) => {
    void navigate({
      search: (previous) => ({ ...previous, ...changes, page: 1 }),
    });
  };

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('listPage.title')}
        description={t('listPage.description')}
        actions={
          <div className="flex gap-2">
            <Link to="/serials/core-config">
              <Button>{t('listPage.coreConfig')}</Button>
            </Link>
            <PermissionGuard capability="serial.write">
              <Button type="primary" onClick={() => setIngestOpen(true)}>
                {t('listPage.ingest')}
              </Button>
            </PermissionGuard>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PortalStatCard
          label={t('listPage.stats.total')}
          value={totalSerials}
        />
        <PortalStatCard label={t('listPage.stats.used')} value={usedSerials} />
        <PortalStatCard
          label={t('listPage.stats.recalledBatches')}
          value={recalledBatches}
        />
      </div>
      <PortalCard padded={false} className="p-4">
        <Tabs
          items={[
            {
              key: 'serials',
              label: t('tabs.serials'),
              children: (
                <div className="-mx-4">
                  <SerialFilters
                    filters={filters}
                    onChange={updateFilters}
                    onReset={() => void navigate({ search: defaultFilters })}
                  />
                  {data.items.length === 0 ? (
                    <PageState kind="empty" description={t('listPage.empty')} />
                  ) : (
                    <SerialTable
                      data={data}
                      filters={filters}
                      onPageChange={(page, pageSize) =>
                        void navigate({
                          search: (previous) => ({
                            ...previous,
                            page,
                            pageSize,
                          }),
                        })
                      }
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'batches',
              label: t('tabs.batches'),
              children: (
                <SerialBatchTable
                  batches={batchList}
                  onRecall={setRecallTarget}
                />
              ),
            },
          ]}
        />
      </PortalCard>
      <SerialIngestModal
        open={ingestOpen}
        onClose={() => setIngestOpen(false)}
      />
      <BatchRecallModal
        batch={recallTarget}
        onClose={() => setRecallTarget(undefined)}
      />
    </div>
  );
}
