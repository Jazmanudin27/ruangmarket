import React from 'react';
import { useDeviceType } from '../hooks/useDeviceType';
import KategoriDesktopView from './desktop/KategoriDesktopView';

export { KATEGORI_STORAGE_KEY } from './desktop/KategoriDesktopView';

export default function KategoriView(props) {
  const { isMobile } = useDeviceType();

  if (isMobile) {
    return <KategoriDesktopView {...props} />;
  }

  return <KategoriDesktopView {...props} />;
}

