import { Typography, Card, Space, Tag } from 'antd';
import { ArrowLeftOutlined, EnvironmentOutlined, ThunderboltOutlined, SaveOutlined, ShareAltOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export default function About() {
  return (
    <div className="min-h-screen p-4" style={{ background: '#F8FAFC', maxWidth: 720, margin: '0 auto' }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <ArrowLeftOutlined /> Back to Route Planner
      </Link>

      <Card>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <EnvironmentOutlined style={{ fontSize: 48, color: '#2563EB' }} />
          <Title level={2} style={{ marginTop: 8, marginBottom: 4 }}>Route Planner</Title>
          <Text type="secondary">Plan and optimize multi-stop routes with ease</Text>
        </div>

        <Typography>
          <Title level={4}>What is Route Planner?</Title>
          <Paragraph>
            Route Planner is a free, open-source tool for planning efficient multi-stop
            routes. Whether you're a delivery driver, field service technician, or just
            running errands around town, Route Planner helps you find the best order to
            visit all your stops and get back home.
          </Paragraph>

          <Title level={4}>Features</Title>
          <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 16 }}>
            <div>
              <ThunderboltOutlined style={{ color: '#2563EB', marginRight: 8 }} />
              <Text strong>Route Optimization</Text>
              <Text type="secondary"> — Automatically finds the most efficient order for up to 15 stops</Text>
            </div>
            <div>
              <EnvironmentOutlined style={{ color: '#2563EB', marginRight: 8 }} />
              <Text strong>Interactive Map</Text>
              <Text type="secondary"> — Visual route planning with drag-and-drop stop reordering</Text>
            </div>
            <div>
              <SaveOutlined style={{ color: '#2563EB', marginRight: 8 }} />
              <Text strong>Save & Reuse Routes</Text>
              <Text type="secondary"> — Save your favorite routes locally for quick access</Text>
            </div>
            <div>
              <ShareAltOutlined style={{ color: '#2563EB', marginRight: 8 }} />
              <Text strong>Share & Export</Text>
              <Text type="secondary"> — Copy route details or export as CSV</Text>
            </div>
          </Space>

          <Title level={4}>How It Works</Title>
          <Paragraph>
            Route Planner uses free, open-source services to provide its functionality:
          </Paragraph>
          <ul>
            <li><Text strong>Maps</Text> — powered by OpenStreetMap via CARTO tiles</li>
            <li><Text strong>Address Search</Text> — powered by OpenStreetMap Nominatim</li>
            <li><Text strong>Routing & Optimization</Text> — powered by OSRM (Open Source Routing Machine)</li>
          </ul>

          <Title level={4}>Privacy</Title>
          <Paragraph>
            All your data stays on your device. No accounts, no tracking, no cookies.
            See our <Link to="/privacy">Privacy Policy</Link> for details.
          </Paragraph>

          <Title level={4}>Open Source</Title>
          <Paragraph>
            Route Planner is open source and available on{' '}
            <a href="https://github.com/deebuilt/route-planner" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>.
            Contributions and feedback are welcome.
          </Paragraph>

          <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 16 }}>
            A business tool from Opsette Marketplace. Find more tools at{' '}
            <a href="https://opsette.io" target="_blank" rel="noopener noreferrer">opsette.io</a>.
          </Paragraph>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Space>
              <Tag>v1.0.0</Tag>
              <Text type="secondary">Built with React, Ant Design, and Leaflet</Text>
            </Space>
          </div>
        </Typography>
      </Card>
    </div>
  );
}
