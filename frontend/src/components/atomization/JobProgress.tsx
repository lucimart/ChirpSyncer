'use client';

import { memo, FC, useMemo } from 'react';
import styled from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/Progress';
import { Stack } from '@/components/ui/Stack';
import { Badge } from '@/components/ui/Badge';
import { PLATFORM_CONFIG, type PlatformType, type JobStatus } from '@/lib/atomization';

export interface JobProgressProps {
  status: JobStatus;
  completedPlatforms?: PlatformType[];
  error?: string;
}

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing[6]};
`;

const StatusContainer = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const StatusIcon = styled(motion.div)<{ $status: JobStatus }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme, $status }) => {
    switch ($status) {
      case 'completed':
        return theme.colors.success[100];
      case 'failed':
        return theme.colors.danger[100];
      default:
        return theme.colors.primary[100];
    }
  }};
  color: ${({ theme, $status }) => {
    switch ($status) {
      case 'completed':
        return theme.colors.success[600];
      case 'failed':
        return theme.colors.danger[600];
      default:
        return theme.colors.primary[600];
    }
  }};
`;

const StatusTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[2]} 0;
`;

const StatusDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const ErrorMessage = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.danger[50]};
  border: 1px solid ${({ theme }) => theme.colors.danger[200]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.danger[700]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const PlatformsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[6]};
`;

const PlatformItem = styled(motion.div)<{ $isCompleted: boolean; $isProcessing: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background-color: ${({ theme, $isCompleted }) =>
    $isCompleted ? theme.colors.success[50] : theme.colors.background.secondary};
  border: 2px solid ${({ theme, $isCompleted, $isProcessing }) => {
    if ($isCompleted) return theme.colors.success[500];
    if ($isProcessing) return theme.colors.primary[500];
    return theme.colors.border.light;
  }};
  opacity: ${({ $isCompleted, $isProcessing }) =>
    $isCompleted || $isProcessing ? 1 : 0.5};
  transition: all ${({ theme }) => theme.transitions.normal};
`;

const PlatformIcon = styled.div<{ $color: string; $isActive: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $color, $isActive }) =>
    $isActive ? $color : 'transparent'};
  color: ${({ $color, $isActive }) => ($isActive ? 'white' : $color)};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  border: 2px solid ${({ $color }) => $color};
`;

const PlatformName = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
`;

const CompletedIcon = styled.div`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.success[500]};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PlatformWrapper = styled.div`
  position: relative;
`;

const PLATFORMS: PlatformType[] = ['twitter', 'linkedin', 'medium', 'instagram'];

const STATUS_CONFIG = {
  pending: {
    title: 'Ready to Process',
    description: 'Click "Process" to start transforming your content.',
    progress: 0,
  },
  processing: {
    title: 'Transforming Content',
    description: 'Creating optimized versions for each platform...',
    progress: 50,
  },
  completed: {
    title: 'Transformation Complete',
    description: 'Your content is ready for each platform.',
    progress: 100,
  },
  failed: {
    title: 'Processing Failed',
    description: 'Something went wrong while processing your content.',
    progress: 0,
  },
};

export const JobProgress: FC<JobProgressProps> = memo(
  ({ status, completedPlatforms = [], error }) => {
    const prefersReducedMotion = useReducedMotion();
    const config = STATUS_CONFIG[status];

    const progressValue = useMemo(() => {
      if (status === 'processing') {
        // Calculate progress based on completed platforms
        return Math.round((completedPlatforms.length / PLATFORMS.length) * 100);
      }
      return config.progress;
    }, [status, completedPlatforms, config.progress]);

    const spinAnimation = prefersReducedMotion
      ? {}
      : {
          animate: { rotate: 360 },
          transition: { duration: 1, repeat: Infinity, ease: 'linear' as const },
        };

    const getStatusIcon = () => {
      switch (status) {
        case 'completed':
          return <Check size={32} />;
        case 'failed':
          return <AlertCircle size={32} />;
        case 'processing':
          return (
            <motion.div {...spinAnimation}>
              <Loader2 size={32} />
            </motion.div>
          );
        default:
          return <Loader2 size={32} />;
      }
    };

    return (
      <Container data-testid="job-progress">
        <StatusContainer>
          <StatusIcon $status={status}>{getStatusIcon()}</StatusIcon>
          <StatusTitle>{config.title}</StatusTitle>
          <StatusDescription>{config.description}</StatusDescription>
        </StatusContainer>

        {status !== 'failed' && (
          <Progress
            value={progressValue}
            max={100}
            variant={status === 'completed' ? 'success' : 'primary'}
            animated={status === 'processing'}
            label="Progress"
            showValue
          />
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <PlatformsGrid>
          {PLATFORMS.map((platform, index) => {
            const platformConfig = PLATFORM_CONFIG[platform];
            const isCompleted = completedPlatforms.includes(platform);
            const isProcessing =
              status === 'processing' &&
              !isCompleted &&
              completedPlatforms.length === index;

            return (
              <PlatformWrapper key={platform}>
                <PlatformItem
                  $isCompleted={isCompleted}
                  $isProcessing={isProcessing}
                  initial={prefersReducedMotion ? undefined : { scale: 0.9, opacity: 0 }}
                  animate={prefersReducedMotion ? undefined : { scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <PlatformIcon
                    $color={platformConfig.color}
                    $isActive={isCompleted || isProcessing}
                  >
                    {platformConfig.icon}
                  </PlatformIcon>
                  <PlatformName>{platformConfig.name}</PlatformName>
                  {isProcessing && (
                    <Badge variant="primary" size="sm" dot pulse>
                      Processing
                    </Badge>
                  )}
                </PlatformItem>
                {isCompleted && (
                  <CompletedIcon>
                    <Check size={12} />
                  </CompletedIcon>
                )}
              </PlatformWrapper>
            );
          })}
        </PlatformsGrid>
      </Container>
    );
  }
);

JobProgress.displayName = 'JobProgress';
