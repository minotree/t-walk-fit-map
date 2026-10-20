import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import App from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('앱을 시작할 수 없습니다.');
createRoot(root).render(
  <TDSMobileAITProvider brandPrimaryColor="#3182F6">
    <BrowserRouter><App /></BrowserRouter>
  </TDSMobileAITProvider>,
);
