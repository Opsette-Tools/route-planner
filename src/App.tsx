import { HashRouter, Route, Routes } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import Index from './pages/Index';
import Privacy from './pages/Privacy';
import About from './pages/About';
import NotFound from './pages/NotFound';

const theme = {
  token: {
    colorPrimary: '#2563EB',
    colorBgBase: '#F8FAFC',
    colorBgContainer: '#FFFFFF',
    borderRadius: 12,
  },
};

const App = () => (
  <ConfigProvider theme={theme}>
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

export default App;
