import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { IonApp, setupIonicReact } from '@ionic/react';
import Home from './pages/Home';
import SiteDetailPage from './pages/SiteDetail';
import EquipmentDetailPage from './pages/EquipmentDetail';

/* Ionic 필수 및 유틸리티 CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => {
  return (
    <IonApp>
      <Router>
        <Routes>
          {/* S01 메인 지도 화면 */}
          <Route path="/home" element={<Home />} />

          {/* S02 지점 상세 화면 */}
          <Route path="/sites/:siteId" element={<SiteDetailPage />} />

          {/* S03 기구 상세 화면 */}
          <Route
            path="/sites/:siteId/equipment/:installationId"
            element={<EquipmentDetailPage />}
          />

          {/* 기본 경로 리다이렉트 */}
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
      </Router>
    </IonApp>
  );
};

export default App;