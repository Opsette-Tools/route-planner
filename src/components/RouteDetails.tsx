import { useMemo } from 'react';
import { Card, Statistic, Empty, Collapse, Typography, TimePicker, InputNumber, Space, Tag } from 'antd';
import { ClockCircleOutlined, CarOutlined, LoginOutlined, HomeOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RouteResult } from '@/types/route';
import { buildSchedule, formatClock } from '@/lib/eta';

interface Props {
  routeResult: RouteResult | null;
  stopCount: number;
  /** Departure time, minutes-from-midnight (shared with the printed sheet). */
  departureMins: number;
  onDepartureChange: (mins: number) => void;
  /** Per-stop service time, minutes. */
  dwellMins: number;
  onDwellChange: (mins: number) => void;
}

export default function RouteDetails({ routeResult, stopCount, departureMins, onDepartureChange, dwellMins, onDwellChange }: Props) {
  const departure = useMemo(
    () => dayjs().hour(Math.floor(departureMins / 60)).minute(departureMins % 60).second(0),
    [departureMins]
  );

  // Cumulative arrival/departure per waypoint, computed from leg durations.
  const schedule = useMemo(
    () => (routeResult ? buildSchedule(routeResult, departureMins, dwellMins) : null),
    [routeResult, departureMins, dwellMins]
  );

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
  // step (badge + "From → To" + distance/time + arrival clock); expanding reveals
  // that leg's turn-by-turn. A connecting rail line ties the badges together so
  // the legs read as one continuous journey rather than disconnected rows.
  const items = routeResult.legs.map((leg, i) => {
    const longLeg = leg.duration > 30;
    const isLastLeg = i === routeResult.legs.length - 1;
    // schedule.entries[0] is home/start; entries[i+1] is the arrival for leg i.
    const arrival = schedule?.entries[i + 1]?.arrival;
    return {
      key: String(i),
      label: (
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
          {/* Rail: badge + connector line down to the next leg */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: isLastLeg ? '#52c41a' : longLeg ? '#faad14' : '#2563EB',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {isLastLeg ? <HomeOutlined style={{ fontSize: 11 }} /> : i + 1}
            </span>
            {!isLastLeg && (
              <span style={{ flex: 1, width: 2, background: '#e8e8e8', marginTop: 2, minHeight: 8 }} />
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1, paddingBottom: isLastLeg ? 0 : 4 }}>
            <Typography.Text style={{ fontSize: 13, fontWeight: 500 }} ellipsis>
              {leg.from} → {leg.to}
            </Typography.Text>
            <br />
            <Space size={6} wrap>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {leg.distance} mi · ~{leg.duration} min
              </Typography.Text>
              {arrival != null && (
                <Tag
                  color={isLastLeg ? 'green' : 'blue'}
                  style={{ fontSize: 10, marginInlineEnd: 0, lineHeight: '16px' }}
                >
                  {isLastLeg ? 'back ' : 'arrive '}{formatClock(arrival)}
                </Tag>
              )}
            </Space>
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

      {/* Departure clock — drives the per-leg arrival tags above. */}
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
          padding: '8px 10px', marginBottom: 12, borderRadius: 8, background: 'rgba(37,99,235,0.06)',
        }}
      >
        <Space size={6}>
          <LoginOutlined style={{ color: '#2563EB' }} />
          <Typography.Text style={{ fontSize: 12 }}>Leave at</Typography.Text>
          <TimePicker
            value={departure}
            onChange={(v) => v && onDepartureChange(v.hour() * 60 + v.minute())}
            format="h:mm A"
            use12Hours
            minuteStep={5}
            allowClear={false}
            size="small"
            style={{ width: 110 }}
          />
        </Space>
        <Space size={6}>
          <Typography.Text style={{ fontSize: 12 }} type="secondary">Per stop</Typography.Text>
          <InputNumber
            value={dwellMins}
            onChange={(v) => onDwellChange(typeof v === 'number' ? v : 0)}
            min={0}
            max={240}
            step={5}
            size="small"
            style={{ width: 76 }}
            addonAfter="min"
          />
        </Space>
        {schedule && (
          <Typography.Text strong style={{ fontSize: 12, marginLeft: 'auto', color: '#52c41a' }}>
            Back home {formatClock(schedule.returnHome)}
          </Typography.Text>
        )}
      </div>

      {hasAnySteps ? (
        // Expand icon anchored to the right end (a deliberate "show directions"
        // affordance) and rotated on open, instead of the loose default caret.
        <Collapse
          ghost
          size="small"
          items={items}
          expandIconPosition="end"
          expandIcon={({ isActive }) => (
            <RightOutlined
              style={{ fontSize: 11, color: '#8c8c8c', transition: 'transform 0.2s', transform: `rotate(${isActive ? 90 : 0}deg)` }}
            />
          )}
        />
      ) : (
        // No step data (rare) — show the legs as a plain non-collapsible list.
        <div>
          {items.map(it => (
            <div key={it.key} style={{ padding: '6px 0' }}>
              {it.label}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
