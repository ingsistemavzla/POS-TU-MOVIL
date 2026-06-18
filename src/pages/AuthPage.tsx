import React, { useState, useEffect, useRef } from 'react';
import { GlassLoginForm } from '@/components/auth/GlassLoginForm';
import { GlassRegisterForm } from '@/components/auth/GlassRegisterForm';
import { PhoneMockup3D } from '@/components/auth/PhoneMockup3D';
import { clearAuthCache } from '@/utils/clearCache';
import { INVENTORY_SYSTEM_NAME } from '@/constants/inventorySystemBranding';
import { Menu, Zap, Shield, BarChart3, Package, Server, Wifi, Boxes } from 'lucide-react';

const AUTH_ACCENT = '#2563EB';
const AUTH_ACCENT_LIGHT = '#60A5FA';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clearAuthCache();
  }, []);

  useEffect(() => {
    if (!particlesRef.current) return;

    const container = particlesRef.current;

    const spawnParticles = () => {
      container.innerHTML = '';
      for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        const size = Math.random() * 6 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.opacity = `${Math.random() * 0.12 + 0.06}`;
        particle.style.backgroundColor = 'rgba(37, 99, 235, 0.45)';
        const duration = Math.random() * 30 + 20;
        const delay = Math.random() * 5;
        particle.style.animation = `float-particle ${duration}s linear ${delay}s infinite`;
        container.appendChild(particle);
      }
    };

    spawnParticles();

    const handleResize = () => spawnParticles();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      container.innerHTML = '';
    };
  }, []);

  const toggleMode = () => setIsLogin(!isLogin);

  return (
    <div className="auth-page min-h-screen w-full grid grid-cols-1 lg:grid-cols-3 items-center gap-6 lg:gap-10 p-4 lg:p-10 overflow-hidden relative">
      <div className="absolute inset-0 z-0" style={{ background: 'var(--gradient-diagonal)' }} />

      <div className="abstract-shapes absolute inset-0 z-[1] overflow-hidden pointer-events-none">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
      </div>

      <div className="tech-overlay" />

      <div className="abstract-shapes auth-page-bg-decor">
        <svg
          className="circuit-line"
          width="100%"
          height="100%"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M100,100 C200,200 300,100 400,200 C500,300 600,200 700,300 C800,400 900,300 900,500" />
          <path d="M50,800 C150,700 250,800 350,700 C450,600 550,700 650,600 C750,500 850,600 950,500" />
          <path d="M200,400 C300,500 400,400 500,500 C600,600 700,500 800,600" />
        </svg>
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div ref={particlesRef} id="particles-container" />

        <div className="floating-icon" style={{ top: '18%', left: '8%' }}>
          <Package className="w-6 h-6 text-[#2563EB]/25" />
        </div>
        <div className="floating-icon floating-icon-delay-1" style={{ top: '68%', left: '78%' }}>
          <Boxes className="w-6 h-6 text-[#60A5FA]/20" />
        </div>
        <div className="floating-icon floating-icon-delay-2" style={{ top: '38%', left: '88%' }}>
          <Server className="w-6 h-6 text-[#1d4ed8]/22" />
        </div>
        <div className="floating-icon floating-icon-delay-3" style={{ top: '82%', left: '12%' }}>
          <Wifi className="w-6 h-6 text-[#2563EB]/20" />
        </div>
      </div>

      <div className="absolute top-0 left-0 right-0 z-[50] flex items-center justify-between p-6 glass-navbar border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg border"
            style={{ background: 'rgba(37, 99, 235, 0.15)', borderColor: 'rgba(96, 165, 250, 0.35)' }}
          >
            <Package className="h-5 w-5" style={{ color: AUTH_ACCENT_LIGHT }} strokeWidth={2.25} />
          </div>
          <span className="text-white font-semibold text-lg">{INVENTORY_SYSTEM_NAME}</span>
        </div>
        <Menu className="h-6 w-6 text-white/50" />
      </div>

      <div className="hidden lg:flex flex-col justify-center items-start px-12 py-20 relative z-[10]">
        <div className="space-y-8 max-w-md">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-white leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Gestión{' '}
              <span
                className="text-transparent bg-clip-text bg-gradient-to-r from-[#60A5FA] to-[#2563EB]"
                style={{
                  fontFamily: "'Impact', sans-serif",
                  fontStyle: 'italic',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                INTELIGENTE
              </span>{' '}
              de{' '}
              <span
                className="text-transparent bg-clip-text bg-gradient-to-r from-[#60A5FA] to-[#2563EB]"
                style={{
                  fontFamily: "'Impact', sans-serif",
                  fontStyle: 'italic',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                INVENTARIO
              </span>
            </h1>
            <p className="text-lg text-white/60 leading-relaxed" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Control de stock multitienda, catálogo de productos, transferencias entre almacenes y reportes
              operativos en tiempo real.
            </p>
          </div>

          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3 text-white/70">
              <Zap className="h-5 w-5" style={{ color: `${AUTH_ACCENT}cc` }} />
              <span style={{ fontFamily: "'Poppins', sans-serif" }}>Actualización de stock en tiempo real</span>
            </div>
            <div className="flex items-center space-x-3 text-white/70">
              <Shield className="h-5 w-5" style={{ color: `${AUTH_ACCENT}cc` }} />
              <span style={{ fontFamily: "'Poppins', sans-serif" }}>Acceso seguro por roles y sucursales</span>
            </div>
            <div className="flex items-center space-x-3 text-white/70">
              <BarChart3 className="h-5 w-5" style={{ color: `${AUTH_ACCENT}cc` }} />
              <span style={{ fontFamily: "'Poppins', sans-serif" }}>Reportes de inventario y movimientos</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center items-center px-6 py-20 lg:py-32 relative z-[10] col-span-1">
        <div className="w-full max-w-md">
          {isLogin ? <GlassLoginForm onToggleMode={toggleMode} /> : <GlassRegisterForm onToggleMode={toggleMode} />}
        </div>
      </div>

      <div className="hidden lg:flex flex-col justify-center items-center px-12 py-20 relative z-[10]">
        <PhoneMockup3D />
      </div>
    </div>
  );
};

export default AuthPage;
