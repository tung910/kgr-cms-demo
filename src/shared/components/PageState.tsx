import { Button, Empty, Result, Spin } from 'antd';
import { useTranslation } from 'react-i18next';

export type PageStateKind =
  'loading' | 'empty' | 'error' | 'forbidden' | 'notFound';

export interface PageStateProps {
  kind: PageStateKind;
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function PageState({
  kind,
  title,
  description,
  onRetry,
}: PageStateProps) {
  const { t } = useTranslation('common');

  if (kind === 'loading') {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (kind === 'empty') {
    return (
      <Empty description={description ?? title ?? t('pageState.noData')} />
    );
  }

  const status =
    kind === 'forbidden' ? '403' : kind === 'notFound' ? '404' : 'error';
  const fallbackTitle =
    kind === 'forbidden'
      ? t('pageState.forbiddenTitle')
      : kind === 'notFound'
        ? t('pageState.notFoundTitle')
        : t('pageState.errorTitle');

  return (
    <Result
      status={status}
      title={title ?? fallbackTitle}
      subTitle={description}
      extra={
        kind === 'error' && onRetry ? (
          <Button type="primary" onClick={onRetry}>
            {t('pageState.retry')}
          </Button>
        ) : undefined
      }
    />
  );
}
