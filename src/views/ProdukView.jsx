import React from 'react';
import { useDeviceType } from '../hooks/useDeviceType';
import ProdukDesktopView from './desktop/ProdukDesktopView';

export default function ProdukView(props) {
  const { isMobile } = useDeviceType();

  if (isMobile) {
    return <ProdukDesktopView {...props} />;
  }

  return <ProdukDesktopView {...props} />;
}
