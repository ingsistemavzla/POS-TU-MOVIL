import { createRoot } from 'react-dom/client'
import {
  enableMaintenanceMode,
  isMaintenanceModeActive,
  MAINTENANCE_PROTOCOL_ENABLED,
} from '@/config/maintenance'
import App from './App.tsx'
import './index.css'

// Si el protocolo está ON y el modo activo (p. ej. FORCED_FROM_BUILD), expulsa sesiones al arrancar.
if (MAINTENANCE_PROTOCOL_ENABLED && isMaintenanceModeActive()) {
  void enableMaintenanceMode()
}

createRoot(document.getElementById("root")!).render(<App />);
