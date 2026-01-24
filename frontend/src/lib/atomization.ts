/**
 * Atomization API Client
 *
 * Hooks and utilities for content atomization feature.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Types
export type SourceType = 'youtube' | 'video' | 'blog' | 'thread' | 'text';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PlatformType = 'twitter' | 'linkedin' | 'medium' | 'instagram';
export type ContentFormat = 'thread' | 'post' | 'article' | 'carousel';

export interface AtomizationJob {
  id: string;
  source_type: SourceType;
  source_url?: string;
  source_content?: string;
  status: JobStatus;
  created_at: string;
  completed_at?: string;
  error?: string;
}

export interface AtomizedContent {
  id: string;
  job_id: string;
  platform: PlatformType;
  format: ContentFormat;
  content: string;
  media_urls: string[];
  is_published: boolean;
  scheduled_for?: string;
  published_at?: string;
  created_at: string;
}

export interface CreateJobParams {
  source_type: SourceType;
  source_url?: string;
  source_content?: string;
}

export interface ScheduleParams {
  output_id: string;
  scheduled_for: number;
}

export interface JobsResponse {
  jobs: AtomizationJob[];
}

export interface OutputsResponse {
  outputs: AtomizedContent[];
}

export interface ProcessResponse {
  job: AtomizationJob;
  outputs: AtomizedContent[];
}

export interface PublishResponse {
  published: string[];
  failed: string[];
}

export interface ScheduleResponse {
  scheduled: string[];
  failed: string[];
}

// Platform configuration
export const PLATFORM_CONFIG: Record<
  PlatformType,
  {
    name: string;
    icon: string;
    color: string;
    charLimit: number;
    formats: ContentFormat[];
  }
> = {
  twitter: {
    name: 'Twitter/X',
    icon: 'X',
    color: '#000000',
    charLimit: 280,
    formats: ['thread', 'post'],
  },
  linkedin: {
    name: 'LinkedIn',
    icon: 'in',
    color: '#0A66C2',
    charLimit: 3000,
    formats: ['post', 'article'],
  },
  medium: {
    name: 'Medium',
    icon: 'M',
    color: '#000000',
    charLimit: 50000,
    formats: ['article'],
  },
  instagram: {
    name: 'Instagram',
    icon: 'IG',
    color: '#E4405F',
    charLimit: 2200,
    formats: ['post', 'carousel'],
  },
};

// Source type detection
export function detectSourceType(input: string): SourceType {
  const url = input.trim().toLowerCase();

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return 'blog';
  }

  // Check if it looks like a Twitter/X thread
  if (input.includes('1/') || input.includes('Thread:')) {
    return 'thread';
  }

  return 'text';
}

// Query keys
export const atomizationKeys = {
  all: ['atomization'] as const,
  jobs: () => [...atomizationKeys.all, 'jobs'] as const,
  job: (id: string) => [...atomizationKeys.all, 'job', id] as const,
  outputs: (jobId: string) => [...atomizationKeys.all, 'outputs', jobId] as const,
};

// Hooks
export function useAtomizationJobs(status?: JobStatus) {
  return useQuery({
    queryKey: [...atomizationKeys.jobs(), { status }],
    queryFn: async () => {
      const params = status ? { status } : undefined;
      const response = await api.get<JobsResponse>('/atomize', { params });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch jobs');
      }
      return response.data?.jobs || [];
    },
  });
}

export function useAtomizationJob(id: string) {
  return useQuery({
    queryKey: atomizationKeys.job(id),
    queryFn: async () => {
      const response = await api.get<AtomizationJob>(`/atomize/${id}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch job');
      }
      return response.data!;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll while processing
      if (data?.status === 'processing') {
        return 2000;
      }
      return false;
    },
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateJobParams) => {
      const response = await api.post<AtomizationJob>('/atomize', params);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create job');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: atomizationKeys.jobs() });
    },
  });
}

export function useProcessJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.post<ProcessResponse>(`/atomize/${jobId}/process`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to process job');
      }
      return response.data!;
    },
    onSuccess: (data, jobId) => {
      queryClient.invalidateQueries({ queryKey: atomizationKeys.job(jobId) });
      queryClient.invalidateQueries({ queryKey: atomizationKeys.outputs(jobId) });
      queryClient.invalidateQueries({ queryKey: atomizationKeys.jobs() });
    },
  });
}

export function useJobOutputs(jobId: string) {
  return useQuery({
    queryKey: atomizationKeys.outputs(jobId),
    queryFn: async () => {
      const response = await api.get<OutputsResponse>(`/atomize/${jobId}/outputs`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch outputs');
      }
      return response.data?.outputs || [];
    },
    enabled: !!jobId,
  });
}

export function usePublishOutput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, outputIds }: { jobId: string; outputIds?: string[] }) => {
      const response = await api.post<PublishResponse>(`/atomize/${jobId}/publish`, {
        output_ids: outputIds,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to publish');
      }
      return response.data!;
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: atomizationKeys.outputs(jobId) });
    },
  });
}

export function useScheduleOutput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, schedules }: { jobId: string; schedules: ScheduleParams[] }) => {
      const response = await api.post<ScheduleResponse>(`/atomize/${jobId}/schedule`, {
        schedules,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to schedule');
      }
      return response.data!;
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: atomizationKeys.outputs(jobId) });
    },
  });
}

// Utility functions
export function formatCharCount(count: number, limit: number): string {
  const remaining = limit - count;
  if (remaining < 0) {
    return `-${Math.abs(remaining)}`;
  }
  return remaining.toString();
}

export function getCharCountColor(count: number, limit: number): 'default' | 'warning' | 'danger' {
  const percentage = (count / limit) * 100;
  if (percentage >= 100) return 'danger';
  if (percentage >= 80) return 'warning';
  return 'default';
}

export function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength - 3) + '...';
}

export function splitIntoThreadParts(content: string): string[] {
  // Split by --- separator for thread format
  return content.split(/\n---\n/).map((part) => part.trim()).filter(Boolean);
}
