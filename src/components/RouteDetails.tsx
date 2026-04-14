import { Card, Steps, Statistic, Empty } from 'antd';
import { ClockCircleOutlined, CarOutlined } from '@ant-design/icons';
import type { RouteResult } from '@/types/route';

interface Props {
  routeResult: RouteResult | null;
  stopCount: number;
}

export default function RouteDetails({ routeResult, stopCount }: Props) {
  if (!routeResult) {
    if (stopCount === 0) return null;
    return (
      <Card size="small" className="mt-3">
        <Empty description="Press Optimize Route to see route details" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  const stepsItems = routeResult.legs.map((leg, i) => ({
    title: `${leg.from} → ${leg.to}`,
    description: `${leg.distance} mi, ~${leg.duration} min`,
    status: (leg.duration > 30 ? 'error' : 'process') as 'error' | 'process',
    icon: (
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: leg.duration > 30 ? '#faad14' : '#2563EB',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
      }}>
        {i + 1}
      </div>
    ),
  }));

  return (
    <Card size="small" className="mt-3">
      <div className="flex gap-4 mb-4">
        <Statistic
          title="Total Distance"
          value={routeResult.totalDistance}
          suffix="mi"
          prefix={<CarOutlined />}
          valueStyle={{ fontVariantNumeric: 'tabular-nums', fontSize: 24 }}
        />
        <Statistic
          title="Total Drive Time"
          value={routeResult.totalDuration}
          suffix="min"
          prefix={<ClockCircleOutlined />}
          valueStyle={{ fontVariantNumeric: 'tabular-nums', fontSize: 24 }}
        />
      </div>
      <Steps direction="vertical" size="small" items={stepsItems} current={stepsItems.length} />
    </Card>
  );
}
