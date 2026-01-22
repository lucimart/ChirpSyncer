'use client';

import React from 'react';
import { ErrorCard } from './ErrorCard';
import { useApiError, createFallbackError, type ErrorDefinition } from '@/hooks/useApiError';

interface ApiErrorDisplayProps {
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

/**
 * ApiErrorDisplay - Displays API errors with contextual information
 * 
 * Automatically matches errors to the error catalog and displays
 * user-friendly messages with actionable solutions.
 * 
 * @example
 * ```tsx
 * const [error, setError] = useState<string | null>(null);
 * 
 * const handleAction = async () => {
 *   const result = await api.someAction();
 *   if (!result.success) {
 *     setError(result.error);
 *   }
 * };
 * 
 * return (
 *   <>
 *     <ApiErrorDisplay 
 *       error={error}
 *       onRetry={handleAction}
 *       onDismiss={() => setError(null)}
 *     />
 *     <button onClick={handleAction}>Do Action</button>
 *   </>
 * );
 * ```
 */
export function ApiErrorDisplay({
  error,
  onRetry,
  onDismiss,
  showTechnicalDetails = true,
  className,
}: ApiErrorDisplayProps) {
  const { error: matchedError, originalError, isRetryable, setError } = useApiError();

  // Update the hook when error prop changes
  React.useEffect(() => {
    setError(error);
  }, [error, setError]);

  if (!error) {
    return null;
  }

  // Use matched error or create a fallback
  const errorToDisplay: ErrorDefinition = matchedError || createFallbackError(
    typeof error === 'string' ? error : error.message
  );

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
}

export default ApiErrorDisplay;
