import type { Preview } from '@storybook/react';
import React from 'react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { GlobalStyle } from '@/styles/GlobalStyle';
import { ToastProvider } from '@/components/ui/Toast';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      element: '#storybook-root',
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <GlobalStyle />
        <ToastProvider>
          <Story />
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default preview;
