import React from 'react';
import { useDeviceType } from '../hooks/useDeviceType';
import SPKDesktopView from './desktop/SPKDesktopView';

export default function SPKView(props) {
  const { isMobile } = useDeviceType();

  if (isMobile) {
    return <SPKDesktopView {...props} />;
  }

  return <SPKDesktopView {...props} />;
}
