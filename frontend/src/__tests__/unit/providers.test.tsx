/**
 * Providers Component Tests
 * Tests for the main Providers wrapper component
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { Providers } from '@/components/providers/Providers';

// Mock next/dynamic to avoid SSR issues in tests
jest.mock('next/dynamic', () => {
  return function dynamic(importFn: () => Promise<any>, options: any) {
    // Return a simple component that renders nothing for CommandPalette
    return function DynamicComponent() {
      return null;
    };
  };
});

describe('Providers Component', () => {
  it('should render children', () => {
    render(
      <Providers>
        <div data-testid="child">Test Child</div>
      </Providers>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('should render multiple children', () => {
    render(
      <Providers>
        <div data-testid="child1">Child 1</div>
        <div data-testid="child2">Child 2</div>
      </Providers>
    );

    expect(screen.getByTestId('child1')).toBeInTheDocument();
    expect(screen.getByTestId('child2')).toBeInTheDocument();
  });

  it('should render nested components', () => {
    render(
      <Providers>
        <div>
          <span>Nested content</span>
        </div>
      </Providers>
    );

    expect(screen.getByText('Nested content')).toBeInTheDocument();
  });
});
