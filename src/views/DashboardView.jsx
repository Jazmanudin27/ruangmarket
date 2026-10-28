import React from 'react';
import { useDeviceType } from '../hooks/useDeviceType';
import DashboardDesktopView from './desktop/DashboardDesktopView';

export default function DashboardView(props) {
  const { isMobile } = useDeviceType();

  if (isMobile) {
    // Versi mobile: bila nanti ada DashboardMobileView tinggal switch di sini
    return <DashboardDesktopView {...props} />;
  }

  return <DashboardDesktopView {...props} />;
}
