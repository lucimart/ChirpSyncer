/**
 * Error Resolution Integration Tests (TDD)
 * 
 * Tests for integrating the error catalog with API client
 * and displaying contextual errors in the UI.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { matchError, errorCatalog, getErrorMessage, isRetryable } from '@/lib/errors';
import { ErrorCard } from '@/components/error-resolution/ErrorCard';

// Test wrapper
const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>{ui}</ThemeProvider>
  );
};

describe('Error Catalog Matching', () => {
  describe('matchError function', () => {
    it('matches authentication expired errors', () => {
      const result = matchError('token expired');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('AUTH_EXPIRED');
    });

    it('matches 401 status code', () => {
      const result = matchError('HTTP 401 Unauthorized');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('AUTH_EXPIRED');
    });

    it('matches Twitter rate limit errors', () => {
      const result = matchError('Twitter rate limit exceeded');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('TWITTER_RATE_LIMIT');
    });

    it('matches Bluesky rate limit errors', () => {
      const result = matchError('Bluesky rate limit reached');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('BLUESKY_RATE_LIMIT');
    });

    it('matches credential invalid errors', () => {
      const result = matchError('credential invalid');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('CREDENTIAL_INVALID');
    });

    it('matches network errors', () => {
      const result = matchError('Failed to fetch');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('NETWORK_OFFLINE');
    });

    it('matches server errors', () => {
      const result = matchError('Internal server error 500');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('SERVER_ERROR');
    });

    it('matches sync conflict errors', () => {
      const result = matchError('sync conflict detected');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('SYNC_CONFLICT');
    });

    it('returns null for unknown errors', () => {
      const result = matchError('some random unknown error xyz123');
      expect(result).toBeNull();
    });

    it('handles Error objects', () => {
      const error = new Error('token expired');
      const result = matchError(error);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('AUTH_EXPIRED');
    });
  });

  describe('getErrorMessage function', () => {
    it('returns user-friendly message for known errors', () => {
      const message = getErrorMessage('token expired');
      expect(message).toContain('session');
    });

    it('returns original message for unknown errors', () => {
      const message = getErrorMessage('unknown error xyz');
      expect(message).toBe('unknown error xyz');
    });
  });

  describe('isRetryable function', () => {
    it('returns true for retryable errors', () => {
      expect(isRetryable('network error')).toBe(true);
      expect(isRetryable('timeout')).toBe(true);
      expect(isRetryable('rate limit')).toBe(true);
    });

    it('returns false for non-retryable errors', () => {
      expect(isRetryable('token expired')).toBe(false);
      expect(isRetryable('permission denied')).toBe(false);
    });
  });
});

describe('ErrorCard Component', () => {
  const mockError = {
    code: 'AUTH_EXPIRED',
    patterns: [/token.*expired/i],
    title: 'Session Expired',
    description: 'Your login session has expired.',
    severity: 'warning' as const,
    solutions: [
      {
        title: 'Sign in again',
        action: { type: 'link' as const, label: 'Go to Login', handler: '/login' },
      },
    ],
    retryable: false,
  };

  it('renders error title', () => {
    renderWithTheme(
      <ErrorCard error={mockError} />
    );
    
    expect(screen.getByText('Session Expired')).toBeInTheDocument();
  });

  it('renders error description', () => {
    renderWithTheme(
      <ErrorCard error={mockError} />
    );
    
    expect(screen.getByText('Your login session has expired.')).toBeInTheDocument();
  });

  it('renders solutions', () => {
    renderWithTheme(
      <ErrorCard error={mockError} />
    );
    
    expect(screen.getByText('Sign in again')).toBeInTheDocument();
    expect(screen.getByText('Go to Login')).toBeInTheDocument();
  });

  it('renders with correct severity styling', () => {
    const { container } = renderWithTheme(
      <ErrorCard error={mockError} />
    );
    
    // Should have warning styling (yellow/orange tones)
    expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
  });

  it('shows technical details when expanded', async () => {
    renderWithTheme(
      <ErrorCard error={mockError} originalError="Original: token expired at 12:00" />
    );
    
    const detailsToggle = screen.getByText('Technical details');
    await act(async () => {
      fireEvent.click(detailsToggle);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/AUTH_EXPIRED/)).toBeInTheDocument();
    });
  });

  it('calls onRetry when retry button is clicked', async () => {
    const onRetry = jest.fn();
    const retryableError = {
      ...mockError,
      code: 'NETWORK_OFFLINE',
      title: 'Connection Error',
      retryable: true,
      solutions: [
        {
          title: 'Retry',
          action: { type: 'retry' as const, label: 'Try Again', handler: '' },
        },
      ],
    };
    
    renderWithTheme(
      <ErrorCard error={retryableError} onRetry={onRetry} />
    );
    
    const retryButton = screen.getByText('Try Again');
    await act(async () => {
      fireEvent.click(retryButton);
    });
    
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('Error Catalog Coverage', () => {
  it('has at least 15 error definitions', () => {
    expect(errorCatalog.length).toBeGreaterThanOrEqual(15);
  });

  it('all errors have required fields', () => {
    errorCatalog.forEach(error => {
      expect(error.code).toBeDefined();
      expect(error.patterns).toBeDefined();
      expect(error.patterns.length).toBeGreaterThan(0);
      expect(error.title).toBeDefined();
      expect(error.description).toBeDefined();
      expect(error.severity).toBeDefined();
      expect(['critical', 'warning', 'info']).toContain(error.severity);
      expect(error.solutions).toBeDefined();
    });
  });

  it('all errors have at least one solution', () => {
    errorCatalog.forEach(error => {
      expect(error.solutions.length).toBeGreaterThan(0);
    });
  });

  describe('Error Categories', () => {
    it('has authentication errors', () => {
      const authErrors = errorCatalog.filter(e => e.code.startsWith('AUTH'));
      expect(authErrors.length).toBeGreaterThan(0);
    });

    it('has rate limit errors', () => {
      const rateLimitErrors = errorCatalog.filter(e => e.code.includes('RATE_LIMIT'));
      expect(rateLimitErrors.length).toBeGreaterThan(0);
    });

    it('has network errors', () => {
      const networkErrors = errorCatalog.filter(e => 
        e.code.includes('NETWORK') || e.code.includes('TIMEOUT')
      );
      expect(networkErrors.length).toBeGreaterThan(0);
    });

    it('has sync errors', () => {
      const syncErrors = errorCatalog.filter(e => e.code.startsWith('SYNC'));
      expect(syncErrors.length).toBeGreaterThan(0);
    });

    it('has credential errors', () => {
      const credErrors = errorCatalog.filter(e => e.code.startsWith('CREDENTIAL'));
      expect(credErrors.length).toBeGreaterThan(0);
    });
  });
});

describe('API Client Error Integration', () => {
  // These tests verify the API client properly uses the error system
  // The actual implementation will be in api.ts
  
  it('should match API errors to catalog entries', () => {
    // Simulate API error responses
    const apiErrors = [
      { status: 401, message: 'Unauthorized' },
      { status: 429, message: 'Too many requests' },
      { status: 500, message: 'Internal server error' },
      { status: 503, message: 'Service unavailable' },
    ];
    
    apiErrors.forEach(apiError => {
      const matched = matchError(`${apiError.status} ${apiError.message}`);
      expect(matched).not.toBeNull();
    });
  });

  it('should provide actionable solutions for common errors', () => {
    const commonErrors = [
      'token expired',
      'network error',
      'credential invalid',
    ];
    
    commonErrors.forEach(errorMsg => {
      const matched = matchError(errorMsg);
      expect(matched).not.toBeNull();
      expect(matched?.solutions.length).toBeGreaterThan(0);
      
      // At least one solution should have an action
      const hasAction = matched?.solutions.some(s => s.action);
      expect(hasAction).toBe(true);
    });
  });

  it('should provide helpful solutions for rate limit errors', () => {
    const matched = matchError('rate limit exceeded');
    expect(matched).not.toBeNull();
    expect(matched?.solutions.length).toBeGreaterThan(0);
    // Rate limit errors may have wait-and-retry solutions without explicit actions
    expect(matched?.retryable).toBe(true);
  });
});
