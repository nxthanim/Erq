import { useState, useEffect } from 'react';

/**
 * Device detection hook that identifies the current device type
 * and provides responsive utility values.
 * 
 * Returns:
 * - isMobile: screen < 768px
 * - isTablet: screen 768px - 1024px
 * - isDesktop: screen > 1024px
 * - isTouchDevice: has touch capability
 * - device: 'mobile' | 'tablet' | 'desktop'
 * - sidebarOpen: whether sidebar should be shown (desktop: always, mobile/tablet: toggle)
 * - fontSize: recommended base font size for the device
 */
export function useDeviceDetect() {
  const [device, setDevice] = useState(() => getDevice());
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  function getDevice() {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  useEffect(() => {
    // Check for touch capability
    setIsTouchDevice(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );

    // Debounced resize handler
    let timeout;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setDevice(getDevice());
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, []);

  const isMobile = device === 'mobile';
  const isTablet = device === 'tablet';
  const isDesktop = device === 'desktop';

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    device,
    fontSize: isMobile ? '14px' : isTablet ? '15px' : '16px',
  };
}

/**
 * Simplified CSS class helper — returns a Tailwind class string
 * for responsive padding/margin/gaps based on device type.
 */
export function responsivePadding(device) {
  if (device === 'mobile') return 'px-3';
  if (device === 'tablet') return 'px-5';
  return 'px-6 lg:px-8';
}

export function responsiveGap(device) {
  if (device === 'mobile') return 'gap-3';
  if (device === 'tablet') return 'gap-4';
  return 'gap-6';
}

export function responsiveGrid(device) {
  if (device === 'mobile') return 'grid-cols-1';
  if (device === 'tablet') return 'grid-cols-2';
  return 'grid-cols-2 xl:grid-cols-3';
}
