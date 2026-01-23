/**
 * Outgoing Webhooks API client hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Types
export interface WebhookResult {
  success: boolean;
  status_code: number;
  response_time_ms: number;
  response_headers?: Record<string, string>;
  response_body?: unknown;
  webhook_id: string;
  timestamp: string;
}

export interface WebhookTestResult {
  success: boolean;
  status_code?: number;
  response_time_ms?: number;
  test_payload: Record<string, unknown>;
  response_preview?: string;
  error?: string;
}

export interface BatchWebhookResult {
  url: string | null;
  success: boolean;
  status_code?: number;
  response_time_ms?: number;
  error?: string;
}

export interface BatchWebhookResponse {
  total: number;
  sent: number;
  successful: number;
  failed: number;
  results: BatchWebhookResult[];
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  payload_template: Record<string, unknown>;
  secret?: string;
  enabled: boolean;
  created_at: string;
}

export interface SignatureVerification {
  valid: boolean;
  expected: string;
  received: string;
  algorithm: string;
}

export interface SendWebhookInput {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload?: Record<string, unknown>;
  headers?: Record<string, string>;
  content_type?: string;
  timeout?: number;
  secret?: string;
  signature_header?: string;
  signature_algorithm?: 'sha256' | 'sha1';
}

export interface WebhookConfigInput {
  name: string;
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  payload_template?: Record<string, unknown>;
  secret?: string;
  enabled?: boolean;
}

export interface BatchWebhook {
  url: string;
  payload?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
}

// Query keys
export const webhookKeys = {
  all: ['outgoing-webhooks'] as const,
  configs: () => [...webhookKeys.all, 'configs'] as const,
  config: (id: string) => [...webhookKeys.all, 'config', id] as const,
};

// Hooks
export function useWebhookConfigs() {
  return useQuery({
    queryKey: webhookKeys.configs(),
    queryFn: async () => {
      const response = await api.get<{ data: { configs: WebhookConfig[] } }>(
        '/outgoing-webhooks/configs'
      );
      return response.data.data.configs;
    },
  });
}

export function useSendWebhook() {
  return useMutation({
    mutationFn: async (input: SendWebhookInput) => {
      const response = await api.post<{ data: WebhookResult }>('/outgoing-webhooks/send', input);
      return response.data.data;
    },
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: async (url: string) => {
      const response = await api.post<{ data: WebhookTestResult }>('/outgoing-webhooks/test', {
        url,
      });
      return response.data.data;
    },
  });
}

export function useSendBatchWebhooks() {
  return useMutation({
    mutationFn: async ({
      webhooks,
      payload,
      failFast,
    }: {
      webhooks: BatchWebhook[];
      payload?: Record<string, unknown>;
      failFast?: boolean;
    }) => {
      const response = await api.post<{ data: BatchWebhookResponse }>('/outgoing-webhooks/batch', {
        webhooks,
        payload,
        fail_fast: failFast,
      });
      return response.data.data;
    },
  });
}

export function useApplyPayloadTemplate() {
  return useMutation({
    mutationFn: async ({
      template,
      variables,
    }: {
      template: Record<string, unknown>;
      variables: Record<string, string | number | boolean>;
    }) => {
      const response = await api.post<{
        data: {
          original: Record<string, unknown>;
          variables: Record<string, unknown>;
          result: Record<string, unknown>;
        };
      }>('/outgoing-webhooks/templates', { template, variables });
      return response.data.data;
    },
  });
}

export function useSaveWebhookConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WebhookConfigInput) => {
      const response = await api.post<{ data: WebhookConfig }>('/outgoing-webhooks/configs', input);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.configs() });
    },
  });
}

export function useDeleteWebhookConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (configId: string) => {
      await api.delete(`/outgoing-webhooks/configs/${configId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.configs() });
    },
  });
}

export function useVerifyWebhookSignature() {
  return useMutation({
    mutationFn: async ({
      payload,
      secret,
      signature,
      algorithm,
    }: {
      payload: string | Record<string, unknown>;
      secret: string;
      signature: string;
      algorithm?: 'sha256' | 'sha1';
    }) => {
      const response = await api.post<{ data: SignatureVerification }>(
        '/outgoing-webhooks/verify-signature',
        {
          payload,
          secret,
          signature,
          algorithm,
        }
      );
      return response.data.data;
    },
  });
}
