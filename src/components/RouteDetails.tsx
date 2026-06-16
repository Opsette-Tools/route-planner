import { Card, Statistic, Empty, Collapse, Typography } from 'antd';
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

  const hasAnySteps = routeResult.legs.some(l => l.steps?.length);

  // One unified list: each leg is a numbered, collapsible row. The header IS the
  // step (badge + "From → To" + distance/time); expanding reveals that leg's
  // turn-by-turn. No second redundant list.
  const items = routeResult.legs.map((leg, i) => {
    const longLeg = leg.duration > 30;
    return {
      key: String(i),
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            background: longLeg ? '#faad14' : '#2563EB',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
          }}>
            {i + 1}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Typography.Text style={{ fontSize: 13, fontWeight: 500 }} ellipsis>
              {leg.from} → {leg.to}
            </Typography.Text>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {leg.distance} mi · ~{leg.duration} min
            </Typography.Text>
          </div>
        </div>
      ),
      children: leg.steps?.length ? (
        <ol style={{ margin: 0, paddingLeft: 30, fontSize: 12, color: '#595959' }}>
          {leg.steps.map((s, j) => (
            <li key={j} style={{ marginBottom: 3 }}>
              {s.instruction}
              {s.distance > 0 && (
                <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                  ({s.distance} mi)
                </Typography.Text>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <Typography.Text type="secondary" style={{ fontSize: 12, paddingLeft: 30 }}>
          No turn-by-turn available for this leg.
        </Typography.Text>
      ),
    };
  });

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

      {hasAnySteps ? (
        <Collapse ghost size="small" items={items} />
      ) : (
        // No step data (rare) — show the legs as a plain non-collapsible list.
        <div>
          {items.map(it => (
            <div key={it.key} style={{ padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
              {it.label}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
