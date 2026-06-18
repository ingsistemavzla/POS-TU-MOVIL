import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const LORDICON_SCRIPT = 'https://cdn.lordicon.com/lordicon.js';
const LORDICON_SRC = 'https://cdn.lordicon.com/jzstrjoh.json';

let scriptLoadPromise: Promise<void> | null = null;

function loadLordiconScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (customElements.get('lord-icon')) return Promise.resolve();

  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LORDICON_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      setTimeout(resolve, 100);
      return;
    }
    const script = document.createElement('script');
    script.src = LORDICON_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Lordicon'));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

interface LoginLordIconProps {
  size?: number;
  className?: string;
}

/** Icono animado de ingreso (Lordicon) para el panel de login */
export function LoginLordIcon({ size = 140, className }: LoginLordIconProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    loadLordiconScript()
      .then(() => {
        if (!mounted || !containerRef.current) return;
        containerRef.current.innerHTML = '';
        const icon = document.createElement('lord-icon');
        icon.setAttribute('src', LORDICON_SRC);
        icon.setAttribute('trigger', 'hover');
        icon.setAttribute('colors', 'primary:#1e40af,secondary:#2563eb');
        icon.style.width = `${size}px`;
        icon.style.height = `${size}px`;
        containerRef.current.appendChild(icon);
      })
      .catch(() => {
        // fallback silencioso si CDN no carga
      });

    return () => {
      mounted = false;
    };
  }, [size]);

  return (
    <div
      ref={containerRef}
      className={cn('flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
