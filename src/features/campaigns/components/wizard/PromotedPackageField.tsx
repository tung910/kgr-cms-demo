import { ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Select, Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';

import { campaignQueries } from '../../queries/campaignQueries';
import type { PromotedPackage } from '../../schemas/campaignSchemas';
import { packagePriceLines } from '../../utils/packagePricing';

export interface PromotedPackageFieldProps {
  value?: string;
  // The package already saved on the campaign: still shown when it has left the
  // catalogue options (e.g. it was discontinued since the draft was saved).
  current?: PromotedPackage;
  onChange: (pkg: PromotedPackage | null) => void;
}

// Optional picker of the one service package a campaign promotes (spec 4.1).
// Options are the active, fully configured packages only; a failed load is
// reported with a retry, never shown as an empty list.
export function PromotedPackageField({
  value,
  current,
  onChange,
}: PromotedPackageFieldProps) {
  const { t } = useTranslation('campaigns');
  const options = useQuery(campaignQueries.packageOptions());

  if (options.isPending)
    return <Skeleton.Input active block aria-busy="true" />;

  const packages = [...(options.data ?? [])];
  if (current && !packages.some((pkg) => pkg.id === current.id))
    packages.unshift(current);

  const labelOf = (pkg: PromotedPackage) =>
    [
      pkg.code,
      pkg.name,
      packagePriceLines(pkg, null, t)[0],
      pkg.grantable ? null : t('package.field.unavailable'),
    ]
      .filter(Boolean)
      .join(' — ');

  return (
    <div className="min-w-0 space-y-2">
      {options.isError ? (
        <Alert
          type="error"
          showIcon
          title={t('package.field.loadFailed')}
          action={
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={options.isFetching}
              onClick={() => void options.refetch()}
            >
              {t('package.field.retry')}
            </Button>
          }
        />
      ) : null}
      <Select
        className="w-full min-w-0"
        popupMatchSelectWidth={false}
        showSearch={{ optionFilterProp: 'label' }}
        allowClear
        disabled={options.isError}
        aria-label={t('package.field.label')}
        placeholder={t('package.field.placeholder')}
        value={value}
        options={packages.map((pkg) => ({
          value: pkg.id,
          label: labelOf(pkg),
        }))}
        onChange={(id?: string) =>
          onChange(packages.find((pkg) => pkg.id === id) ?? null)
        }
      />
    </div>
  );
}
