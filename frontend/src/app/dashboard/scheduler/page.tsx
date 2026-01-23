'use client';

import { useState } from 'react';
import styled from 'styled-components';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Target,
} from 'lucide-react';
import { Button, Card, Input, Modal, useToast, PageHeader, SectionTitle, Form, EmptyState, Spinner, Label, MetaItem, SidebarLayout, Stack, TextArea } from '@/components/ui';
import {
  useOptimalTimes,
  useScheduledPosts,
  useEngagementPrediction,
  useCreateScheduledPost,
  useDeleteScheduledPost,
  useHeatmapData,
  TimeSlot,
} from '@/lib/scheduling';
import { TimingHeatmap } from '@/components/scheduler/TimingHeatmap';

const StyledSectionTitle = styled(SectionTitle)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const OptimalTimeItem = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ $selected, theme }) =>
    $selected ? theme.colors.primary[50] : theme.colors.background.secondary};
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.primary[300] : 'transparent'};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary[50]};
  }
`;

const TimeLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ScoreBadge = styled.span<{ $score: number }>`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  background-color: ${({ $score, theme }) =>
    $score >= 80
      ? theme.colors.success[100]
      : $score >= 60
        ? theme.colors.warning[100]
        : theme.colors.neutral[100]};
  color: ${({ $score, theme }) =>
    $score >= 80
      ? theme.colors.success[700]
      : $score >= 60
        ? theme.colors.warning[700]
        : theme.colors.neutral[700]};
`;

const ScheduledCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ScheduledHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const ScheduledContent = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.5;
`;

const ScheduledMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const PlatformBadge = styled.span<{ $platform: string }>`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  background-color: ${({ $platform, theme }) =>
    $platform === 'twitter'
      ? '#E8F5FD'
      : $platform === 'bluesky'
        ? '#E8F0FF'
        : theme.colors.primary[100]};
  color: ${({ $platform, theme }) =>
    $platform === 'twitter'
      ? '#1DA1F2'
      : $platform === 'bluesky'
        ? '#0085FF'
        : theme.colors.primary[700]};
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  background-color: ${({ $status, theme }) =>
    $status === 'published'
      ? theme.colors.success[100]
      : $status === 'failed'
        ? theme.colors.danger[100]
        : theme.colors.warning[100]};
  color: ${({ $status, theme }) =>
    $status === 'published'
      ? theme.colors.success[700]
      : $status === 'failed'
        ? theme.colors.danger[700]
        : theme.colors.warning[700]};
`;

const PlatformSelect = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const PlatformOption = styled.button<{ $selected: boolean }>`
  flex: 1;
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.primary[500] : theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ $selected, theme }) =>
    $selected ? theme.colors.primary[50] : 'transparent'};
  color: ${({ $selected, theme }) =>
    $selected ? theme.colors.primary[700] : theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary[300]};
  }
`;

const PredictionCard = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const PredictionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const PredictionTitle = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const PredictionScore = styled.span<{ $score: number }>`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ $score, theme }) =>
    $score >= 80
      ? theme.colors.success[600]
      : $score >= 60
        ? theme.colors.warning[600]
        : theme.colors.danger[600]};
`;

const SuggestionsList = styled.ul`
  margin: 0;
  padding-left: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};

  li {
    margin-bottom: ${({ theme }) => theme.spacing[1]};
  }
`;

