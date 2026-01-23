'use client';

import { useState, type FC, type ReactNode } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';

export interface StyledComponentsRegistryProps {
  children: ReactNode;
}

/**
 * Registry for styled-components SSR support in Next.js App Router.
 * Collects styles during server rendering and injects them into the HTML.
 */
const StyledComponentsRegistry: FC<StyledComponentsRegistryProps> = ({ children }) => {
  const [styleSheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = styleSheet.getStyleElement();
    styleSheet.instance.clearTag();
    return <>{styles}</>;
  });

  if (typeof window !== 'undefined') {
    return <>{children}</>;
  }

  return (
    <StyleSheetManager sheet={styleSheet.instance}>
      {children}
    </StyleSheetManager>
  );
};

export default StyledComponentsRegistry;
