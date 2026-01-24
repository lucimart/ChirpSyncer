import { useState, useCallback } from 'react';
import { useRealtimeMessage, CleanupProgressPayload } from '../providers/RealtimeProvider';

interface CleanupJobProgress {
  ruleId: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  deleted: number;
  total: number;
  currentTweet?: string;
  correlationId?: string;
}

interface UseCleanupProgressOptions {
  ruleId?: number;
  onComplete?: (ruleId: number, deleted: number) => void;
  onError?: (ruleId: number, error: string) => void;
}

export function useCleanupProgress(options: UseCleanupProgressOptions = {}) {
  const { ruleId: filterRuleId, onComplete, onError } = options;
  const [rules, setRules] = useState<Map<number, CleanupJobProgress>>(new Map());

  const handleProgress = useCallback(
    (payload: CleanupProgressPayload) => {
      const ruleId = payload.rule_id;
      
      // Filter by ruleId if specified
      if (filterRuleId !== undefined && ruleId !== filterRuleId) {
        return;
      }

      setRules((prev) => {
        const next = new Map(prev);
        const isComplete = payload.deleted === payload.total && payload.total > 0;

        next.set(ruleId, {
          ruleId,
          status: isComplete ? 'completed' : 'running',
          deleted: payload.deleted,
          total: payload.total,
          currentTweet: payload.current_tweet,
          correlationId: payload.correlation_id,
        });

        return next;
      });
    },
    [filterRuleId]
  );

  const handleComplete = useCallback(
    (payload: { rule_id: number; deleted: number }) => {
      const ruleId = payload.rule_id;
      
      if (filterRuleId !== undefined && ruleId !== filterRuleId) {
        return;
      }

      setRules((prev) => {
        const next = new Map(prev);
        const existing = next.get(ruleId);
        next.set(ruleId, {
          ruleId,
          status: 'completed',
          deleted: payload.deleted,
          total: payload.deleted,
          correlationId: existing?.correlationId,
        });
        return next;
      });

      onComplete?.(ruleId, payload.deleted);
    },
    [filterRuleId, onComplete]
  );

  useRealtimeMessage('cleanup.progress', handleProgress);
  useRealtimeMessage('cleanup.complete', handleComplete);

  // Handle job.completed events for cleanup jobs
  useRealtimeMessage('job.completed', (payload) => {
    if (payload.job_type !== 'cleanup') return;
    
    const ruleId = parseInt(payload.job_id, 10);
    if (isNaN(ruleId)) return;
    if (filterRuleId !== undefined && ruleId !== filterRuleId) return;

    if (payload.status === 'completed') {
      const deleted = (payload.result?.deleted as number) || 0;
      onComplete?.(ruleId, deleted);
    } else if (payload.status === 'failed') {
      onError?.(ruleId, payload.error || 'Unknown error');
    }
  });

  const getRule = useCallback(
    (ruleId: number): CleanupJobProgress | undefined => {
      return rules.get(ruleId);
    },
    [rules]
  );

  const clearRule = useCallback((ruleId: number) => {
    setRules((prev) => {
      const next = new Map(prev);
      next.delete(ruleId);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setRules(new Map());
  }, []);

  // Get the specific rule if filterRuleId is set
  const currentRule = filterRuleId !== undefined ? rules.get(filterRuleId) : undefined;

  return {
    rules: Array.from(rules.values()),
    currentRule,
    getRule,
    clearRule,
    clearAll,
    isRunning: currentRule?.status === 'running',
    isCompleted: currentRule?.status === 'completed',
    isFailed: currentRule?.status === 'failed',
  };
}

export type { CleanupJobProgress, UseCleanupProgressOptions };
