import React from 'react';
import { useDeviceType } from '../hooks/useDeviceType';
import MarketplaceDesktopView from './desktop/MarketplaceDesktopView';
import MarketplaceMobileView from './mobile/MarketplaceMobileView';

export default function MarketplaceView(props) {
  const { isMobile } = useDeviceType(768);

  if (isMobile) {
    return <MarketplaceMobileView {...props} />;
  }

  return <MarketplaceDesktopView {...props} />;
}
