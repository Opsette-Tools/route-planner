import { Typography, Card } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { OpsetteFooterLogo } from '@/components/opsette-share';

const { Title, Paragraph, Text } = Typography;

export default function Privacy() {
  return (
    <div className="min-h-screen p-4" style={{ background: '#F8FAFC', maxWidth: 720, margin: '0 auto' }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <ArrowLeftOutlined /> Back to Route Planner
      </Link>

      <Card>
        <Typography>
          <Title level={2}>Privacy Policy</Title>
          <Text type="secondary">Last updated: April 14, 2026</Text>

          <Title level={4} style={{ marginTop: 24 }}>Overview</Title>
          <Paragraph>
            Route Planner is a client-side web application that helps you plan and optimize
            multi-stop routes. Your privacy is important to us. This policy explains what
            data the app accesses and how it is handled.
          </Paragraph>

          <Title level={4}>Data We Collect</Title>
          <Paragraph>
            <Text strong>We do not collect, store, or transmit any personal data to our servers.</Text>{' '}
            Route Planner runs entirely in your browser. There is no user account system,
            no analytics tracking, and no server-side data storage.
          </Paragraph>

          <Title level={4}>Data Stored on Your Device</Title>
          <Paragraph>
            The app uses your browser's local storage to save:
          </Paragraph>
          <ul>
            <li>Your home base address and coordinates</li>
            <li>Saved routes (up to 20)</li>
          </ul>
          <Paragraph>
            This data never leaves your device. You can clear it at any time through
            the app's settings or by clearing your browser's local storage.
          </Paragraph>

          <Title level={4}>Location Data</Title>
          <Paragraph>
            If you choose to use the "Use Current Location" feature, the app requests
            your device's geolocation through your browser. This location data is used
            only to set your home base and is stored locally on your device. Location
            access is optional and requires your explicit permission.
          </Paragraph>

          <Title level={4}>Third-Party Services</Title>
          <Paragraph>
            The app communicates with the following external services to provide its functionality:
          </Paragraph>
          <ul>
            <li>
              <Text strong>OpenStreetMap Nominatim</Text> — for geocoding addresses
              (converting addresses to coordinates). Your search queries are sent to
              this service. See the{' '}
              <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer">
                OSM Foundation Privacy Policy
              </a>.
            </li>
            <li>
              <Text strong>OSRM (Open Source Routing Machine)</Text> — for route
              calculation and optimization. Stop coordinates are sent to this service.
              See the{' '}
              <a href="https://project-osrm.org/" target="_blank" rel="noopener noreferrer">
                OSRM project page
              </a>.
            </li>
            <li>
              <Text strong>CARTO</Text> — for map tile imagery. Standard web map tile
              requests are made as you view the map.
            </li>
          </ul>

          <Title level={4}>Cookies</Title>
          <Paragraph>
            This app does not use cookies.
          </Paragraph>

          <Title level={4}>Children's Privacy</Title>
          <Paragraph>
            This app is not directed at children under 13. We do not knowingly collect
            data from children.
          </Paragraph>

          <Title level={4}>Changes to This Policy</Title>
          <Paragraph>
            We may update this policy from time to time. Changes will be reflected on
            this page with an updated date.
          </Paragraph>

          <Title level={4}>Contact</Title>
          <Paragraph>
            If you have questions about this privacy policy, please open an issue on the{' '}
            <a href="https://github.com/deebuilt/route-planner" target="_blank" rel="noopener noreferrer">
              GitHub repository
            </a>.
          </Paragraph>
        </Typography>

        <OpsetteFooterLogo />
      </Card>
    </div>
  );
}
