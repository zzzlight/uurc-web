import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { DeviceListPage } from "./components/DeviceListPage.js";
import { LoginPage } from "./components/LoginPage.js";
import { RemoteControlPage } from "./components/RemoteControlPage.js";
import { useRemoteControlController } from "./controllers/useRemoteControlController.js";
import "./styles/index.css";

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const controller = useRemoteControlController();
  const loginPage = <LoginPage {...controller.loginPageProps} />;

  if (!controller.loggedIn) {
    return (
      <Routes>
        <Route path="/login" element={loginPage} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const deviceListPage = <DeviceListPage {...controller.deviceListPageProps} />;
  const controlPage = <RemoteControlPage {...controller.controlPageProps} />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/devices" replace />} />
      <Route path="/login" element={<Navigate to="/devices" replace />} />
      <Route path="/devices" element={deviceListPage} />
      <Route path="/devices/:deviceId/control" element={controlPage} />
      <Route path="*" element={<Navigate to="/devices" replace />} />
    </Routes>
  );
}
