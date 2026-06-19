import { Drawer, Button, Space, Typography, Switch, Divider, theme, message } from 'antd';
import { AimOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { HomeBase } from '@/types/route';
import { geocodeAddress, reverseGeocode, type GeocodingResult } from '@/services/geocoding';
import AddressAutoComplete from './AddressAutoComplete';
import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  homeBase: HomeBase | null;
  onSetHomeBase: (hb: HomeBase) => void;
  autoReoptimize: boolean;
  onSetAutoReoptimize: (value: boolean) => void;
}

export default function SettingsDrawer({ open, onClose, homeBase, onSetHomeBase, autoReoptimize, onSetAutoReoptimize }: Props) {
  const [geoLoading, setGeoLoading] = useState(false);
  const { token } = theme.useToken();

  // Bias home-base search toward the existing home base if one is set, else US-only.
  const bias = homeBase ? { center: homeBase.coords } : undefined;

  const applyResult = (result: GeocodingResult) => {
    onSetHomeBase({ address: result.address, coords: result.coords });
    message.success('Home base set!');
  };

  const handleSearch = async (value: string) => {
    if (!value.trim()) return;
    const result = await geocodeAddress(value, bias);
    if (result) {
      applyResult(result);
    } else {
      message.error('Address not found. Try a different format (e.g., "123 Main St, City, State").');
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      message.error('Geolocation not supported');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const addr = await reverseGeocode(coords);
        onSetHomeBase({ address: addr || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`, coords });
        setGeoLoading(false);
        message.success('Home base set to current location!');
      },
      () => {
        setGeoLoading(false);
        message.error('Unable to get location');
      }
    );
  };

  return (
    <Drawer title="Settings" open={open} onClose={onClose} placement="right" width={360}>
      <Space direction="vertical" className="w-full" size="middle">
        <Typography.Text strong>Home Base (Start & End Point)</Typography.Text>
        <AddressAutoComplete
          placeholder="Search address..."
          bias={bias}
          onSelect={applyResult}
          onSubmitText={handleSearch}
        />
        <Button icon={<AimOutlined />} loading={geoLoading} onClick={handleCurrentLocation} block>
          Use Current Location
        </Button>
        {homeBase && (
          // Success-tinted callout via theme tokens (not fixed hex) so the panel and
          // its text stay legible in both light and dark mode.
          <div
            className="mt-2 p-3 rounded-lg"
            style={{
              background: token.colorSuccessBg,
              border: `1px solid ${token.colorSuccessBorder}`,
            }}
          >
            <Typography.Text strong style={{ color: token.colorSuccessText }}>
              Current Home Base:
            </Typography.Text>
            <br />
            <Typography.Text style={{ fontSize: 12, color: token.colorText }}>
              {homeBase.address}
            </Typography.Text>
          </div>
        )}

        <Divider style={{ margin: '8px 0' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Typography.Text strong>
              <ThunderboltOutlined style={{ color: '#2563EB', marginRight: 6 }} />
              Auto-reoptimize
            </Typography.Text>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Re-run optimization automatically every time you add, remove, or move a
              stop. Off by default — each edit costs an extra routing request.
            </Typography.Text>
          </div>
          <Switch checked={autoReoptimize} onChange={onSetAutoReoptimize} />
        </div>
      </Space>
    </Drawer>
  );
}
