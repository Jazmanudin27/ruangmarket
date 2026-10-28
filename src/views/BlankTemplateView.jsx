import React from 'react';
import { useDeviceType } from '../hooks/useDeviceType';
import BlankTemplateDesktopView from './desktop/BlankTemplateDesktopView';

export default function BlankTemplateView(props) {
  const { isMobile } = useDeviceType();

  if (isMobile) {
    return <BlankTemplateDesktopView {...props} />;
  }

  return <BlankTemplateDesktopView {...props} />;
}
