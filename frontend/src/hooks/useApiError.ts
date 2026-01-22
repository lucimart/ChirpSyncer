/**
 * useApiError Hook
 * 
 * Provides contextual error handling by matching API errors
 * to the error catalog and providing user-friendly messages
 * with actionable solutions.
 */

import { useState, useCallback, useMemo } from 'react';
import { matchError, type ErrorDefinition, type ErrorSolution } from '@/lib/errors';

export interface ApiErrorState {
  /** The matched error definition from the catalog, or null if unknown */
  error: ErrorDefinition | null;
  /** The original error message */
  originalError: string | null;
  /** Whether an error is currently displayed */
  hasError: boolean;
  /** Whether the error is retryable */
  isRetryable: boolean;
}

export interface UseApiErrorReturn extends ApiErrorState {
  /** Set an error from an API response or Error object */
  setError: (error: string | Error | null) => void;
  /** Clear the current error */
  clearError: () => void;
  /** Get the user-friendly error message */
  getMessage: () => string;
  /** Get the error title */
  getTitle: () => string;
  /** Get actionable solutions */
  getSolutions: () => ErrorSolution[];
}

/**
 * Hook for handling API errors with contextual information
 * 
 * @example
 * ```tsx
 * const { error, setError, clearError, isRetryable } = useApiError();
 * 
 * const handleSubmit = async () => {
 *   const result = await api.someAction();
 *   if (!result.success) {
 *     setError(result.error);
 *   }
 * };
 * 
 * return (
 *   <>
 *     {error && (
 *       <ErrorCard 
 *         error={error} 
 *         onRetry={isRetryable ? handleSubmit : undefined}
 *         onDismiss={clearError}
 *       />
 *     )}
 *   </>
 * );
 * ```
 */
export function useApiError(): UseApiErrorReturn {
  const [originalError, setOriginalError] = useState<string | null>(null);
  const [matchedError, setMatchedError] = useState<ErrorDefinition | null>(null);

  const setError = useCallback((error: string | Error | null) => {
    if (error === null) {
      setOriginalError(null);
      setMatchedError(null);
      return;
    }

    const errorString = error instanceof Error ? error.message : error;
    setOriginalError(errorString);
    
    const matched = matchError(errorString);
    setMatchedError(matched);
  }, []);

  const clearError = useCallback(() => {
    setOriginalError(null);
    setMatchedError(null);
  }, []);

  const getMessage = useCallback(() => {
    if (matchedError) {
      return matchedError.description;
    }
    return originalError || 'An unexpected error occurred';
  }, [matchedError, originalError]);

  const getTitle = useCallback(() => {
    if (matchedError) {
      return matchedError.title;
    }
    return 'Error';
  }, [matchedError]);

  const getSolutions = useCallback(() => {
    return matchedError?.solutions || [];
  }, [matchedError]);

  const hasError = originalError !== null;
  const isRetryable = matchedError?.retryable ?? false;

  return {
    error: matchedError,
    originalError,
    hasError,
    isRetryable,
    setError,
    clearError,
    getMessage,
    getTitle,
    getSolutions,
  };
}

/**
 * Create a fallback error definition for unknown errors
 */
export function createFallbackError(message: string): ErrorDefinition {
  return {
    code: 'UNKNOWN_ERROR',
    patterns: [],
    title: 'Error',
    description: message,
    severity: 'warning',
    solutions: [
      {
        title: 'Try again',
        description: 'The operation may succeed if you try again.',
        action: {
          type: 'retry',
          label: 'Retry',
          handler: '',
        },
      },
    ],
    retryable: true,
  };
}

export type { ErrorDefinition, ErrorSolution };
