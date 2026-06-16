import { useMemo, useState } from 'react';
import { AutoComplete, Spin } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { useAddressSuggest } from '@/hooks/useAddressSuggest';
import type { GeoBias, GeocodingResult } from '@/services/geocoding';

interface Props {
  /** Called when the user picks a concrete suggestion (coords already resolved). */
  onSelect: (result: GeocodingResult) => void;
  /**
   * Called when the user submits free text without picking a suggestion (Enter on
   * a query that hasn't been geocoded yet). Lets the caller run a full search.
   */
  onSubmitText?: (text: string) => void;
  /** Proximity bias so common street names resolve near the user, not nationally. */
  bias?: GeoBias;
  placeholder?: string;
  disabled?: boolean;
  /** Render style — the map overlay variant is borderless/transparent. */
  variant?: 'overlay' | 'default';
}

export default function AddressAutoComplete({
  onSelect,
  onSubmitText,
  bias,
  placeholder = 'Search address...',
  disabled,
  variant = 'default',
}: Props) {
  const [text, setText] = useState('');
  const { suggestions, loading } = useAddressSuggest(text, bias);

  const options = useMemo(
    () =>
      suggestions.map(s => ({
        value: s.value,
        label: (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EnvironmentOutlined style={{ color: '#2563EB', flexShrink: 0 }} />
            <span style={{ fontSize: 13 }}>{s.value}</span>
          </span>
        ),
        result: s.result,
      })),
    [suggestions]
  );

  const handleSelect = (value: string) => {
    const match = suggestions.find(s => s.value === value);
    if (match) {
      onSelect(match.result);
      setText('');
    }
  };

  const handleEnter = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // If the typed text exactly matches a suggestion, prefer the resolved coords.
    const match = suggestions.find(s => s.value === trimmed);
    if (match) {
      onSelect(match.result);
    } else {
      onSubmitText?.(trimmed);
    }
    setText('');
  };

  return (
    <AutoComplete
      value={text}
      onChange={setText}
      onSelect={handleSelect}
      options={options}
      disabled={disabled}
      style={{ width: '100%' }}
      popupMatchSelectWidth={variant === 'overlay' ? 360 : true}
      notFoundContent={loading ? <Spin size="small" /> : null}
    >
      <input
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        onKeyDown={e => {
          if (e.key === 'Enter') handleEnter();
        }}
        style={
          variant === 'overlay'
            ? {
                width: '100%', padding: '8px 12px', border: 'none', outline: 'none',
                background: 'transparent', fontSize: 14, borderRadius: 8,
                opacity: disabled ? 0.6 : 1,
              }
            : {
                width: '100%', padding: '6px 11px', fontSize: 14,
                border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none',
              }
        }
      />
    </AutoComplete>
  );
}
