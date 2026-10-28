import React from 'react';
import { useDeviceType } from '../hooks/useDeviceType';
import ProdukMarketplaceDesktopView from './desktop/ProdukMarketplaceDesktopView';
import ProdukMarketplaceMobileView from './mobile/ProdukMarketplaceMobileView';

export default function ProdukMarketplaceView(props) {
  const { isMobile } = useDeviceType(768);

  if (isMobile) {
    return <ProdukMarketplaceMobileView {...props} />;
  }

  return <ProdukMarketplaceDesktopView {...props} />;
}
