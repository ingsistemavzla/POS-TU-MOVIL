import React, { useState, useEffect, useRef } from 'react';
import { GlassLoginForm } from '@/components/auth/GlassLoginForm';
import { GlassRegisterForm } from '@/components/auth/GlassRegisterForm';
import { PhoneMockup3D } from '@/components/auth/PhoneMockup3D';
import { clearAuthCache } from '@/utils/clearCache';
import { Menu, Zap, Shield, BarChart3, MapPin, Bolt, Server, Wifi } from 'lucide-react';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  const particlesRef = useRef<HTMLDivElement>(null);

  // Limpiar cache de autenticación al cargar la página de login
  useEffect(() => {
    // Limpiar cache de Supabase Auth que pueda estar corrupto
    clearAuthCache();
  }, []);

  // Crear partículas flotantes (15 partículas con configuración exacta)
  useEffect(() => {
    if (!particlesRef.current) return;

    const container = particlesRef.current;
    container.innerHTML = '';

    // Crear 15 partículas
    for (let i = 0; i < 15; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      // Tamaño aleatorio entre 2px y 8px
      const size = Math.random() * 6 + 2;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      // Posición aleatoria
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      
      // Opacidad aleatoria (muy baja)
      particle.style.opacity = `${Math.random() * 0.08 + 0.02}`;
      
      // Color (verdes aleatorios)
      const greenShade = Math.random() > 0.5 ? '0, 255, 127' : '0, 255, 0';
      particle.style.backgroundColor = `rgb(${greenShade})`;
      
      // Animación
      const duration = Math.random() * 30 + 20;
      const delay = Math.random() * 5;
      particle.style.animation = `float-particle ${duration}s linear ${delay}s infinite`;
      
      container.appendChild(particle);
    }

    // Recrear partículas en resize
    const handleResize = () => {
      if (particlesRef.current) {
        particlesRef.current.innerHTML = '';
        for (let i = 0; i < 15; i++) {
          const particle = document.createElement('div');
          particle.className = 'particle';
          const size = Math.random() * 6 + 2;
          particle.style.width = `${size}px`;
          particle.style.height = `${size}px`;
          particle.style.left = `${Math.random() * 100}%`;
          particle.style.top = `${Math.random() * 100}%`;
          particle.style.opacity = `${Math.random() * 0.08 + 0.02}`;
          const greenShade = Math.random() > 0.5 ? '0, 255, 127' : '0, 255, 0';
          particle.style.backgroundColor = `rgb(${greenShade})`;
          const duration = Math.random() * 30 + 20;
          const delay = Math.random() * 5;
          particle.style.animation = `float-particle ${duration}s linear ${delay}s infinite`;
          particlesRef.current.appendChild(particle);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      container.innerHTML = '';
    };
  }, []);

  const toggleMode = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-3 items-center gap-6 lg:gap-10 p-4 lg:p-10 overflow-hidden relative">
      {/* CAPA 0: Background Gradient Base */}
      <div className="absolute inset-0 z-0" style={{ background: 'var(--gradient-diagonal)' }} />
      
      {/* CAPA 1: Abstract Shapes (Formas Borrosas) */}
      <div className="abstract-shapes absolute inset-0 z-[1] overflow-hidden pointer-events-none">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
      </div>

      {/* CAPA 2: Tech Overlay (Fixed) */}
      <div className="tech-overlay" />
      
      {/* CAPA 3-6: Abstract Shapes Container */}
      <div className="abstract-shapes">
        {/* CAPA 3: Circuit Lines (SVG) */}
        <svg className="circuit-line" width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100,100 C200,200 300,100 400,200 C500,300 600,200 700,300 C800,400 900,300 900,500" />
          <path d="M50,800 C150,700 250,800 350,700 C450,600 550,700 650,600 C750,500 850,600 950,500" />
          <path d="M200,400 C300,500 400,400 500,500 C600,600 700,500 800,600" />
        </svg>

        {/* CAPA 4: Abstract Shapes (Círculos blur) */}
        <div className="shape shape-1" />
        <div className="shape shape-2" />

        {/* CAPA 5: Floating Particles */}
        <div ref={particlesRef} id="particles-container" />

        {/* CAPA 6: Floating Icons */}
        <div className="floating-icon" style={{ top: '20%', left: '10%' }}>
          <MapPin className="w-6 h-6" style={{ color: 'rgba(0, 255, 127, 0.4)' }} />
        </div>
        <div className="floating-icon" style={{ top: '70%', left: '80%' }}>
          <Bolt className="w-6 h-6" style={{ color: 'rgba(0, 255, 0, 0.4)' }} />
        </div>
        <div className="floating-icon" style={{ top: '40%', left: '85%' }}>
          <Server className="w-6 h-6" style={{ color: 'rgba(0, 255, 64, 0.4)' }} />
        </div>
        <div className="floating-icon" style={{ top: '80%', left: '15%' }}>
          <Wifi className="w-6 h-6" style={{ color: 'rgba(127, 255, 0, 0.4)' }} />
        </div>
      </div>

      {/* CAPA 6+: Navbar - Absolute Top */}
      <div className="absolute top-0 left-0 right-0 z-[50] flex items-center justify-between p-6 glass-navbar border-b border-emerald-500/20">
        <div className="flex items-center space-x-3">
          <img 
            src="https://galenospro.com/wp-content/uploads/2025/05/FAVICON.png" 
            alt="Logo" 
            className="h-10 w-10 object-contain"
          />
          <span className="text-white font-semibold text-lg">Tu Móvil Margarita</span>
        </div>
        <Menu className="h-6 w-6 text-[#00FF7F]" />
      </div>

      {/* CAPA 6+: COLUMN 1: Marketing (Left) */}
      <div className="hidden lg:flex flex-col justify-center items-start px-12 py-20 relative z-[10]">
        <div className="space-y-8 max-w-md">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-white leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Gestión{' '}
              <span 
                className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400"
                style={{ 
                  fontFamily: "'Impact', sans-serif",
                  fontStyle: 'italic',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                INTELIGENTE
              </span>{' '}
              de Servicios{' '}
              <span 
                className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400"
                style={{ 
                  fontFamily: "'Impact', sans-serif",
                  fontStyle: 'italic',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                TÉCNICOS
              </span>
            </h1>
            <p className="text-lg text-white/70 leading-relaxed" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Optimiza tu negocio con nuestro sistema de punto de venta multitienda. 
              Control total, reportes en tiempo real y gestión de inventario inteligente.
            </p>
          </div>

          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3 text-white/80">
              <Zap className="h-5 w-5 text-[#00FF7F]" />
              <span style={{ fontFamily: "'Poppins', sans-serif" }}>Procesamiento rápido y eficiente</span>
            </div>
            <div className="flex items-center space-x-3 text-white/80">
              <Shield className="h-5 w-5 text-[#00FF7F]" />
              <span style={{ fontFamily: "'Poppins', sans-serif" }}>Seguridad de nivel empresarial</span>
            </div>
            <div className="flex items-center space-x-3 text-white/80">
              <BarChart3 className="h-5 w-5 text-[#00FF7F]" />
              <span style={{ fontFamily: "'Poppins', sans-serif" }}>Reportes y análisis en tiempo real</span>
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <button 
              className="px-6 py-3 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-emerald-500/20"
              style={{ background: 'var(--btn-gradient)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              Características
            </button>
            <button className="px-6 py-3 bg-transparent border-2 border-[#00FF7F]/50 hover:border-[#00FF7F] text-[#00FF7F] font-semibold rounded-lg transition-all duration-300">
              Ver Demo
            </button>
          </div>
        </div>
      </div>

      {/* CAPA 6+: COLUMN 2: Glass Stage (Center) - Visible en todas las pantallas */}
      <div className="flex flex-col justify-center items-center px-6 py-20 lg:py-32 relative z-[10] col-span-1 lg:col-span-1">
        <div className="w-full max-w-md">
          {isLogin ? (
            <GlassLoginForm onToggleMode={toggleMode} />
          ) : (
            <GlassRegisterForm onToggleMode={toggleMode} />
          )}
        </div>
      </div>

      {/* CAPA 6+: COLUMN 3: Phone Mockup (Right) - Solo desktop */}
      <div className="hidden lg:flex flex-col justify-center items-center px-12 py-20 relative z-[10]">
        <PhoneMockup3D />
      </div>
    </div>
  );
};

export default AuthPage;
