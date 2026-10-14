import { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  DatePicker,
  Input,
  Popover,
  Select,
  Slider,
  Tag,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  SlidersOutlined,
  UpOutlined,
  WarningOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs, { type Dayjs } from 'dayjs';

import { modelReferenceQueries } from '@/core/reference/modelReferenceQueries';
import { CONNECTION_STATUSES } from '@/shared/constants/connectionStatus';
import { referenceColors } from '@/theme';

import { deviceQueries } from '../queries/deviceQueries';
import type {
  CoreLifeRange,
  DeviceErrorType,
  DeviceListFilters,
  DeviceStatus,
  OfflineDurationRange,
} from '../schemas/deviceSchemas';

const regionOptions = ['Hà Nội', 'Hải Phòng', 'Đà Nẵng', 'Hồ Chí Minh'].map(
  (value) => ({ value, label: value })
);

// ---------------------------------------------------------------------------
// CoreLifeSelect
// ---------------------------------------------------------------------------

interface CoreLifeSelectProps {
  value?: CoreLifeRange;
  onChange: (value: CoreLifeRange | undefined) => void;
}

const RANGE_STEP = 5;
const RANGE_MIN = 0;
const RANGE_MAX = 100;

function parseCustomRange(value?: string): { min: number; max: number } | null {
  if (!value?.startsWith('custom:')) return null;
  const parts = value.split(':');
  if (parts.length !== 3) return null;
  const min = Number(parts[1]);
  const max = Number(parts[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return null;
  return { min, max };
}

function CoreLifeSelect({ value, onChange }: CoreLifeSelectProps) {
  const { t } = useTranslation('devices');

  const applied = parseCustomRange(value);
  const isCustom = applied !== null;
  const appliedMin = applied?.min ?? null;
  const appliedMax = applied?.max ?? null;

  const [customMin, setCustomMin] = useState<number | null>(appliedMin);
  const [customMax, setCustomMax] = useState<number | null>(appliedMax);
  const [showCustom, setShowCustom] = useState(false);

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const next = parseCustomRange(value);
    setCustomMin(next?.min ?? null);
    setCustomMax(next?.max ?? null);
    setShowCustom(false);
  }, [value]);

  const NAMED_OPTIONS = [
    { value: '10_20' as CoreLifeRange, label: t('filters.coreLifeReplace') },
    { value: '21_30' as CoreLifeRange, label: t('filters.coreLifeMonitor') },
  ];

  const currentMin = customMin ?? RANGE_MIN;
  const currentMax = customMax ?? RANGE_MAX;

  const selectValue =
    value?.startsWith('custom:') && !isCustom ? undefined : value;

  const isDirty = isCustom
    ? currentMin !== appliedMin || currentMax !== appliedMax
    : !(currentMin === RANGE_MIN && currentMax === RANGE_MAX);

  const handleSelectChange = (v: string | undefined) => {
    if (v === '__custom__') {
      setShowCustom(true);
    } else if (v === undefined) {
      setShowCustom(false);
      setCustomMin(null);
      setCustomMax(null);
      onChange(undefined);
    } else {
      setShowCustom(false);
      onChange(v as CoreLifeRange);
    }
  };

  const handleApply = () => {
    if (currentMin === RANGE_MIN && currentMax === RANGE_MAX) {
      onChange(undefined);
    } else {
      onChange(`custom:${currentMin}:${currentMax}` as CoreLifeRange);
    }
    setShowCustom(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    setShowCustom(false);
    setCustomMin(appliedMin);
    setCustomMax(appliedMax);
  };

  const customPanel = (
    <div className="w-60">
      {/* Current range badges */}
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-md bg-brand-canvas px-2 py-0.5 text-xs font-semibold text-brand-ink tabular-nums">
          {currentMin}%
        </span>
        <span className="text-[10px] text-brand-gray">–</span>
        <span className="inline-flex items-center gap-1 rounded-md bg-brand-canvas px-2 py-0.5 text-xs font-semibold text-brand-ink tabular-nums">
          {currentMax}%
        </span>
      </div>

      <Slider
        range
        min={RANGE_MIN}
        max={RANGE_MAX}
        step={RANGE_STEP}
        value={[currentMin, currentMax]}
        onChange={(v: number | number[]) => {
          if (Array.isArray(v)) {
            setCustomMin(v[0] ?? RANGE_MIN);
            setCustomMax(v[1] ?? RANGE_MAX);
          }
        }}
        tooltip={{
          formatter: (v) => `${v}%`,
          getPopupContainer: (n) => n.parentElement ?? document.body,
        }}
      />

      <div className="flex items-center justify-between text-[10px] text-brand-gray">
        <span>{RANGE_MIN}%</span>
        <span>{RANGE_MAX}%</span>
      </div>

      <div className="mt-2 flex justify-end">
        <Button
          type="primary"
          size="small"
          disabled={!isDirty}
          onClick={handleApply}
        >
          {t('filters.coreLifeApply', { defaultValue: 'Apply' })}
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      open={showCustom}
      onOpenChange={handleOpenChange}
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      content={customPanel}
    >
      <div className="w-full">
        <Select
          allowClear
          aria-label={t('filters.coreLifeAriaLabel')}
          placeholder={t('filters.coreLifePlaceholder')}
          value={selectValue}
          className="w-full"
          options={[
            ...NAMED_OPTIONS,
            {
              value: '__custom__',
              label: (
                <span className="flex items-center gap-1 italic text-brand-gray">
                  {t('filters.coreLifeCustom')} &hellip;
                </span>
              ),
            },
          ]}
          labelRender={(option) =>
            isCustom &&
            typeof option.value === 'string' &&
            option.value.startsWith('custom:')
              ? `${appliedMin}% – ${appliedMax}%`
              : option.label
          }
          onChange={handleSelectChange}
        />
      </div>
    </Popover>
  );
}

interface DeviceAdvancedPanelProps {
  filters: DeviceListFilters;
  offlineDurationOptions: Array<{ value: OfflineDurationRange; label: string }>;
  errorTypeOptions: Array<{ value: DeviceErrorType; label: string }>;
  moduleFirmwareOptions: Array<{ value: string; label: string }>;
  isFirmwareLoading: boolean;
  onApply: (applied: Partial<DeviceListFilters>) => void;
  onClear: () => void;
  onClose: () => void;
}

function DeviceAdvancedPanel({
  filters,
  offlineDurationOptions,
  errorTypeOptions,
  moduleFirmwareOptions,
  isFirmwareLoading,
  onApply,
  onClear,
  onClose,
}: DeviceAdvancedPanelProps) {
  const { t } = useTranslation('devices');
  const [draftOfflineDuration, setDraftOfflineDuration] = useState<
    OfflineDurationRange | undefined
  >(filters.offlineDuration);
  const [draftErrorType, setDraftErrorType] = useState<
    DeviceErrorType | undefined
  >(filters.errorType);
  const [draftModuleFirmware, setDraftModuleFirmware] = useState<
    string | undefined
  >(filters.moduleFirmware);
  const [draftDateRange, setDraftDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(
    filters.activatedFrom || filters.activatedTo
      ? [
          filters.activatedFrom ? dayjs(filters.activatedFrom) : null,
          filters.activatedTo ? dayjs(filters.activatedTo) : null,
        ]
      : null
  );

  const handleApply = () => {
    onApply({
      offlineDuration: draftOfflineDuration,
      errorType: draftErrorType,
      moduleFirmware: draftModuleFirmware,
      activatedFrom: draftDateRange?.[0]
        ? draftDateRange[0].format('YYYY-MM-DD')
        : undefined,
      activatedTo: draftDateRange?.[1]
        ? draftDateRange[1].format('YYYY-MM-DD')
        : undefined,
    });
  };

  const handleClear = () => {
    setDraftOfflineDuration(undefined);
    setDraftErrorType(undefined);
    setDraftModuleFirmware(undefined);
    setDraftDateRange(null);
    onClear();
  };

  return (
    <div className="rounded-xl border border-brand-lightgray bg-[#FAFBFB] p-4 shadow-sm transition-all">
      <div className="flex items-center justify-between border-b border-brand-lightgray pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <SlidersOutlined style={{ color: referenceColors.primary }} />
          <span>{t('filters.advanced')}</span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-brand-gray hover:text-brand-ink"
          onClick={onClose}
        >
          {t('filters.closeAdvanced')} <UpOutlined />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3.5 pt-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Offline Duration */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-gray">
            {t('filters.offlineDurationLabel')}
          </label>
          <Select
            allowClear
            prefix={<ClockCircleOutlined className="text-brand-gray" />}
            placeholder={t('filters.offlineDurationPlaceholder')}
            value={draftOfflineDuration}
            options={offlineDurationOptions}
            className="w-full"
            onChange={(value) => setDraftOfflineDuration(value)}
          />
        </div>

        {/* 2. Error Type */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-gray">
            {t('filters.errorTypeLabel')}
          </label>
          <Select
            showSearch={{
              filterOption: (input, option) =>
                (option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            }}
            allowClear
            prefix={<WarningOutlined className="text-brand-gray" />}
            placeholder={t('filters.errorTypePlaceholder')}
            value={draftErrorType}
            options={errorTypeOptions}
            className="w-full"
            onChange={(value) => setDraftErrorType(value)}
          />
        </div>

        {/* 3. Module Version */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-gray">
            {t('filters.moduleFirmwareLabel')}
          </label>
          <Select
            showSearch={{
              filterOption: (input, option) =>
                (option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            }}
            allowClear
            prefix={<AppstoreOutlined className="text-brand-gray" />}
            placeholder={t('filters.moduleFirmwarePlaceholder')}
            value={draftModuleFirmware}
            options={moduleFirmwareOptions}
            loading={isFirmwareLoading}
            className="w-full"
            onChange={(value) => setDraftModuleFirmware(value)}
          />
        </div>

        {/* 4. Activation Date Range */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-gray">
            {t('filters.activatedDateLabel')}
          </label>
          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            placeholder={[t('filters.dateFrom'), t('filters.dateTo')]}
            prefix={<CalendarOutlined className="text-brand-gray" />}
            value={draftDateRange}
            className="w-full"
            onChange={(dates) => setDraftDateRange(dates)}
          />
        </div>
      </div>

      {/* Panel Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-brand-lightgray pt-3 mt-3">
        <Button onClick={handleClear}>{t('filters.clearAdvanced')}</Button>
        <Button type="primary" icon={<FilterOutlined />} onClick={handleApply}>
          {t('filters.apply')}
        </Button>
      </div>
    </div>
  );
}

export interface DeviceFiltersProps {
  filters: DeviceListFilters;
  onChange: (changes: Partial<DeviceListFilters>) => void;
  onReset: () => void;
}

export function DeviceFilters({
  filters,
  onChange,
  onReset,
}: DeviceFiltersProps) {
  const { t } = useTranslation('devices');
  const models = useQuery(modelReferenceQueries.list());
  const firmwareOptionsQuery = useQuery(deviceQueries.firmwareOptions());

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const modelOptions = models.data?.map((model) => ({
    value: model.code,
    label: model.code,
  }));

  const coreLifeNamedLabels: Record<string, string> = {
    '10_20': t('filters.coreLifeReplace'),
    '21_30': t('filters.coreLifeMonitor'),
  };

  const getCoreLifeChipLabel = (v: CoreLifeRange): string => {
    if (coreLifeNamedLabels[v]) return coreLifeNamedLabels[v];
    const parts = v.split(':');
    if (parts.length === 3) return `${parts[1]}%–${parts[2]}%`;
    return v;
  };

  const offlineDurationOptions: Array<{
    value: OfflineDurationRange;
    label: string;
  }> = [
    { value: 'under_30m', label: t('filters.offlineDurationUnder30m') },
    { value: '30m_2h', label: t('filters.offlineDuration30m2h') },
    { value: '2h_24h', label: t('filters.offlineDuration2h24h') },
    { value: 'above_24h', label: t('filters.offlineDurationAbove24h') },
  ];

  const errorTypeOptions: Array<{ value: DeviceErrorType; label: string }> = [
    { value: 'connectivity', label: t('filters.errorTypeConnectivity') },
    { value: 'waterLeak', label: t('filters.errorTypeWaterLeak') },
    { value: 'other', label: t('filters.errorTypeOther') },
  ];

  const moduleFirmwareOptions =
    firmwareOptionsQuery.data?.moduleVersions.map((version) => ({
      value: version,
      label: version,
    })) ?? [];

  const activeAdvancedCount = [
    filters.offlineDuration,
    filters.errorType,
    filters.moduleFirmware,
    filters.activatedFrom || filters.activatedTo,
  ].filter(Boolean).length;

  const handleClearAdvanced = () => {
    onChange({
      offlineDuration: undefined,
      errorType: undefined,
      moduleFirmware: undefined,
      activatedFrom: undefined,
      activatedTo: undefined,
    });
  };

  const hasAnyFilterActive =
    Boolean(filters.search) ||
    Boolean(filters.model) ||
    Boolean(filters.region) ||
    Boolean(filters.status) ||
    Boolean(filters.coreLife) ||
    activeAdvancedCount > 0;

  return (
    <div className="space-y-3 border-b border-brand-lightgray p-4">
      {/* Row 1: Primary Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        {/* Search */}
        <div className="w-full flex-1 min-w-[240px]">
          <Input.Search
            key={filters.search}
            allowClear
            aria-label={t('filters.searchAriaLabel')}
            defaultValue={filters.search}
            placeholder={t('filters.searchPlaceholder')}
            className="w-full"
            onSearch={(search) => onChange({ search })}
          />
        </div>

        {/* Model */}
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-semibold text-brand-gray">
            {t('filters.modelLabel')}
          </label>
          <Select
            allowClear
            aria-label={t('filters.modelAriaLabel')}
            placeholder={t('filters.modelPlaceholder')}
            value={filters.model}
            options={modelOptions}
            loading={models.isFetching}
            className="w-full"
            onChange={(model) => onChange({ model })}
          />
        </div>

        {/* Region */}
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-semibold text-brand-gray">
            {t('filters.regionLabel')}
          </label>
          <Select
            allowClear
            aria-label={t('filters.regionAriaLabel')}
            placeholder={t('filters.regionPlaceholder')}
            value={filters.region}
            options={regionOptions}
            className="w-full"
            onChange={(region) => onChange({ region })}
          />
        </div>

        {/* Core Life */}
        <div className="w-full sm:w-56">
          <label className="mb-1 block text-xs font-semibold text-brand-gray">
            {t('filters.coreLifeLabel')}
          </label>
          <CoreLifeSelect
            value={filters.coreLife}
            onChange={(coreLife) => onChange({ coreLife })}
          />
        </div>
      </div>

      {/* Row 2: Status & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-brand-ink">
            {t('filters.statusLabel')}
          </span>
          <div className="inline-flex rounded-full bg-brand-canvas p-1">
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !filters.status
                  ? 'bg-white font-semibold text-brand-ink shadow-sm'
                  : 'text-brand-gray hover:text-brand-ink'
              }`}
              onClick={() => onChange({ status: undefined })}
            >
              {t('filters.statusAll')}
            </button>
            {CONNECTION_STATUSES.map(({ value, labelKey }) => {
              const isSelected = filters.status === value;
              const dotColor =
                value === 'online'
                  ? referenceColors.primary
                  : value === 'warning'
                    ? referenceColors.danger
                    : '#636466';
              return (
                <button
                  key={value}
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-white font-semibold text-brand-ink shadow-sm'
                      : 'text-brand-gray hover:text-brand-ink'
                  }`}
                  onClick={() => onChange({ status: value as DeviceStatus })}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: dotColor }}
                  />
                  {t(labelKey, { ns: 'common' })}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            icon={<SlidersOutlined />}
            onClick={() => setIsAdvancedOpen((previous) => !previous)}
            className="inline-flex items-center"
          >
            {t('filters.advanced')}
            {activeAdvancedCount > 0 ? (
              <Badge
                count={activeAdvancedCount}
                className="ml-1.5"
                style={{ backgroundColor: referenceColors.primary }}
              />
            ) : null}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={onReset}
            className="inline-flex items-center"
          >
            {t('filters.reset')}
          </Button>
        </div>
      </div>

      {/* Row 3: Collapsible Advanced Filters Panel */}
      {isAdvancedOpen ? (
        <DeviceAdvancedPanel
          key={`${filters.offlineDuration ?? ''}-${filters.errorType ?? ''}-${filters.moduleFirmware ?? ''}-${filters.activatedFrom ?? ''}-${filters.activatedTo ?? ''}`}
          filters={filters}
          offlineDurationOptions={offlineDurationOptions}
          errorTypeOptions={errorTypeOptions}
          moduleFirmwareOptions={moduleFirmwareOptions}
          isFirmwareLoading={firmwareOptionsQuery.isFetching}
          onApply={(applied) => onChange(applied)}
          onClear={handleClearAdvanced}
          onClose={() => setIsAdvancedOpen(false)}
        />
      ) : null}

      {/* Row 4: Applied Filter Chips */}
      {hasAnyFilterActive ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {filters.search ? (
            <Tag
              closable
              onClose={() => onChange({ search: '' })}
              className="rounded-md border-brand-lightgray bg-white px-2 py-1 text-xs"
            >
              {t('filters.chips.search', { value: filters.search })}
            </Tag>
          ) : null}

          {filters.model ? (
            <Tag
              closable
              onClose={() => onChange({ model: undefined })}
              className="rounded-md border-brand-lightgray bg-white px-2 py-1 text-xs"
            >
              {t('filters.chips.model', { value: filters.model })}
            </Tag>
          ) : null}

          {filters.region ? (
            <Tag
              closable
              onClose={() => onChange({ region: undefined })}
              className="rounded-md border-brand-lightgray bg-white px-2 py-1 text-xs"
            >
              {t('filters.chips.region', { value: filters.region })}
            </Tag>
          ) : null}

          {filters.status ? (
            <Tag
              closable
              onClose={() => onChange({ status: undefined })}
              className="rounded-md border-brand-lightgray bg-white px-2 py-1 text-xs"
            >
              {t('filters.chips.status', {
                value: t(`connectionStatus.${filters.status}`, {
                  ns: 'common',
                }),
              })}
            </Tag>
          ) : null}

          {filters.coreLife ? (
            <Tag
              closable
              onClose={() => onChange({ coreLife: undefined })}
              className="rounded-md border-brand-lightgray bg-white px-2 py-1 text-xs"
            >
              {t('filters.chips.coreLife', {
                value: getCoreLifeChipLabel(filters.coreLife),
              })}
            </Tag>
          ) : null}

          {filters.offlineDuration ? (
            <Tag
              closable
              onClose={() => onChange({ offlineDuration: undefined })}
              className="rounded-md border-brand-lightgray bg-white px-2 py-1 text-xs"
            >
              {t('filters.chips.offlineDuration', {
                value:
                  offlineDurationOptions.find(
                    (o) => o.value === filters.offlineDuration
                  )?.label ?? filters.offlineDuration,
              })}
            </Tag>
          ) : null}

          {filters.errorType ? (
            <Tag
              closable
              onClose={() => onChange({ errorType: undefined })}
              className="rounded-md border-brand-lightgray bg-white px-2 py-1 text-xs"
            >
              {t('filters.chips.errorType', {
                value:
                  errorTypeOptions.find((o) => o.value === filters.errorType)
                    ?.label ?? filters.errorType,
              })}
            </Tag>
          ) : null}

          {filters.moduleFirmware ? (
            <Tag
              closable
              onClose={() => onChange({ moduleFirmware: undefined })}
              className="rounded-md border-brand-lightgray bg-white px-2 py-1 text-xs"
            >
              {t('filters.chips.moduleFirmware', {
                value: filters.moduleFirmware,
              })}
            </Tag>
          ) : null}

          {filters.activatedFrom || filters.activatedTo ? (
            <Tag
              closable
              onClose={() =>
                onChange({
                  activatedFrom: undefined,
                  activatedTo: undefined,
                })
              }
              className="rounded-md border-brand-lightgray bg-white px-2 py-1 text-xs"
            >
              {t('filters.chips.activatedDate', {
                value: `${filters.activatedFrom ? dayjs(filters.activatedFrom).format('DD/MM/YYYY') : '...'} → ${filters.activatedTo ? dayjs(filters.activatedTo).format('DD/MM/YYYY') : '...'}`,
              })}
            </Tag>
          ) : null}

          <Button
            type="link"
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={onReset}
            className="text-xs text-brand-orange hover:text-brand-orange/80"
          >
            {t('filters.clearAll')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
