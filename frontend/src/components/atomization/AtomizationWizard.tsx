'use client';

import { memo, FC, useState, useCallback, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  FileInput,
  Eye,
  Edit3,
  Send,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Check,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Stack } from '@/components/ui/Stack';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert } from '@/components/ui/Alert';
import { SourceInput } from './SourceInput';
import { SourcePreview } from './SourcePreview';
import { JobProgress } from './JobProgress';
import { OutputCard } from './OutputCard';
import { OutputEditor } from './OutputEditor';
import {
  useCreateJob,
  useProcessJob,
  useAtomizationJob,
  useJobOutputs,
  usePublishOutput,
  useScheduleOutput,
  type CreateJobParams,
  type AtomizedContent,
  type PlatformType,
  type JobStatus,
  PLATFORM_CONFIG,
} from '@/lib/atomization';

export interface AtomizationWizardProps {
  initialStep?: number;
  jobId?: string;
  onComplete?: () => void;
  // For testing
  mockJobStatus?: JobStatus;
  mockError?: string;
  showPlatformSelection?: boolean;
}

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const StepsContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`;

const Step = styled.div<{ $active: boolean; $completed: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  position: relative;
`;

const StepCircle = styled(motion.div)<{ $active: boolean; $completed: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  background-color: ${({ theme, $active, $completed }) => {
    if ($completed) return theme.colors.success[500];
    if ($active) return theme.colors.primary[600];
    return theme.colors.background.tertiary;
  }};
  color: ${({ theme, $active, $completed }) => {
    if ($completed || $active) return 'white';
    return theme.colors.text.tertiary;
  }};
  border: 2px solid ${({ theme, $active, $completed }) => {
    if ($completed) return theme.colors.success[500];
    if ($active) return theme.colors.primary[600];
    return theme.colors.border.default;
  }};
  transition: all ${({ theme }) => theme.transitions.normal};
`;

const StepLabel = styled.span<{ $active: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  font-weight: ${({ theme, $active }) =>
    $active ? theme.fontWeights.medium : theme.fontWeights.normal};
`;

const StepConnector = styled.div<{ $completed: boolean }>`
  width: 60px;
  height: 2px;
  background-color: ${({ theme, $completed }) =>
    $completed ? theme.colors.success[500] : theme.colors.border.light};
  margin: 0 ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  transition: background-color ${({ theme }) => theme.transitions.normal};
`;

const ContentCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const StepHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const StepTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[2]} 0;
`;

const StepSubtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const OutputsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const PlatformSelection = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const PlatformOption = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary[300]};
    background-color: ${({ theme }) => theme.colors.primary[50]};
  }
`;

const PlatformIcon = styled.div<{ $color: string }>`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $color }) => $color};
  color: white;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const PlatformLabel = styled.span`
  flex: 1;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const STEPS = [
  { id: 1, label: 'Input', icon: FileInput },
  { id: 2, label: 'Preview', icon: Eye },
  { id: 3, label: 'Edit', icon: Edit3 },
  { id: 4, label: 'Publish', icon: Send },
];

const PLATFORMS: PlatformType[] = ['twitter', 'linkedin', 'medium', 'instagram'];

