import { SearchOutlined } from '@ant-design/icons';
import { AutoComplete, Input, Typography } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getSearchSuggestions } from '@/features/search/api/searchApi';
import type {
  SearchSuggestGroup,
  SearchSuggestItem,
} from '@/features/search/schemas/searchSchemas';

const groupLabelKeys: Record<SearchSuggestGroup, string> = {
  customer: 'globalSearch.groupCustomer',
  device: 'globalSearch.groupDevice',
  alert: 'globalSearch.groupAlert',
};

export function PortalSearchBar() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchSuggestItem[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const abortRef = useRef<AbortController | undefined>(undefined);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    },
    []
  );

  const options = useMemo<DefaultOptionType[]>(() => {
    const groups = new Map<SearchSuggestGroup, SearchSuggestItem[]>();
    for (const item of items) {
      const bucket = groups.get(item.group) ?? [];
      bucket.push(item);
      groups.set(item.group, bucket);
    }

    return Array.from(groups.entries()).map(([group, groupItems]) => ({
      label: (
        <Typography.Text
          type="secondary"
          className="text-xs font-semibold tracking-wide"
        >
          {t(groupLabelKeys[group])}
        </Typography.Text>
      ),
      options: groupItems.map((item) => ({
        value: item.navigateTo,
        label: (
          <span>
            {item.label}
            <span className="text-neutral-400"> - {item.sublabel}</span>
          </span>
        ),
      })),
    }));
  }, [items, t]);

  const runSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (!value.trim()) {
      setItems([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      getSearchSuggestions(value, controller.signal)
        .then(setItems)
        .catch(() => setItems([]));
    }, 300);
  };

  return (
    <AutoComplete
      value={query}
      options={options}
      className="w-full max-w-md"
      popupMatchSelectWidth={360}
      onSearch={runSearch}
      onSelect={(navigateTo: string) => {
        setQuery('');
        setItems([]);
        void navigate({ to: navigateTo });
      }}
    >
      <Input
        allowClear
        prefix={<SearchOutlined className="text-neutral-400" />}
        placeholder={t('globalSearch.placeholder')}
        onClear={() => setItems([])}
      />
    </AutoComplete>
  );
}
