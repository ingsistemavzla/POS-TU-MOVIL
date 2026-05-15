import { createRoot } from 'react-dom/client'
import { enableMaintenanceMode, isMaintenanceModeActive } from '@/config/maintenance'
import App from './App.tsx'
import './index.css'

// En local: activar mantenimiento al arrancar si .env.local o consola lo piden
if (import.meta.env.DEV && isMaintenanceModeActive()) {
  void enableMaintenanceMode()
}

createRoot(document.getElementById("root")!).render(<App />);
