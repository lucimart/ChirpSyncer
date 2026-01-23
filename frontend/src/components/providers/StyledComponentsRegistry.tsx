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
 *
 * Important: Must render the same tree structure on both server and client
 * to avoid hydration mismatches.
 */
const StyledComponentsRegistry: FC<StyledComponentsRegistryProps> = ({ children }) => {
  const [styleSheet] = useState(() => new ServerStyleSheet());
  const isServerSide = typeof window === 'undefined';

  useServerInsertedHTML(() => {
    const styles = styleSheet.getStyleElement();
    styleSheet.instance.clearTag();
    return <>{styles}</>;
  });

  // Always render StyleSheetManager to maintain consistent tree structure
  // Only pass the sheet on server side for style collection
  if (isServerSide) {
    return (
      <StyleSheetManager sheet={styleSheet.instance}>
        {children}
      </StyleSheetManager>
    );
  }

  // Client side: render without sheet prop but same structure
  return <StyleSheetManager>{children}</StyleSheetManager>;
};

export default StyledComponentsRegistry;
