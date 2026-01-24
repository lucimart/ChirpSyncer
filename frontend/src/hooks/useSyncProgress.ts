import { useState, useCallback, useEffect } from 'react';
import { useRealtimeMessage, SyncProgressPayload } from '../providers/RealtimeProvider';

interface SyncJobProgress {
  jobId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  current: number;
  total: number;
  message: string;
  correlationId?: string;
}

interface UseSyncProgressOptions {
  jobId?: string;
  onComplete?: (jobId: string, synced: number) => void;
  onError?: (jobId: string, error: string) => void;
}

export function useSyncProgress(options: UseSyncProgressOptions = {}) {
  const { jobId: filterJobId, onComplete, onError } = options;
  const [jobs, setJobs] = useState<Map<string, SyncJobProgress>>(new Map());

  const handleProgress = useCallback(
    (payload: SyncProgressPayload) => {
      const jobId = payload.operation_id;
      
      // Filter by jobId if specified
      if (filterJobId && jobId !== filterJobId) {
        return;
      }

      setJobs((prev) => {
        const next = new Map(prev);
        const status = payload.message.toLowerCase().includes('completed')
          ? 'completed'
          : payload.message.toLowerCase().includes('failed')
          ? 'failed'
          : 'running';

        next.set(jobId, {
          jobId,
          status,
          current: payload.current,
          total: payload.total,
          message: payload.message,
          correlationId: payload.correlation_id,
        });

        return next;
      });
    },
    [filterJobId]
  );

  const handleComplete = useCallback(
    (payload: { operation_id: string; synced: number }) => {
      const jobId = payload.operation_id;
      
      if (filterJobId && jobId !== filterJobId) {
        return;
      }

      setJobs((prev) => {
        const next = new Map(prev);
        const existing = next.get(jobId);
        next.set(jobId, {
          jobId,
          status: 'completed',
          current: payload.synced,
          total: payload.synced,
          message: `Completed: ${payload.synced} items synced`,
          correlationId: existing?.correlationId,
        });
        return next;
      });

      onComplete?.(jobId, payload.synced);
    },
    [filterJobId, onComplete]
  );

  useRealtimeMessage('sync.progress', handleProgress);
  useRealtimeMessage('sync.complete', handleComplete);

  // Handle job.completed events for sync jobs
  useRealtimeMessage('job.completed', (payload) => {
    if (payload.job_type !== 'sync') return;
    
    const jobId = payload.job_id;
    if (filterJobId && jobId !== filterJobId) return;

    if (payload.status === 'completed') {
      const synced = (payload.result?.synced as number) || 0;
      onComplete?.(jobId, synced);
    } else if (payload.status === 'failed') {
      onError?.(jobId, payload.error || 'Unknown error');
    }
  });

  const getJob = useCallback(
    (jobId: string): SyncJobProgress | undefined => {
      return jobs.get(jobId);
    },
    [jobs]
  );

  const clearJob = useCallback((jobId: string) => {
    setJobs((prev) => {
      const next = new Map(prev);
      next.delete(jobId);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setJobs(new Map());
  }, []);

  // Get the specific job if filterJobId is set
  const currentJob = filterJobId ? jobs.get(filterJobId) : undefined;

  return {
    jobs: Array.from(jobs.values()),
    currentJob,
    getJob,
    clearJob,
    clearAll,
    isRunning: currentJob?.status === 'running',
    isCompleted: currentJob?.status === 'completed',
    isFailed: currentJob?.status === 'failed',
  };
}

export type { SyncJobProgress, UseSyncProgressOptions };
