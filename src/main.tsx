import { createRoot } from 'react-dom/client'
import '@/config/maintenance'
import App from './App.tsx'
import './index.css'

// [MANTENIMIENTO] Auto-activar en dev (solo si MAINTENANCE_PROTOCOL_ENABLED = true en maintenance.ts):
// import { enableMaintenanceMode, isMaintenanceModeActive } from '@/config/maintenance'
// if (import.meta.env.DEV && isMaintenanceModeActive()) {
//   void enableMaintenanceMode()
// }

createRoot(document.getElementById("root")!).render(<App />);
