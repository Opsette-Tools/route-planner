import { useEffect, useState } from 'react';
import { Modal, Form, Input, Typography, Tag, message } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import type { LatLng, Stop } from '@/types/route';
import { geocodeAddress, type GeoBias, type GeocodingResult } from '@/services/geocoding';
import AddressAutoComplete from './AddressAutoComplete';

export interface StopEdits {
  address: string;
  coords: LatLng;
  label?: string;
  timeWindow?: string;
}

interface Props {
  /** The stop being edited, or null when the modal is closed. */
  stop: Stop | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, edits: StopEdits) => void;
  /** Proximity bias for the address search (home base coords when set). */
  bias?: GeoBias;
}

/**
 * Precise stop editing — re-search the location (autocomplete or free-text),
 * rename the label, set a time window, all in one place. The drag-pin remains the
 * fast way to nudge a marker; this is the exact way to fix or replace a stop.
 *
 * Location is held as a {address, coords} pair so we never display an address that
 * doesn't match the pin. Picking a suggestion (or a successful free-text geocode)
 * updates both together.
 */
export default function EditStopModal({ stop, open, onClose, onSave, bias }: Props) {
  const [label, setLabel] = useState('');
  const [timeWindow, setTimeWindow] = useState('');
  const [location, setLocation] = useState<{ address: string; coords: LatLng } | null>(null);
  const [searching, setSearching] = useState(false);

  // Re-seed local state each time a new stop opens the modal.
  useEffect(() => {
    if (stop) {
      setLabel(stop.label ?? '');
      setTimeWindow(stop.timeWindow ?? '');
      setLocation({ address: stop.address, coords: stop.coords });
    }
  }, [stop]);

  const applyLocation = (result: GeocodingResult) => {
    setLocation({ address: result.address, coords: result.coords });
  };

  // Free-text submit (Enter without picking a suggestion) → full geocode.
  const handleSearch = async (value: string) => {
    if (!value.trim()) return;
    setSearching(true);
    const result = await geocodeAddress(value, bias);
    setSearching(false);
    if (result) applyLocation(result);
    else message.error('Address not found. Try "123 Main St, City, State".');
  };

  const handleOk = () => {
    if (!stop || !location) return;
    onSave(stop.id, {
      address: location.address,
      coords: location.coords,
      label: label.trim() || undefined,
      timeWindow: timeWindow.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal
      title="Edit stop"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="Save changes"
      okButtonProps={{ disabled: !location }}
      destroyOnHidden
    >
      <Form layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item label="Location" required style={{ marginBottom: 12 }}>
          <AddressAutoComplete
            placeholder="Search a new address to replace this stop..."
            bias={bias}
            disabled={searching}
            onSelect={applyLocation}
            onSubmitText={handleSearch}
          />
          {location && (
            <div
              style={{
                marginTop: 8, padding: '8px 10px', borderRadius: 8,
                background: 'rgba(37,99,235,0.06)', display: 'flex', gap: 8, alignItems: 'flex-start',
              }}
            >
              <EnvironmentOutlined style={{ color: '#2563EB', marginTop: 2 }} />
              <Typography.Text style={{ fontSize: 13 }}>{location.address}</Typography.Text>
            </div>
          )}
        </Form.Item>

        <Form.Item label="Label" style={{ marginBottom: 12 }}>
          <Input
            placeholder="e.g. customer name (optional)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            maxLength={60}
          />
        </Form.Item>

        <Form.Item
          label={<>Time window {timeWindow && <Tag color="blue" style={{ marginLeft: 4 }}>{timeWindow}</Tag>}</>}
          style={{ marginBottom: 0 }}
        >
          <Input
            placeholder='e.g. "9–10am" (optional)'
            value={timeWindow}
            onChange={e => setTimeWindow(e.target.value)}
            maxLength={40}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
