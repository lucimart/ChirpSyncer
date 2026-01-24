'use client';

import { memo, FC, useState, useCallback } from 'react';
import styled from 'styled-components';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { WorkflowRun, WorkflowStatus } from '@/lib/workflows';

export interface RunHistoryProps {
  runs: WorkflowRun[];
  isLoading?: boolean;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background-color: ${({ theme }) => theme.colors.background.secondary};
`;

const TableHeader = styled.th`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  text-align: left;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr<{ $expandable: boolean }>`
  cursor: ${({ $expandable }) => ($expandable ? 'pointer' : 'default')};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }
`;

const TableCell = styled.td`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  vertical-align: middle;
`;

const StatusCell = styled(TableCell)`
  width: 120px;
`;

const TimeCell = styled(TableCell)`
  white-space: nowrap;
`;

const DurationCell = styled(TableCell)`
  width: 100px;
`;

const ExpandCell = styled(TableCell)`
  width: 40px;
`;

const ExpandedRow = styled.tr`
  background-color: ${({ theme }) => theme.colors.background.secondary};
`;

const ExpandedContent = styled.td`
  padding: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const TriggerDataSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const SectionLabel = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  text-transform: uppercase;
`;

const CodeBlock = styled.pre`
  margin: 0;
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-family: monospace;
  overflow-x: auto;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ErrorSection = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.surface.danger.bg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.surface.danger.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const ActionsCompleted = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const SpinningLoader = styled(Loader2)`
  animation: spin 1s linear infinite;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

// Status badge configuration
const STATUS_CONFIG: Record<
  WorkflowStatus,
  { label: string; variant: 'status-primary' | 'status-success' | 'status-danger'; icon: typeof Loader2 }
> = {
  running: { label: 'Running', variant: 'status-primary', icon: Loader2 },
  completed: { label: 'Completed', variant: 'status-success', icon: CheckCircle },
  failed: { label: 'Failed', variant: 'status-danger', icon: AlertCircle },
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startedAt: string, completedAt?: string): string {
  if (!completedAt) return '-';

  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const durationMs = end - start;

  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${(durationMs / 60000).toFixed(1)}m`;
}

export const RunHistory: FC<RunHistoryProps> = memo(({ runs, isLoading }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  if (isLoading) {
    return (
      <LoadingState>
        <SpinningLoader size={16} />
        <span>Loading run history...</span>
      </LoadingState>
    );
  }

  if (runs.length === 0) {
    return <EmptyState>No runs yet. This workflow hasn&apos;t been triggered.</EmptyState>;
  }

  return (
    <Container data-testid="run-history">
      <Table>
        <TableHead>
          <tr>
            <TableHeader>Status</TableHeader>
            <TableHeader>Started</TableHeader>
            <TableHeader>Duration</TableHeader>
            <TableHeader>Actions</TableHeader>
            <TableHeader></TableHeader>
          </tr>
        </TableHead>
        <TableBody>
          {runs.map((run) => {
            const statusConfig = STATUS_CONFIG[run.status];
            const StatusIcon = statusConfig.icon;
            const isExpanded = expandedId === run.id;
            const hasDetails = Object.keys(run.trigger_data).length > 0 || run.error_message;

            return (
              <>
                <TableRow
                  key={run.id}
                  $expandable={!!hasDetails}
                  onClick={() => hasDetails && toggleExpanded(run.id)}
                  data-testid={`run-row-${run.id}`}
                >
                  <StatusCell>
                    <Badge
                      variant={statusConfig.variant}
                      size="sm"
                      leftIcon={
                        run.status === 'running' ? (
                          <SpinningLoader size={12} />
                        ) : (
                          <StatusIcon size={12} />
                        )
                      }
                    >
                      {statusConfig.label}
                    </Badge>
                  </StatusCell>
                  <TimeCell>{formatTime(run.started_at)}</TimeCell>
                  <DurationCell>{formatDuration(run.started_at, run.completed_at)}</DurationCell>
                  <TableCell>
                    {run.actions_completed.length} / {run.actions_completed.length + (run.error_message ? 1 : 0)}
                  </TableCell>
                  <ExpandCell>
                    {hasDetails &&
                      (isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </ExpandCell>
                </TableRow>
                {isExpanded && (
                  <ExpandedRow key={`${run.id}-expanded`}>
                    <ExpandedContent colSpan={5}>
                      {Object.keys(run.trigger_data).length > 0 && (
                        <TriggerDataSection>
                          <SectionLabel>Trigger Data</SectionLabel>
                          <CodeBlock>{JSON.stringify(run.trigger_data, null, 2)}</CodeBlock>
                        </TriggerDataSection>
                      )}

                      {run.actions_completed.length > 0 && (
                        <TriggerDataSection>
                          <SectionLabel>Actions Completed</SectionLabel>
                          <ActionsCompleted>
                            {run.actions_completed.map((action, index) => (
                              <Badge key={`${action}-${index}`} variant="success-soft" size="sm">
                                {action}
                              </Badge>
                            ))}
                          </ActionsCompleted>
                        </TriggerDataSection>
                      )}

                      {run.error_message && (
                        <div>
                          <SectionLabel>Error</SectionLabel>
                          <ErrorSection>{run.error_message}</ErrorSection>
                        </div>
                      )}
                    </ExpandedContent>
                  </ExpandedRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </Container>
  );
});

RunHistory.displayName = 'RunHistory';
