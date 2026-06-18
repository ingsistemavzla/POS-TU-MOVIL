import React from 'react';
import { Package, TrendingUp } from 'lucide-react';
import { INVENTORY_SYSTEM_NAME } from '@/constants/inventorySystemBranding';

const STOCK_ROWS = [
  { sku: 'SKU-1042', qty: 48, pct: 82 },
  { sku: 'SKU-2088', qty: 12, pct: 34 },
  { sku: 'SKU-3310', qty: 156, pct: 95 },
];

export const PhoneMockup3D: React.FC = () => {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h3
          className="text-xs font-bold text-[#60A5FA] animate-neon-flicker"
          style={{ fontFamily: "'Press Start 2P', cursive" }}
        >
          MULTISTORE INVENTORY
        </h3>
      </div>

      <div
        className="relative mx-auto"
        style={{
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="border-4 border-blue-500/30 rounded-[3rem] p-4 bg-gradient-to-br from-slate-900 to-black shadow-2xl"
          style={{
            transform: 'rotateY(-10deg) rotateX(5deg)',
            width: '300px',
            height: '600px',
          }}
        >
          <div className="bg-slate-800 rounded-[2.5rem] overflow-hidden w-full h-full relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-950/25 to-slate-900 p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <span className="text-blue-400 text-xs font-semibold">{INVENTORY_SYSTEM_NAME}</span>
                <div className="flex space-x-1">
                  <div className="w-1 h-1 rounded-full bg-blue-400" />
                  <div className="w-1 h-1 rounded-full bg-blue-400" />
                  <div className="w-1 h-1 rounded-full bg-blue-400" />
                </div>
              </div>

              <div className="flex-1 bg-slate-700/50 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />

                <div className="relative z-10 flex items-center justify-between">
                  <p className="text-white/80 text-xs font-medium">Stock por sucursal</p>
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                </div>

                {STOCK_ROWS.map((row) => (
                  <div key={row.sku} className="relative z-10 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/70">{row.sku}</span>
                      <span className="text-[#60A5FA] font-semibold">{row.qty} uds.</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-600/60 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA]"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="relative z-10 mt-auto flex items-center justify-center gap-2 pt-2">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
                    <Package className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white text-sm font-semibold">3 almacenes</p>
                    <p className="text-white/50 text-xs">Sincronizados</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-slate-800/80 border border-blue-500/30 rounded-lg p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60">Movimiento</p>
                    <p className="text-sm font-bold text-[#60A5FA]">Transfer #TR-8841</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-[#60A5FA] animate-pulse" />
                </div>
              </div>

              <div className="flex justify-around items-center mt-4 pt-4 border-t border-blue-500/20">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-blue-400" />
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-700/50" />
                <div className="w-8 h-8 rounded-full bg-slate-700/50" />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute -inset-4 bg-blue-500/20 rounded-[3.5rem] blur-2xl -z-10 animate-pulse" />
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-white">{INVENTORY_SYSTEM_NAME}</h3>
        <p className="text-sm text-white/60">Control de inventario multitienda</p>
      </div>
    </div>
  );
};

export default PhoneMockup3D;
