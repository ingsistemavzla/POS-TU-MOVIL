import React from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'CARGANDO',
  fullScreen = true,
  className
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        fullScreen ? 'fixed inset-0 z-[9999]' : 'min-h-[400px]',
        className
      )}
      style={{
        backgroundColor: '#F2F2F2'
      }}
    >
      <div className="relative flex flex-col items-center justify-center">
        {/* Contenedor relativo para centrar anillos e icono */}
        <div className="relative w-44 h-44 flex items-center justify-center">
          {/* Anillo Orbital Externo */}
          <div
            className="absolute w-44 h-44 rounded-full"
            style={{
              borderWidth: '3px',
              borderColor: 'rgba(48, 217, 107, 0.3)',
              borderTopColor: '#30D96B',
              borderRightColor: '#30D96B',
              animation: 'spin-outer 8s linear infinite',
              boxShadow: '0 0 21px rgba(48, 217, 107, 0.4), inset 0 0 21px rgba(48, 217, 107, 0.2)'
            }}
          />

          {/* Anillo Orbital Interno */}
          <div
            className="absolute rounded-full"
            style={{
              width: '134px',
              height: '134px',
              borderWidth: '3px',
              borderColor: 'rgba(100, 242, 61, 0.3)',
              borderBottomColor: '#64F23D',
              borderLeftColor: '#30D96B',
              animation: 'spin-inner 3s linear infinite reverse',
              boxShadow: '0 0 14px rgba(100, 242, 61, 0.5)'
            }}
          />

          {/* Icono Activity - Centrado en el mismo punto que los anillos */}
          <Activity
            className="w-11 h-11 relative z-10"
            style={{
              animation: 'alive-element 2s ease-in-out infinite'
            }}
          />
        </div>

        {/* Textos */}
        <div className="mt-8 text-center space-y-3">
          {/* Título "CARGANDO" */}
          <h2
            className="text-xl font-bold uppercase"
            style={{
              color: '#022601',
              letterSpacing: '0.2em'
            }}
          >
            {message}
          </h2>

          {/* Badge con punto parpadeante y "CONECTANDO..." */}
          <div className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 shadow-lg">
            {/* Punto parpadeante */}
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: '#30D96B',
                animation: 'ping-pulse 1.5s ease-in-out infinite'
              }}
            />

            {/* Texto "CONECTANDO..." */}
            <span
              className="text-xs font-medium uppercase"
              style={{
                animation: 'alive-element 2s ease-in-out infinite'
              }}
            >
              CONECTANDO...
            </span>
          </div>
        </div>

        {/* Estilos de Animación Inyectados */}
        <style>{`
          @keyframes spin-outer {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes spin-inner {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes alive-element {
            0%, 100% {
              color: #022601;
              transform: scale(1);
              opacity: 0.8;
              filter: drop-shadow(0 0 0px rgba(48, 217, 107, 0));
            }
            50% {
              color: #30D96B;
              transform: scale(1.15);
              opacity: 1;
              filter: drop-shadow(0 0 10px rgba(48, 217, 107, 0.8));
            }
          }

          @keyframes ping-pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.5;
              transform: scale(1.2);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default LoadingScreen;
