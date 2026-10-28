import React from 'react';
import { useDeviceType } from '../hooks/useDeviceType';
import KaryawanDesktopView from './desktop/KaryawanDesktopView';

export { KARYAWAN_STORAGE_KEY } from './desktop/KaryawanDesktopView';

export default function KaryawanView(props) {
  const { isMobile } = useDeviceType();

  if (isMobile) {
    return <KaryawanDesktopView {...props} />;
  }

  return <KaryawanDesktopView {...props} />;
}

