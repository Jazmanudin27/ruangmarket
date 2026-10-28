import { useState, useEffect } from 'react';

/**
 * Hook pendeteksi ukuran layar secara realtime.
 * Breakpoint: < 768px dianggap Mobile, >= 768px Desktop.
 */
export function useDeviceType(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return {
    isMobile,
    isDesktop: !isMobile
  };
}