export default function SchedulerPage() {
  const { addToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [platform, setPlatform] = useState<'twitter' | 'bluesky' | 'both'>('both');

  const { data: optimalTimes } = useOptimalTimes();
  const { data: scheduledPosts, isLoading } = useScheduledPosts();
  const { data: heatmapData, isLoading: heatmapLoading } = useHeatmapData();
  const engagementPrediction = useEngagementPrediction();
  const createPost = useCreateScheduledPost();
  const deletePost = useDeleteScheduledPost();

  const handleOptimalTimeSelect = (slot: TimeSlot) => {
    const now = new Date();
    const targetDate = new Date();
    const daysUntilTarget = (slot.day - now.getDay() + 7) % 7 || 7;
    targetDate.setDate(now.getDate() + daysUntilTarget);
    targetDate.setHours(slot.hour, 0, 0, 0);

    const formatted = targetDate.toISOString().slice(0, 16);
    setScheduledAt(formatted);

    if (content) {
      engagementPrediction.mutate({
        content,
        scheduledAt: formatted,
        hasMedia: false,
      });
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    if (value && scheduledAt) {
      engagementPrediction.mutate({
        content: value,
        scheduledAt,
        hasMedia: false,
      });
    }
  };

  const handleDateChange = (value: string) => {
    setScheduledAt(value);
    if (content && value) {
      engagementPrediction.mutate({
        content,
        scheduledAt: value,
        hasMedia: false,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !scheduledAt) return;

    try {
      await createPost.mutateAsync({ content, scheduledAt, platform });
      addToast({
        type: 'success',
        title: 'Post Scheduled',
        message: 'Your post has been scheduled successfully',
      });
      setIsModalOpen(false);
      setContent('');
      setScheduledAt('');
      setPlatform('both');
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to schedule post',
      });
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await deletePost.mutateAsync(postId);
      addToast({
        type: 'success',
        title: 'Post Deleted',
        message: 'Scheduled post has been removed',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete post',
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle size={12} />;
      case 'failed':
        return <AlertCircle size={12} />;
      default:
        return <Clock size={12} />;
    }
  };

  const pendingPosts = scheduledPosts?.filter((p) => p.status === 'pending') ?? [];
  const publishedPosts = scheduledPosts?.filter((p) => p.status !== 'pending') ?? [];

  const handleHeatmapCellSelect = (cell: { day: number; hour: number; score: number }) => {
    handleOptimalTimeSelect({
      day: cell.day,
      hour: cell.hour,
      score: cell.score,
      label: '',
      estimated: false,
    });
  };

  return (
    <div>
      <PageHeader
        title="Scheduler"
        description="Schedule posts with AI-powered optimal timing suggestions"
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            Schedule Post
          </Button>
        }
      />

      <SidebarLayout
        sidebar={
          <Card padding="md">
            <StyledSectionTitle>
              <Sparkles size={20} />
              Optimal Times
            </StyledSectionTitle>
            {optimalTimes ? (
              <>
                <Stack gap={2}>
                  {optimalTimes.best_times.map((slot, i) => (
                    <OptimalTimeItem
                      key={i}
                      onClick={() => handleOptimalTimeSelect(slot)}
                    >
                      <TimeLabel>
                        {slot.label}
                        {slot.estimated && ' *'}
                      </TimeLabel>
                      <ScoreBadge $score={slot.score}>{slot.score}%</ScoreBadge>
                    </OptimalTimeItem>
                  ))}
                </Stack>
                <MetaItem style={{ marginTop: '12px', fontSize: '11px' }}>
                  Based on {optimalTimes.based_on_posts} posts
                  {optimalTimes.data_quality && (
                    <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                      ({optimalTimes.data_quality} confidence)
                    </span>
                  )}
                </MetaItem>
                {optimalTimes.based_on_posts < 10 && (
                  <MetaItem style={{ marginTop: '4px', fontSize: '10px', opacity: 0.6 }}>
                    * Estimated based on industry best practices
                  </MetaItem>
                )}
              </>
            ) : (
              <Spinner size="sm" />
            )}
          </Card>
        }
      >
        <StyledSectionTitle>
          <Clock size={20} />
          Upcoming Posts ({pendingPosts.length})
        </StyledSectionTitle>

        {isLoading ? (
          <Card padding="lg">
            <Spinner size="md" />
          </Card>
        ) : pendingPosts.length > 0 ? (
          <Stack gap={3}>
            {pendingPosts.map((post) => (
                <ScheduledCard key={post.id} padding="md">
                  <ScheduledHeader>
                    <PlatformBadge $platform={post.platform}>
                      {post.platform === 'both' ? 'All Platforms' : post.platform}
                    </PlatformBadge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </ScheduledHeader>
                  <ScheduledContent>{post.content}</ScheduledContent>
                  <ScheduledMeta>
                    <MetaItem>
                      <Calendar size={14} />
                      {formatDate(post.scheduled_at)}
                    </MetaItem>
                    <MetaItem>
                      <Target size={14} />
                      {post.predicted_engagement}% predicted
                    </MetaItem>
                    <StatusBadge $status={post.status}>
                      {getStatusIcon(post.status)}
                      {post.status}
                    </StatusBadge>
                  </ScheduledMeta>
                </ScheduledCard>
              ))}
            </Stack>
          ) : (
            <Card padding="lg">
              <EmptyState
                icon={Calendar}
                title="No scheduled posts"
                description="Click 'Schedule Post' to create one."
              />
            </Card>
          )}

          {publishedPosts.length > 0 && (
            <>
              <SectionTitle style={{ marginTop: '32px' }}>
                <CheckCircle size={20} />
                Recently Published ({publishedPosts.length})
              </SectionTitle>
              <Stack gap={3}>
                {publishedPosts.map((post) => (
                  <ScheduledCard key={post.id} padding="md">
                    <ScheduledHeader>
                      <PlatformBadge $platform={post.platform}>
                        {post.platform === 'both' ? 'All Platforms' : post.platform}
                      </PlatformBadge>
                      <StatusBadge $status={post.status}>
                        {getStatusIcon(post.status)}
                        {post.status}
                      </StatusBadge>
                    </ScheduledHeader>
                    <ScheduledContent>{post.content}</ScheduledContent>
                    <ScheduledMeta>
                      <MetaItem>
                        <Calendar size={14} />
                        {formatDate(post.scheduled_at)}
                      </MetaItem>
                    </ScheduledMeta>
                  </ScheduledCard>
                ))}
              </Stack>
            </>
          )}
      </SidebarLayout>

      <Card padding="md" style={{ marginTop: '24px' }}>
        <StyledSectionTitle>
          <TrendingUp size={20} />
          Engagement Heatmap
        </StyledSectionTitle>
        <TimingHeatmap
          data={heatmapData}
          onCellSelect={handleHeatmapCellSelect}
          loading={heatmapLoading}
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule New Post"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || !scheduledAt}
              isLoading={createPost.isPending}
            >
              Schedule Post
            </Button>
          </>
        }
      >
        <Form onSubmit={handleSubmit}>
          <TextArea
            label="Content"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="What do you want to share?"
            maxLength={280}
            fullWidth
          />

          <div>
            <Label>Schedule For</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => handleDateChange(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              fullWidth
            />
          </div>

          <div>
            <Label>Platform</Label>
            <PlatformSelect>
              <PlatformOption
                type="button"
                $selected={platform === 'twitter'}
                onClick={() => setPlatform('twitter')}
              >
                Twitter
              </PlatformOption>
              <PlatformOption
                type="button"
                $selected={platform === 'bluesky'}
                onClick={() => setPlatform('bluesky')}
              >
                Bluesky
              </PlatformOption>
              <PlatformOption
                type="button"
                $selected={platform === 'both'}
                onClick={() => setPlatform('both')}
              >
                Both
              </PlatformOption>
            </PlatformSelect>
          </div>

          {engagementPrediction.data && (
            <PredictionCard>
              <PredictionHeader>
                <PredictionTitle>
                  <TrendingUp size={16} />
                  Engagement Prediction
                </PredictionTitle>
                <PredictionScore $score={engagementPrediction.data.score}>
                  {engagementPrediction.data.score}%
                </PredictionScore>
              </PredictionHeader>
              {engagementPrediction.data.suggested_improvements.length > 0 && (
                <SuggestionsList>
                  {engagementPrediction.data.suggested_improvements.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </SuggestionsList>
              )}
            </PredictionCard>
          )}

          {engagementPrediction.isPending && (
            <PredictionCard>
              <PredictionTitle>
                <TrendingUp size={16} />
                Analyzing engagement...
              </PredictionTitle>
            </PredictionCard>
          )}
        </Form>
      </Modal>
    </div>
  );
}