export const AtomizationWizard: FC<AtomizationWizardProps> = memo(
  ({
    initialStep = 1,
    jobId: initialJobId,
    onComplete,
    mockJobStatus,
    mockError,
    showPlatformSelection,
  }) => {
    const [currentStep, setCurrentStep] = useState(initialStep);
    const [jobId, setJobId] = useState(initialJobId);
    const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>(PLATFORMS);
    const [editingOutput, setEditingOutput] = useState<AtomizedContent | null>(null);
    const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());

    const prefersReducedMotion = useReducedMotion();

    // API hooks
    const createJobMutation = useCreateJob();
    const processJobMutation = useProcessJob();
    const publishMutation = usePublishOutput();
    const scheduleMutation = useScheduleOutput();

    const { data: job, refetch: refetchJob } = useAtomizationJob(jobId || '');
    const { data: outputs = [], refetch: refetchOutputs } = useJobOutputs(jobId || '');

    // Use mock status for testing, otherwise use real job status
    const jobStatus: JobStatus = mockJobStatus || job?.status || 'pending';
    const jobError = mockError || job?.error;

    // Watch for job completion
    useEffect(() => {
      if (jobStatus === 'completed' && currentStep === 2) {
        setCurrentStep(3);
      }
    }, [jobStatus, currentStep]);

    const handleSourceSubmit = useCallback(async (params: CreateJobParams) => {
      try {
        const newJob = await createJobMutation.mutateAsync(params);
        setJobId(newJob.id);

        // Auto-process the job
        await processJobMutation.mutateAsync(newJob.id);
        setCurrentStep(2);
      } catch (error) {
        // Error handled by mutation
      }
    }, [createJobMutation, processJobMutation]);

    const handleRetry = useCallback(async () => {
      if (jobId) {
        await processJobMutation.mutateAsync(jobId);
      }
    }, [jobId, processJobMutation]);

    const handleBack = useCallback(() => {
      setCurrentStep((prev) => Math.max(1, prev - 1));
    }, []);

    const handleNext = useCallback(() => {
      setCurrentStep((prev) => Math.min(4, prev + 1));
    }, []);

    const handlePlatformToggle = useCallback((platform: PlatformType) => {
      setSelectedPlatforms((prev) =>
        prev.includes(platform)
          ? prev.filter((p) => p !== platform)
          : [...prev, platform]
      );
    }, []);

    const handleEditOutput = useCallback((output: AtomizedContent) => {
      setEditingOutput(output);
    }, []);

    const handleSaveEdit = useCallback((content: string) => {
      // In a real implementation, this would call an API to update the content
      setEditingOutput(null);
      refetchOutputs();
    }, [refetchOutputs]);

    const handlePublish = useCallback(async (outputId: string) => {
      if (!jobId) return;

      setPublishingIds((prev) => new Set([...prev, outputId]));
      try {
        await publishMutation.mutateAsync({
          jobId,
          outputIds: [outputId],
        });
        refetchOutputs();
      } finally {
        setPublishingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(outputId);
          return newSet;
        });
      }
    }, [jobId, publishMutation, refetchOutputs]);

    const handleSchedule = useCallback((outputId: string) => {
      // In a real implementation, this would open a date picker modal
      alert('Schedule feature coming soon!');
    }, []);

    const handlePublishAll = useCallback(async () => {
      if (!jobId) return;

      const unpublishedIds = outputs
        .filter((o) => !o.is_published && selectedPlatforms.includes(o.platform))
        .map((o) => o.id);

      try {
        await publishMutation.mutateAsync({
          jobId,
          outputIds: unpublishedIds,
        });
        refetchOutputs();
        onComplete?.();
      } catch (error) {
        // Error handled by mutation
      }
    }, [jobId, outputs, selectedPlatforms, publishMutation, refetchOutputs, onComplete]);

    const handleFinish = useCallback(() => {
      onComplete?.();
    }, [onComplete]);

    const filteredOutputs = useMemo(() => {
      return outputs.filter((o) => selectedPlatforms.includes(o.platform));
    }, [outputs, selectedPlatforms]);

    const completedPlatforms = useMemo(() => {
      return outputs.map((o) => o.platform);
    }, [outputs]);

    const isLoading = createJobMutation.isPending || processJobMutation.isPending;

    const renderStepContent = () => {
      switch (currentStep) {
        case 1:
          return (
            <>
              <StepHeader>
                <StepTitle>Step 1: Input Source</StepTitle>
                <StepSubtitle>
                  Paste a URL or content to transform into platform-optimized formats.
                </StepSubtitle>
              </StepHeader>
              <SourceInput onSubmit={handleSourceSubmit} isLoading={isLoading} />
            </>
          );

        case 2:
          return (
            <>
              <StepHeader>
                <StepTitle>Step 2: Processing</StepTitle>
                <StepSubtitle>
                  Transforming your content for each platform...
                </StepSubtitle>
              </StepHeader>
              <JobProgress
                status={jobStatus}
                completedPlatforms={completedPlatforms}
                error={jobError}
              />
              {jobStatus === 'failed' && (
                <Stack direction="row" justify="center" style={{ marginTop: 24 }}>
                  <Button
                    variant="primary"
                    leftIcon={<RefreshCw size={16} />}
                    onClick={handleRetry}
                    isLoading={processJobMutation.isPending}
                  >
                    Try Again
                  </Button>
                </Stack>
              )}
              {showPlatformSelection && jobStatus === 'pending' && (
                <PlatformSelection>
                  {PLATFORMS.map((platform) => {
                    const config = PLATFORM_CONFIG[platform];
                    return (
                      <PlatformOption key={platform}>
                        <Checkbox
                          checked={selectedPlatforms.includes(platform)}
                          onChange={() => handlePlatformToggle(platform)}
                          label=""
                          aria-label={config.name}
                        />
                        <PlatformIcon $color={config.color}>
                          {config.icon}
                        </PlatformIcon>
                        <PlatformLabel>{config.name}</PlatformLabel>
                      </PlatformOption>
                    );
                  })}
                </PlatformSelection>
              )}
            </>
          );

        case 3:
          return (
            <>
              <StepHeader>
                <StepTitle>Step 3: Review Outputs</StepTitle>
                <StepSubtitle>
                  Review and edit the generated content for each platform.
                </StepSubtitle>
              </StepHeader>
              <OutputsGrid>
                {filteredOutputs.map((output) => (
                  <OutputCard
                    key={output.id}
                    output={output}
                    onEdit={handleEditOutput}
                    onPublish={handlePublish}
                    onSchedule={handleSchedule}
                    isPublishing={publishingIds.has(output.id)}
                  />
                ))}
              </OutputsGrid>
              {filteredOutputs.length === 0 && (
                <Alert variant="info" title="No outputs">
                  No content has been generated yet. Please go back and process your content.
                </Alert>
              )}
            </>
          );

        case 4:
          return (
            <>
              <StepHeader>
                <StepTitle>Step 4: Publish</StepTitle>
                <StepSubtitle>
                  Choose how to publish your content to each platform.
                </StepSubtitle>
              </StepHeader>
              <Stack direction="column" gap={4}>
                <Alert variant="success" title="Ready to publish">
                  Your content is ready to be published to {filteredOutputs.length} platforms.
                </Alert>
                <OutputsGrid>
                  {filteredOutputs.map((output) => (
                    <OutputCard
                      key={output.id}
                      output={output}
                      onPublish={handlePublish}
                      onSchedule={handleSchedule}
                      isPublishing={publishingIds.has(output.id)}
                    />
                  ))}
                </OutputsGrid>
                <Stack direction="row" justify="center" gap={3}>
                  <Button
                    variant="primary"
                    size="lg"
                    leftIcon={<Send size={18} />}
                    onClick={handlePublishAll}
                    isLoading={publishMutation.isPending}
                  >
                    Publish All
                  </Button>
                </Stack>
              </Stack>
            </>
          );

        default:
          return null;
      }
    };

    return (
      <Container>
        <StepsContainer>
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const StepIcon = step.icon;

            return (
              <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
                <Step $active={isActive} $completed={isCompleted}>
                  <StepCircle
                    $active={isActive}
                    $completed={isCompleted}
                    initial={false}
                    animate={
                      prefersReducedMotion
                        ? undefined
                        : { scale: isActive ? 1.1 : 1 }
                    }
                  >
                    {isCompleted ? <Check size={18} /> : step.id}
                  </StepCircle>
                  <StepLabel $active={isActive}>{step.label}</StepLabel>
                </Step>
                {index < STEPS.length - 1 && (
                  <StepConnector $completed={isCompleted} />
                )}
              </div>
            );
          })}
        </StepsContainer>

        <ContentCard padding="lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </ContentCard>

        <Footer>
          <Button
            variant="ghost"
            leftIcon={<ChevronLeft size={16} />}
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            Back
          </Button>

          {currentStep < 4 && currentStep !== 1 && (
            <Button
              variant="primary"
              rightIcon={<ChevronRight size={16} />}
              onClick={handleNext}
              disabled={
                (currentStep === 2 && jobStatus !== 'completed') ||
                (currentStep === 3 && filteredOutputs.length === 0)
              }
            >
              Next
            </Button>
          )}

          {currentStep === 4 && (
            <Button variant="primary" onClick={handleFinish}>
              Finish
            </Button>
          )}
        </Footer>

        {editingOutput && (
          <OutputEditor
            output={editingOutput}
            isOpen={true}
            onClose={() => setEditingOutput(null)}
            onSave={handleSaveEdit}
          />
        )}
      </Container>
    );
  }
);

AtomizationWizard.displayName = 'AtomizationWizard';
