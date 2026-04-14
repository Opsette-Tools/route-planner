import { HashRouter, Route, Routes } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import Index from './pages/Index';
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  </ConfigProvider>
);

export default App;
