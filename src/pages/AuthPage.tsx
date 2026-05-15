import React, { useState, useEffect, useRef } from 'react';
import { GlassLoginForm } from '@/components/auth/GlassLoginForm';
import { GlassRegisterForm } from '@/components/auth/GlassRegisterForm';
import { PhoneMockup3D } from '@/components/auth/PhoneMockup3D';
import { clearAuthCache } from '@/utils/clearCache';
import { Menu, Zap, Shield, BarChart3, LogIn, MapPin, Bolt, Server, Wifi } from 'lucide-react';

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
        particle.style.backgroundColor = 'rgba(22, 120, 60, 0.55)';
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
          <MapPin className="w-6 h-6 text-[#16c72e]/25" />
        </div>
        <div className="floating-icon floating-icon-delay-1" style={{ top: '68%', left: '78%' }}>
          <Bolt className="w-6 h-6 text-[#16c72e]/20" />
        </div>
        <div className="floating-icon floating-icon-delay-2" style={{ top: '38%', left: '88%' }}>
          <Server className="w-6 h-6 text-[#0d8a32]/22" />
        </div>
        <div className="floating-icon floating-icon-delay-3" style={{ top: '82%', left: '12%' }}>
          <Wifi className="w-6 h-6 text-[#16c72e]/20" />
        </div>
      </div>

      <div className="absolute top-0 left-0 right-0 z-[50] flex items-center justify-between p-6 glass-navbar border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0a5c15]/40 border border-[#16c72e]/25">
            <LogIn className="h-5 w-5 text-[#16c72e]" strokeWidth={2.25} />
          </div>
          <span className="text-white font-semibold text-lg">Tu Móvil Margarita</span>
        </div>
        <Menu className="h-6 w-6 text-white/50" />
      </div>

      <div className="hidden lg:flex flex-col justify-center items-start px-12 py-20 relative z-[10]">
        <div className="space-y-8 max-w-md">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-white leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Gestión{' '}
              <span
                className="text-transparent bg-clip-text bg-gradient-to-r from-[#16c72e] to-[#0d8a32]"
                style={{
                  fontFamily: "'Impact', sans-serif",
                  fontStyle: 'italic',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                INTELIGENTE
              </span>{' '}
              de Servicios{' '}
              <span
                className="text-transparent bg-clip-text bg-gradient-to-r from-[#16c72e] to-[#0d8a32]"
                style={{
                  fontFamily: "'Impact', sans-serif",
                  fontStyle: 'italic',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                TÉCNICOS
              </span>
            </h1>
            <p className="text-lg text-white/60 leading-relaxed" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Optimiza tu negocio con nuestro sistema de punto de venta multitienda. Control total, reportes en
              tiempo real y gestión de inventario inteligente.
            </p>
          </div>

          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3 text-white/70">
              <Zap className="h-5 w-5 text-[#16c72e]/80" />
              <span style={{ fontFamily: "'Poppins', sans-serif" }}>Procesamiento rápido y eficiente</span>
            </div>
            <div className="flex items-center space-x-3 text-white/70">
              <Shield className="h-5 w-5 text-[#16c72e]/80" />
              <span style={{ fontFamily: "'Poppins', sans-serif" }}>Seguridad de nivel empresarial</span>
            </div>
            <div className="flex items-center space-x-3 text-white/70">
              <BarChart3 className="h-5 w-5 text-[#16c72e]/80" />
              <span style={{ fontFamily: "'Poppins', sans-serif" }}>Reportes y análisis en tiempo real</span>
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              className="px-6 py-3 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-black/30"
              style={{ background: 'var(--btn-gradient)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              Características
            </button>
            <button
              type="button"
              className="px-6 py-3 bg-transparent border border-[#16c72e]/35 hover:border-[#16c72e]/60 text-[#16c72e]/90 font-semibold rounded-lg transition-all duration-300"
            >
              Ver Demo
            </button>
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
