/**
 * Error Catalog - Known errors with solutions
 * 
 * This catalog maps error patterns to user-friendly messages and actionable solutions.
 */

export type ErrorSeverity = 'critical' | 'warning' | 'info';

export interface ErrorSolution {
  title: string;
  description?: string;
  action?: {
    type: 'link' | 'button' | 'retry';
    label: string;
    handler: string | (() => void | Promise<void>);
  };
}

export interface ErrorDefinition {
  code: string;
  patterns: (RegExp | string)[];
  title: string;
  description: string;
  severity: ErrorSeverity;
  solutions: ErrorSolution[];
  retryable?: boolean;
}

export const errorCatalog: ErrorDefinition[] = [
  // Authentication Errors
  {
    code: 'AUTH_EXPIRED',
    patterns: [/token.*expired/i, /401/, /unauthorized/i, /session.*expired/i],
    title: 'Session Expired',
    description: 'Your login session has expired. Please sign in again to continue.',
    severity: 'warning',
    solutions: [
      {
        title: 'Sign in again',
        action: { type: 'link', label: 'Go to Login', handler: '/login' },
      },
    ],
    retryable: false,
  },
  {
    code: 'AUTH_INVALID',
    patterns: [/invalid.*credentials/i, /wrong.*password/i, /authentication.*failed/i],
    title: 'Invalid Credentials',
    description: 'The username or password you entered is incorrect.',
    severity: 'warning',
    solutions: [
      {
        title: 'Check your credentials',
        description: 'Make sure you entered the correct username and password.',
      },
      {
        title: 'Reset password',
        action: { type: 'link', label: 'Forgot Password', handler: '/forgot-password' },
      },
    ],
    retryable: true,
  },

  // Platform Credential Errors
  {
    code: 'CREDENTIAL_INVALID',
    patterns: [/credential.*invalid/i, /platform.*authentication.*failed/i, /api.*key.*invalid/i],
    title: 'Invalid Platform Credentials',
    description: 'Your credentials for this platform are invalid or have expired.',
    severity: 'critical',
    solutions: [
      {
        title: 'Update credentials',
        description: 'Re-enter your platform credentials to restore access.',
        action: { type: 'link', label: 'Manage Credentials', handler: '/dashboard/credentials' },
      },
    ],
    retryable: false,
  },
  {
    code: 'CREDENTIAL_MISSING',
    patterns: [/no.*credential/i, /credential.*not.*found/i, /missing.*credential/i],
    title: 'Missing Credentials',
    description: 'No credentials found for this platform. Add credentials to continue.',
    severity: 'warning',
    solutions: [
      {
        title: 'Add credentials',
        action: { type: 'link', label: 'Add Credentials', handler: '/dashboard/credentials' },
      },
    ],
    retryable: false,
  },

  // Rate Limiting
  {
    code: 'TWITTER_RATE_LIMIT',
    patterns: [/twitter.*rate.*limit/i, /429.*twitter/i, /too.*many.*requests.*twitter/i],
    title: 'Twitter Rate Limit',
    description: 'Twitter API rate limit reached. The limit resets every 15 minutes.',
    severity: 'warning',
    solutions: [
      {
        title: 'Wait and retry',
        description: 'Rate limits typically reset in 15 minutes. Try again later.',
      },
      {
        title: 'Reduce sync frequency',
        description: 'Consider reducing how often you sync to avoid hitting limits.',
        action: { type: 'link', label: 'Adjust Settings', handler: '/dashboard/settings' },
      },
    ],
    retryable: true,
  },
  {
    code: 'BLUESKY_RATE_LIMIT',
    patterns: [/bluesky.*rate.*limit/i, /429.*bluesky/i, /too.*many.*requests.*bsky/i],
    title: 'Bluesky Rate Limit',
    description: 'Bluesky API rate limit reached. Please wait before trying again.',
    severity: 'warning',
    solutions: [
      {
        title: 'Wait and retry',
        description: 'Rate limits typically reset in a few minutes.',
      },
    ],
    retryable: true,
  },
  {
    code: 'GENERIC_RATE_LIMIT',
    patterns: [/rate.*limit/i, /429/, /too.*many.*requests/i],
    title: 'Rate Limit Exceeded',
    description: 'Too many requests. Please wait a moment before trying again.',
    severity: 'warning',
    solutions: [
      {
        title: 'Wait and retry',
        description: 'Try again in a few minutes.',
      },
    ],
    retryable: true,
  },

  // Network Errors
  {
    code: 'NETWORK_OFFLINE',
    patterns: [/network.*error/i, /failed.*fetch/i, /net::err/i, /offline/i],
    title: 'Connection Error',
    description: 'Unable to connect to the server. Check your internet connection.',
    severity: 'critical',
    solutions: [
      {
        title: 'Check connection',
        description: 'Make sure you have an active internet connection.',
      },
      {
        title: 'Retry',
        action: { type: 'retry', label: 'Try Again', handler: '' },
      },
    ],
    retryable: true,
  },
  {
    code: 'SERVER_UNAVAILABLE',
    patterns: [/503/, /service.*unavailable/i, /server.*down/i],
    title: 'Server Unavailable',
    description: 'The server is temporarily unavailable. Please try again later.',
    severity: 'critical',
    solutions: [
      {
        title: 'Wait and retry',
        description: 'The server may be undergoing maintenance. Try again in a few minutes.',
      },
    ],
    retryable: true,
  },
  {
    code: 'TIMEOUT',
    patterns: [/timeout/i, /timed.*out/i, /request.*took.*too.*long/i],
    title: 'Request Timeout',
    description: 'The request took too long to complete. Please try again.',
    severity: 'warning',
    solutions: [
      {
        title: 'Retry',
        action: { type: 'retry', label: 'Try Again', handler: '' },
      },
    ],
    retryable: true,
  },

  // Sync Errors
  {
    code: 'SYNC_CONFLICT',
    patterns: [/sync.*conflict/i, /duplicate.*post/i, /already.*synced/i],
    title: 'Sync Conflict',
    description: 'This content has already been synced or conflicts with existing content.',
    severity: 'info',
    solutions: [
      {
        title: 'Skip duplicate',
        description: 'The content already exists on the target platform.',
      },
      {
        title: 'View sync history',
        action: { type: 'link', label: 'Sync History', handler: '/dashboard/sync' },
      },
    ],
    retryable: false,
  },
  {
    code: 'SYNC_FAILED',
    patterns: [/sync.*failed/i, /synchronization.*error/i],
    title: 'Sync Failed',
    description: 'The synchronization could not be completed.',
    severity: 'critical',
    solutions: [
      {
        title: 'Check credentials',
        description: 'Make sure your platform credentials are valid.',
        action: { type: 'link', label: 'Check Credentials', handler: '/dashboard/credentials' },
      },
      {
        title: 'Retry sync',
        action: { type: 'retry', label: 'Retry', handler: '' },
      },
    ],
    retryable: true,
  },

  // Validation Errors
  {
    code: 'VALIDATION_ERROR',
    patterns: [/validation.*error/i, /invalid.*input/i, /required.*field/i],
    title: 'Invalid Input',
    description: 'Please check your input and try again.',
    severity: 'warning',
    solutions: [
      {
        title: 'Review form',
        description: 'Check that all required fields are filled correctly.',
      },
    ],
    retryable: true,
  },
  {
    code: 'CONTENT_TOO_LONG',
    patterns: [/content.*too.*long/i, /exceeds.*character.*limit/i, /280.*characters/i],
    title: 'Content Too Long',
    description: 'Your content exceeds the platform character limit.',
    severity: 'warning',
    solutions: [
      {
        title: 'Shorten content',
        description: 'Edit your content to fit within the character limit.',
      },
    ],
    retryable: true,
  },

  // Permission Errors
  {
    code: 'PERMISSION_DENIED',
    patterns: [/permission.*denied/i, /403/, /forbidden/i, /not.*authorized/i],
    title: 'Permission Denied',
    description: 'You do not have permission to perform this action.',
    severity: 'critical',
    solutions: [
      {
        title: 'Contact admin',
        description: 'Ask your workspace admin to grant you the necessary permissions.',
      },
    ],
    retryable: false,
  },

  // Server Errors
  {
    code: 'SERVER_ERROR',
    patterns: [/500/, /internal.*server.*error/i, /something.*went.*wrong/i],
    title: 'Server Error',
    description: 'An unexpected error occurred on the server.',
    severity: 'critical',
    solutions: [
      {
        title: 'Retry',
        description: 'This might be a temporary issue. Try again.',
        action: { type: 'retry', label: 'Try Again', handler: '' },
      },
      {
        title: 'Report issue',
        description: 'If the problem persists, please report it.',
        action: { type: 'link', label: 'Report Issue', handler: '/dashboard/settings' },
      },
    ],
    retryable: true,
  },

  // Not Found
  {
    code: 'NOT_FOUND',
    patterns: [/404/, /not.*found/i, /does.*not.*exist/i],
    title: 'Not Found',
    description: 'The requested resource could not be found.',
    severity: 'warning',
    solutions: [
      {
        title: 'Go back',
        description: 'Return to the previous page.',
        action: { type: 'button', label: 'Go Back', handler: () => window.history.back() },
      },
      {
        title: 'Go to Dashboard',
        action: { type: 'link', label: 'Dashboard', handler: '/dashboard' },
      },
    ],
    retryable: false,
  },
];

/**
 * Find matching error definition for a given error message or code
 */
export function matchError(error: string | Error): ErrorDefinition | null {
  const errorString = error instanceof Error ? error.message : error;
  
  for (const definition of errorCatalog) {
    for (const pattern of definition.patterns) {
      if (typeof pattern === 'string') {
        if (errorString.toLowerCase().includes(pattern.toLowerCase())) {
          return definition;
        }
      } else if (pattern.test(errorString)) {
        return definition;
      }
    }
  }
  
  return null;
}

/**
 * Get a user-friendly error message
 */
export function getErrorMessage(error: string | Error): string {
  const matched = matchError(error);
  if (matched) {
    return matched.description;
  }
  return error instanceof Error ? error.message : error;
}

/**
 * Check if an error is retryable
 */
export function isRetryable(error: string | Error): boolean {
  const matched = matchError(error);
  return matched?.retryable ?? false;
}
