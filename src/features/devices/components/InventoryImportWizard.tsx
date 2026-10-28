import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Input,
  Modal,
  Select,
  Skeleton,
  Steps,
  Table,
  Upload,
} from 'antd';
import {
  CloudSyncOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/core/api/error';
import { downloadCsv } from '@/shared/lib/csv';
import { randomId } from '@/shared/lib/id';
import { PortalCard } from '@/shared/components/portal';
import {
  confirmInventoryImport,
  previewInventoryImport,
} from '../api/inventoryImportApi';
import { deviceQueries } from '../queries/deviceQueries';
import {
  INVENTORY_IMPORT_MAX_BYTES,
  type InventoryImportConfirmInput,
  type InventoryImportPreview,
  type InventoryImportResult,
} from '../schemas/inventoryImportSchemas';
import {
  InventoryCsvError,
  parseInventoryCsv,
} from '../utils/parseInventoryCsv';
import {
  inventoryImportBenefits,
  resolveInventoryPackages,
} from '../utils/inventoryImportSelection';
import { InventoryImportDeviceTable } from './InventoryImportDeviceTable';

export function InventoryImportWizard({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('devices');
  const queryClient = useQueryClient();
  const [modal, contextHolder] = Modal.useModal();
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState<InventoryImportPreview | null>(null);
  const [common, setCommon] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<InventoryImportResult | null>(null);
  const [resultSearch, setResultSearch] = useState('');
  const [resultPage, setResultPage] = useState(1);
  const attempt = useRef<{
    input: InventoryImportConfirmInput;
    key: string;
  } | null>(null);
  const inFlight = useRef(false);
  const packages = useQuery({
    ...deviceQueries.inventoryImportPackages(),
    enabled: preview !== null && result === null,
  });
  const options = packages.data ?? [];
  const previewMutation = useMutation({
    mutationFn: previewInventoryImport,
    onSuccess: (data) => {
      setPreview(data);
      setCommon([]);
      setOverrides({});
      setError(null);
      attempt.current = null;
    },
    onError: (cause) =>
      setError(
        cause instanceof ApiError
          ? cause.message
          : t('inventory.import.errors.unknown')
      ),
  });
  const confirmMutation = useMutation({
    mutationFn: ({
      input,
      key,
    }: {
      input: InventoryImportConfirmInput;
      key: string;
    }) => confirmInventoryImport(input, key),
    onSuccess: (data) => {
      setResult(data);
      setLocked(false);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: deviceQueries.all });
    },
    onError: (cause) => {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t('inventory.import.errors.unknown')
      );
      const uncertain =
        !(cause instanceof ApiError) ||
        ['network', 'server', 'invalidResponse', 'unknown'].includes(
          cause.kind
        );
      if (!uncertain) {
        attempt.current = null;
        setLocked(false);
        void packages.refetch();
      }
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });
  const busy =
    reading || previewMutation.isPending || confirmMutation.isPending;
  const dirty = preview !== null && result === null;
  useBlocker({
    shouldBlockFn: async () =>
      busy ||
      locked ||
      (dirty &&
        !(await modal.confirm({
          title: t('inventory.import.discardTitle'),
          content: t('inventory.import.discardDescription'),
          okText: t('inventory.import.discard'),
          cancelText: t('inventory.import.stay'),
        }))),
    enableBeforeUnload: false,
  });
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);
  const close = async () => {
    if (busy || locked) return;
    if (
      dirty &&
      !(await modal.confirm({
        title: t('inventory.import.discardTitle'),
        content: t('inventory.import.discardDescription'),
        okText: t('inventory.import.discard'),
        cancelText: t('inventory.import.stay'),
      }))
    )
      return;
    onClose();
  };
  const upload = async (file: File) => {
    if (busy) return false;
    setError(null);
    setReading(true);
    try {
      if (
        !file.name.toLowerCase().endsWith('.csv') ||
        file.size > INVENTORY_IMPORT_MAX_BYTES
      ) {
        setError(t('inventory.import.fileLimit'));
        return false;
      }
      const rows = parseInventoryCsv(await file.text());
      await previewMutation.mutateAsync({ source: 'csv', rows });
    } catch (cause) {
      if (cause instanceof InventoryCsvError)
        setError(
          t(`inventory.import.csvErrors.${cause.code}`, { line: cause.line })
        );
      else if (!(cause instanceof ApiError))
        setError(t('inventory.import.errors.unknown'));
    } finally {
      setReading(false);
    }
    return false;
  };
  const confirm = () => {
    if (!preview || inFlight.current || result) return;
    if (!attempt.current)
      attempt.current = {
        key: randomId(),
        input: {
          previewId: preview.previewId,
          assignments: preview.items.map((row) => ({
            rowId: row.rowId,
            packageIds: [
              ...resolveInventoryPackages(row.rowId, common, overrides),
            ],
          })),
        },
      };
    inFlight.current = true;
    setLocked(true);
    setError(null);
    confirmMutation.mutate(attempt.current);
  };
  const selectedIds = new Set(
    preview?.items.flatMap((row) =>
      resolveInventoryPackages(row.rowId, common, overrides)
    ) ?? []
  );
  const unavailable = [...selectedIds].some(
    (id) => !options.some((option) => option.id === id)
  );
  const packageReady = !packages.isPending && !packages.isError && !unavailable;
  const totalBenefits =
    preview?.items.reduce(
      (sum, row) =>
        sum +
        inventoryImportBenefits(
          resolveInventoryPackages(row.rowId, common, overrides),
          options
        ).length,
      0
    ) ?? 0;
  return (
    <Modal
      open
      width={1100}
      title={t('inventory.import.title')}
      onCancel={() => void close()}
      closable={!busy && !locked}
      keyboard={!busy && !locked}
      mask={{ closable: false }}
      footer={
        result ? (
          <Button type="primary" onClick={onClose}>
            {t('inventory.import.close')}
          </Button>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button disabled={busy || locked} onClick={() => void close()}>
              {t('inventory.import.cancel')}
            </Button>
            <div className="flex gap-2">
              {step > 0 ? (
                <Button
                  disabled={busy || locked}
                  onClick={() => {
                    setStep(step - 1);
                    setError(null);
                  }}
                >
                  {t('inventory.import.back')}
                </Button>
              ) : null}
              {step < 3 ? (
                <Button
                  type="primary"
                  disabled={busy || !preview || (step > 0 && !packageReady)}
                  onClick={() => setStep(step + 1)}
                >
                  {t(
                    step === 2
                      ? 'inventory.import.review'
                      : 'inventory.import.next'
                  )}
                </Button>
              ) : (
                <Button
                  type="primary"
                  loading={confirmMutation.isPending}
                  disabled={!locked && !packageReady}
                  onClick={confirm}
                >
                  {t(
                    locked && !confirmMutation.isPending
                      ? 'inventory.import.retryConfirm'
                      : 'inventory.import.confirm'
                  )}
                </Button>
              )}
            </div>
          </div>
        )
      }
    >
      {contextHolder}
      <div className="space-y-5 py-3">
        {!result ? (
          <Steps
            size="small"
            current={step}
            items={['serials', 'batch', 'devices', 'confirm'].map((key) => ({
              title: t(`inventory.import.steps.${key}`),
            }))}
          />
        ) : null}
        {error ? <Alert type="error" showIcon title={error} /> : null}
        {locked && !confirmMutation.isPending && !result ? (
          <Alert
            type="warning"
            showIcon
            title={t('inventory.import.uncertain')}
          />
        ) : null}
        {result ? (
          <>
            <Alert
              type={result.failed || result.skipped ? 'warning' : 'success'}
              showIcon
              title={t('inventory.import.resultSummary', {
                added: result.added,
                skipped: result.skipped,
                failed: result.failed,
                count: result.entitlementsAttached,
              })}
            />
            <Input.Search
              aria-label={t('inventory.import.search')}
              placeholder={t('inventory.import.search')}
              value={resultSearch}
              onChange={(event) => {
                setResultSearch(event.target.value);
                setResultPage(1);
              }}
            />
            <Table
              rowKey="rowId"
              size="small"
              dataSource={result.items.filter((row) =>
                row.serial
                  .toLocaleLowerCase()
                  .includes(resultSearch.trim().toLocaleLowerCase())
              )}
              pagination={{
                current: resultPage,
                pageSize: 10,
                onChange: setResultPage,
                showSizeChanger: false,
              }}
              scroll={{ x: 600 }}
              columns={[
                { title: t('inventory.import.serial'), dataIndex: 'serial' },
                {
                  title: t('inventory.import.result'),
                  dataIndex: 'status',
                  render: (status: string) =>
                    t(`inventory.import.statuses.${status}`),
                },
                {
                  title: t('inventory.import.detail'),
                  dataIndex: 'code',
                  render: (code: string) =>
                    t(`inventory.import.resultCodes.${code}`, {
                      defaultValue: code,
                    }),
                },
                {
                  title: t('inventory.import.benefitCount'),
                  dataIndex: 'entitlementsAttached',
                  align: 'right',
                },
              ]}
            />
          </>
        ) : (
          <>
            {step === 0 ? (
              <>
                <PortalCard title={t('inventory.import.sourceTitle')}>
                  <p className="mt-0 text-sm text-[#636466]">
                    {t('inventory.import.sourceHint')}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Upload
                      accept=".csv,text/csv"
                      beforeUpload={upload}
                      showUploadList={false}
                      disabled={busy}
                    >
                      <Button icon={<UploadOutlined />} loading={reading}>
                        {t('inventory.import.upload')}
                      </Button>
                    </Upload>
                    <Button
                      icon={<CloudSyncOutlined />}
                      loading={previewMutation.isPending && !reading}
                      disabled={busy}
                      onClick={() => {
                        setError(null);
                        previewMutation.mutate({ source: 'warehouse' });
                      }}
                    >
                      {t('inventory.import.warehouse')}
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      disabled={busy}
                      onClick={() =>
                        downloadCsv(
                          [{ serial: 'KG20260001', model: 'KGR-A100' }],
                          [
                            { header: 'serial', value: (row) => row.serial },
                            { header: 'model', value: (row) => row.model },
                          ],
                          'inventory-import-template'
                        )
                      }
                    >
                      {t('inventory.import.template')}
                    </Button>
                  </div>
                </PortalCard>
                {preview ? (
                  <Alert
                    type="info"
                    title={t('inventory.import.previewReady', {
                      count: preview.items.length,
                    })}
                  />
                ) : null}
              </>
            ) : null}
            {step > 0 ? (
              <>
                {packages.isPending ? (
                  <Skeleton active paragraph={{ rows: 3 }} />
                ) : packages.isError ? (
                  <Alert
                    type="error"
                    title={t('inventory.import.optionsError')}
                    action={
                      <Button onClick={() => void packages.refetch()}>
                        {t('inventory.import.retry')}
                      </Button>
                    }
                  />
                ) : null}
                {unavailable ? (
                  <Alert
                    type="warning"
                    title={t('inventory.import.unavailable')}
                  />
                ) : null}
              </>
            ) : null}
            {step === 1 ? (
              <PortalCard
                title={t('inventory.import.batchTitle', {
                  count: preview?.items.length ?? 0,
                })}
              >
                <p className="mt-0 text-sm text-[#636466]">
                  {t('inventory.import.batchHint')}
                </p>
                <Select
                  aria-label={t('inventory.import.batchPackages')}
                  mode="multiple"
                  showSearch
                  optionFilterProp="label"
                  className="w-full"
                  placeholder={t('inventory.import.noPackages')}
                  disabled={packages.isPending || packages.isError}
                  value={common}
                  onChange={setCommon}
                  options={options.map((option) => ({
                    value: option.id,
                    label: `${option.code} — ${option.name}`,
                  }))}
                />
                {options.length === 0 && packages.isSuccess ? (
                  <p>{t('inventory.import.noOptions')}</p>
                ) : null}
                <ul className="space-y-2 pl-4 text-sm text-[#636466]">
                  {inventoryImportBenefits(common, options).map((benefit) => (
                    <li key={benefit.id}>
                      {benefit.name} ·{' '}
                      {benefit.quota === null
                        ? t('inventory.import.timeOnly')
                        : t('inventory.import.quota', {
                            count: benefit.quota,
                          })}{' '}
                      ·{' '}
                      {benefit.termMonths === null
                        ? t('inventory.import.noTerm')
                        : t('inventory.import.term', {
                            count: benefit.termMonths,
                          })}
                    </li>
                  ))}
                </ul>
              </PortalCard>
            ) : null}
            {step === 2 ? (
              <p className="text-sm text-[#636466]">
                {t('inventory.import.editHint')}
              </p>
            ) : null}
            {step === 3 ? (
              <Alert
                type="info"
                title={t('inventory.import.reviewSummary', {
                  devices: preview?.items.length ?? 0,
                  customized: Object.keys(overrides).length,
                  count: totalBenefits,
                })}
                description={t('inventory.import.confirmHint')}
              />
            ) : null}
            {preview && step !== 1 ? (
              <InventoryImportDeviceTable
                key={preview.previewId}
                items={preview.items}
                options={options}
                common={common}
                overrides={overrides}
                mode={step === 0 ? 'serials' : step === 2 ? 'edit' : 'review'}
                disabled={
                  busy || locked || packages.isPending || packages.isError
                }
                onChange={(rowId, ids) =>
                  setOverrides((previous) => ({ ...previous, [rowId]: ids }))
                }
                onReset={(rowId) =>
                  setOverrides((previous) => {
                    const next = { ...previous };
                    delete next[rowId];
                    return next;
                  })
                }
              />
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}
