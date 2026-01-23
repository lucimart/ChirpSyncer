'use client';

import { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Zap, History, Plus, Link, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Stack } from '@/components/ui/Stack';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { AtomizationWizard } from '@/components/atomization';
import {
  useAtomizationJobs,
  type AtomizationJob,
  type JobStatus,
} from '@/lib/atomization';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing[6]};
`;

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const QuickActionCard = styled(Card)`
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary[300]};
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const QuickActionIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $color }) => $color}15;
  color: ${({ $color }) => $color};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const QuickActionTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[1]} 0;
`;

const QuickActionDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[4]} 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const JobsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const JobCard = styled(Card)`
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary[300]};
  }
`;

const JobHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const JobInfo = styled.div`
  flex: 1;
`;

const JobTitle = styled.h4`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[1]} 0;
`;

const JobMeta = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const WizardContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing[8]};
`;

const STATUS_VARIANT: Record<JobStatus, 'primary' | 'warning' | 'success' | 'danger'> = {
  pending: 'primary',
  processing: 'warning',
  completed: 'success',
  failed: 'danger',
};

const STATUS_LABEL: Record<JobStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function getSourceLabel(sourceType: string, sourceUrl?: string): string {
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      return url.hostname.replace('www.', '');
    } catch {
      return sourceType;
    }
  }
  return sourceType;
}

export default function AtomizePage() {
  const [showWizard, setShowWizard] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { data: jobs = [], isLoading } = useAtomizationJobs();

  const handleQuickAction = useCallback((type: 'url' | 'text') => {
    setSelectedJobId(null);
    setShowWizard(true);
  }, []);

  const handleJobClick = useCallback((job: AtomizationJob) => {
    setSelectedJobId(job.id);
    setShowWizard(true);
  }, []);

  const handleWizardComplete = useCallback(() => {
    setShowWizard(false);
    setSelectedJobId(null);
  }, []);

  if (showWizard) {
    return (
      <Container>
        <PageHeader
          title="Content Atomization"
          description="Transform your content for multiple platforms"
          actions={
            <Button variant="ghost" onClick={() => setShowWizard(false)}>
              Cancel
            </Button>
          }
        />
        <WizardContainer>
          <AtomizationWizard
            jobId={selectedJobId || undefined}
            initialStep={selectedJobId ? 3 : 1}
            onComplete={handleWizardComplete}
          />
        </WizardContainer>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        title="Content Atomization"
        description="Transform your content into platform-optimized formats"
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => setShowWizard(true)}
          >
            New Atomization
          </Button>
        }
      />

      <QuickActions>
        <QuickActionCard
          padding="lg"
          hoverable
          onClick={() => handleQuickAction('url')}
        >
          <QuickActionIcon $color="#1DA1F2">
            <Link size={24} />
          </QuickActionIcon>
          <QuickActionTitle>Atomize URL</QuickActionTitle>
          <QuickActionDescription>
            Transform a YouTube video, blog post, or article into multiple formats
          </QuickActionDescription>
        </QuickActionCard>

        <QuickActionCard
          padding="lg"
          hoverable
          onClick={() => handleQuickAction('text')}
        >
          <QuickActionIcon $color="#10B981">
            <FileText size={24} />
          </QuickActionIcon>
          <QuickActionTitle>Paste Content</QuickActionTitle>
          <QuickActionDescription>
            Transform pasted text or thread content into multiple formats
          </QuickActionDescription>
        </QuickActionCard>
      </QuickActions>

      <SectionTitle>
        <History size={20} />
        Recent Jobs
      </SectionTitle>

      {isLoading && (
        <Stack align="center" justify="center" style={{ padding: 40 }}>
          <Spinner size="lg" />
        </Stack>
      )}

      {!isLoading && jobs.length === 0 && (
        <EmptyState
          title="No atomization jobs yet"
          description="Start by creating your first content atomization to transform your content for multiple platforms."
          action={
            <Button
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={() => setShowWizard(true)}
            >
              Create First Job
            </Button>
          }
        />
      )}

      {!isLoading && jobs.length > 0 && (
        <JobsGrid>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              padding="md"
              hoverable
              onClick={() => handleJobClick(job)}
            >
              <JobHeader>
                <JobInfo>
                  <JobTitle>
                    {getSourceLabel(job.source_type, job.source_url)}
                  </JobTitle>
                  <JobMeta>
                    {job.source_type} - {formatDate(job.created_at)}
                  </JobMeta>
                </JobInfo>
                <Badge
                  variant={STATUS_VARIANT[job.status]}
                  size="sm"
                  dot={job.status === 'processing'}
                  pulse={job.status === 'processing'}
                >
                  {STATUS_LABEL[job.status]}
                </Badge>
              </JobHeader>
            </JobCard>
          ))}
        </JobsGrid>
      )}
    </Container>
  );
}
