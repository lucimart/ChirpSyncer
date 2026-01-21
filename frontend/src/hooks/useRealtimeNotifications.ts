import { useEffect, useCallback } from 'react';
import { useRealtimeMessage, NotificationPayload } from '../providers/RealtimeProvider';
import { useToast } from '../components/ui/Toast';

interface UseRealtimeNotificationsOptions {
  showSyncNotifications?: boolean;
  showCleanupNotifications?: boolean;
  showJobCompletedNotifications?: boolean;
}

/**
 * Hook that automatically shows toast notifications for realtime events.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   // Show all notifications
 *   useRealtimeNotifications();
 *   
 *   // Or customize which notifications to show
 *   useRealtimeNotifications({
 *     showSyncNotifications: true,
 *     showCleanupNotifications: false,
 *   });
 * }
 * ```
 */
export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const {
    showSyncNotifications = true,
    showCleanupNotifications = true,
    showJobCompletedNotifications = true,
  } = options;

  const { addToast } = useToast();

  // Handle direct notification events
  const handleNotification = useCallback(
    (payload: NotificationPayload) => {
      addToast({
        type: payload.type,
        title: payload.title,
        message: payload.message,
      });
    },
    [addToast]
  );

  useRealtimeMessage('notification', handleNotification);

  // Handle sync completion notifications
  useRealtimeMessage('sync.complete', (payload) => {
    if (!showSyncNotifications) return;
    
    addToast({
      type: 'success',
      title: 'Sync Completed',
      message: `Successfully synced ${payload.synced} items`,
    });
  });

  // Handle cleanup completion notifications
  useRealtimeMessage('cleanup.complete', (payload) => {
    if (!showCleanupNotifications) return;
    
    addToast({
      type: 'success',
      title: 'Cleanup Completed',
      message: `Deleted ${payload.deleted} items from rule #${payload.rule_id}`,
    });
  });

  // Handle job.completed notifications
  useRealtimeMessage('job.completed', (payload) => {
    if (!showJobCompletedNotifications) return;

    const jobType = payload.job_type === 'sync' ? 'Sync' : 'Cleanup';

    if (payload.status === 'completed') {
      addToast({
        type: 'success',
        title: `${jobType} Job Completed`,
        message: payload.result
          ? `Job ${payload.job_id} finished successfully`
          : undefined,
      });
    } else if (payload.status === 'failed') {
      addToast({
        type: 'error',
        title: `${jobType} Job Failed`,
        message: payload.error || `Job ${payload.job_id} failed`,
      });
    }
  });
}

/**
 * Hook to manually trigger notifications for sync/cleanup events.
 * Useful when you want more control over when notifications appear.
 */
export function useNotify() {
  const { addToast } = useToast();

  const notifySyncStarted = useCallback(
    (jobId: string) => {
      addToast({
        type: 'info',
        title: 'Sync Started',
        message: `Job ${jobId} is now running`,
        duration: 3000,
      });
    },
    [addToast]
  );

  const notifySyncCompleted = useCallback(
    (jobId: string, synced: number) => {
      addToast({
        type: 'success',
        title: 'Sync Completed',
        message: `Successfully synced ${synced} items`,
      });
    },
    [addToast]
  );

  const notifySyncFailed = useCallback(
    (jobId: string, error: string) => {
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: error,
        duration: 10000,
      });
    },
    [addToast]
  );

  const notifyCleanupStarted = useCallback(
    (ruleId: number) => {
      addToast({
        type: 'info',
        title: 'Cleanup Started',
        message: `Rule #${ruleId} is now running`,
        duration: 3000,
      });
    },
    [addToast]
  );

  const notifyCleanupCompleted = useCallback(
    (ruleId: number, deleted: number) => {
      addToast({
        type: 'success',
        title: 'Cleanup Completed',
        message: `Deleted ${deleted} items`,
      });
    },
    [addToast]
  );

  const notifyCleanupFailed = useCallback(
    (ruleId: number, error: string) => {
      addToast({
        type: 'error',
        title: 'Cleanup Failed',
        message: error,
        duration: 10000,
      });
    },
    [addToast]
  );

  return {
    notifySyncStarted,
    notifySyncCompleted,
    notifySyncFailed,
    notifyCleanupStarted,
    notifyCleanupCompleted,
    notifyCleanupFailed,
  };
}

export type { UseRealtimeNotificationsOptions };
