import { HashRouter, Route, Routes } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import Index from './pages/Index';
import Privacy from './pages/Privacy';
import About from './pages/About';
import NotFound from './pages/NotFound';
import { useTheme } from '@/hooks/use-theme';

const lightToken = {
  colorPrimary: '#2563EB',
  colorBgBase: '#F8FAFC',
  colorBgContainer: '#FFFFFF',
  borderRadius: 12,
};

const darkToken = {
  colorPrimary: '#2563EB',
  colorBgBase: '#000000',
  colorBgContainer: '#141414',
  borderRadius: 12,
};

const App = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: isDark ? darkToken : lightToken,
      }}
    >
      <HashRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </ConfigProvider>
  );
};

export default App;
