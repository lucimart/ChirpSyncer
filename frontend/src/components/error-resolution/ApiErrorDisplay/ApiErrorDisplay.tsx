'use client';

import { useEffect, useMemo, type FC } from 'react';
import { ErrorCard } from '../ErrorCard';
import { useApiError, createFallbackError, type ErrorDefinition } from '@/hooks/useApiError';

export interface ApiErrorDisplayProps {
  /** The error string or Error object to display */
  error: string | Error | null;
  /** Callback when retry is clicked (only shown if error is retryable) */
  onRetry?: () => void | Promise<void>;
  /** Callback when dismiss is clicked */
  onDismiss?: () => void;
  /** Whether to show technical details toggle */
  showTechnicalDetails?: boolean;
  /** Additional CSS class */
  className?: string;
}

export const ApiErrorDisplay: FC<ApiErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showTechnicalDetails = true,
  className,
}) => {
  const { error: matchedError, originalError, isRetryable, setError } = useApiError();

  // Update the hook when error prop changes
  useEffect(() => {
    setError(error);
  }, [error, setError]);

  const errorToDisplay = useMemo<ErrorDefinition | null>(() => {
    if (!error) return null;
    return matchedError || createFallbackError(
      typeof error === 'string' ? error : error.message
    );
  }, [error, matchedError]);

  if (!error || !errorToDisplay) {
    return null;
  }

  return (
    <div className={className}>
      <ErrorCard
        error={errorToDisplay}
        originalError={originalError || undefined}
        onRetry={isRetryable && onRetry ? onRetry : undefined}
        onDismiss={onDismiss}
        showTechnicalDetails={showTechnicalDetails}
      />
    </div>
  );
};

export default ApiErrorDisplay;
