import { Drawer, Input, Button, Space, Typography, message } from 'antd';
import { AimOutlined } from '@ant-design/icons';
import type { HomeBase } from '@/types/route';
import { geocodeAddress, reverseGeocode } from '@/services/geocoding';
import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  homeBase: HomeBase | null;
  onSetHomeBase: (hb: HomeBase) => void;
}

export default function SettingsDrawer({ open, onClose, homeBase, onSetHomeBase }: Props) {
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const handleSearch = async (value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    const result = await geocodeAddress(value);
    setLoading(false);
    if (result) {
      onSetHomeBase({ address: result.address, coords: result.coords });
      message.success('Home base set!');
    } else {
      message.error('Address not found');
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
        <Input.Search
          placeholder="Search address..."
          enterButton="Set"
          loading={loading}
          onSearch={handleSearch}
        />
        <Button icon={<AimOutlined />} loading={geoLoading} onClick={handleCurrentLocation} block>
          Use Current Location
        </Button>
        {homeBase && (
          <div className="mt-2 p-3 rounded-lg" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
            <Typography.Text type="success" strong>Current Home Base:</Typography.Text>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {homeBase.address}
            </Typography.Text>
          </div>
        )}
      </Space>
    </Drawer>
  );
}
