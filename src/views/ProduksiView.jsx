import React from 'react';
import { useDeviceType } from '../hooks/useDeviceType';
import ProduksiDesktopView from './desktop/ProduksiDesktopView';

export default function ProduksiView(props) {
  const { isMobile } = useDeviceType();

  if (isMobile) {
    return <ProduksiDesktopView {...props} />;
  }

  return <ProduksiDesktopView {...props} />;
}
