import { useTranslation } from 'react-i18next';

import type { AudienceConditions } from '../schemas/audienceSchemas';
import { useAudienceClauses } from './useAudienceClauses';

export function AudienceSummary({
  conditions,
}: {
  conditions: AudienceConditions;
}) {
  const { t } = useTranslation('campaigns');
  const clauses = useAudienceClauses(conditions);
  if (clauses.length === 0) return <span>{t('audience.all')}</span>;
  return (
    <span className="break-words">
      {clauses.join(
        conditions.logic === 'or' ? t('audience.orJoin') : t('audience.andJoin')
      )}
    </span>
  );
}
