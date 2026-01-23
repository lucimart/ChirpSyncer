/**
 * Lemmy API client hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Types
export interface LemmyCommunity {
  id: number;
  name: string;
  title: string;
  description?: string;
  removed: boolean;
  published: string;
  updated?: string;
  deleted: boolean;
  nsfw: boolean;
  actor_id: string;
  local: boolean;
  icon?: string;
  banner?: string;
  hidden: boolean;
  posting_restricted_to_mods: boolean;
  instance_id: number;
}

export interface LemmyCommunityView {
  community: LemmyCommunity;
  subscribed: 'Subscribed' | 'NotSubscribed' | 'Pending';
  blocked: boolean;
  counts: {
    id: number;
    community_id: number;
    subscribers: number;
    posts: number;
    comments: number;
    published: string;
    users_active_day: number;
    users_active_week: number;
    users_active_month: number;
    users_active_half_year: number;
  };
}

export interface LemmyPerson {
  id: number;
  name: string;
  display_name?: string;
  avatar?: string;
  banned: boolean;
  published: string;
  updated?: string;
  actor_id: string;
  bio?: string;
  local: boolean;
  banner?: string;
  deleted: boolean;
  matrix_user_id?: string;
  admin: boolean;
  bot_account: boolean;
  ban_expires?: string;
  instance_id: number;
}

export interface LemmyPost {
  id: number;
  name: string;
  url?: string;
  body?: string;
  creator_id: number;
  community_id: number;
  removed: boolean;
  locked: boolean;
  published: string;
  updated?: string;
  deleted: boolean;
  nsfw: boolean;
  embed_title?: string;
  embed_description?: string;
  thumbnail_url?: string;
  ap_id: string;
  local: boolean;
  embed_video_url?: string;
  language_id: number;
  featured_community: boolean;
  featured_local: boolean;
}

export interface LemmyPostView {
  post: LemmyPost;
  creator: LemmyPerson;
  community: LemmyCommunity;
  creator_banned_from_community: boolean;
  counts: {
    id: number;
    post_id: number;
    comments: number;
    score: number;
    upvotes: number;
    downvotes: number;
    published: string;
    newest_comment_time_necro: string;
    newest_comment_time: string;
  };
  subscribed: 'Subscribed' | 'NotSubscribed' | 'Pending';
  saved: boolean;
  read: boolean;
  creator_blocked: boolean;
  my_vote?: number;
  unread_comments: number;
}

export interface LemmyComment {
  id: number;
  creator_id: number;
  post_id: number;
  content: string;
  removed: boolean;
  published: string;
  updated?: string;
  deleted: boolean;
  ap_id: string;
  local: boolean;
  path: string;
  distinguished: boolean;
  language_id: number;
}

export interface LemmyCommentView {
  comment: LemmyComment;
  creator: LemmyPerson;
  post: LemmyPost;
  community: LemmyCommunity;
  counts: {
    id: number;
    comment_id: number;
    score: number;
    upvotes: number;
    downvotes: number;
    published: string;
    child_count: number;
  };
  creator_banned_from_community: boolean;
  subscribed: 'Subscribed' | 'NotSubscribed' | 'Pending';
  saved: boolean;
  creator_blocked: boolean;
  my_vote?: number;
}

export interface CreatePostInput {
  name: string;
  community_id: number;
  url?: string;
  body?: string;
  nsfw?: boolean;
  language_id?: number;
}

export interface CreateCommentInput {
  content: string;
  post_id: number;
  parent_id?: number;
}

// Query keys
export const lemmyKeys = {
  all: ['lemmy'] as const,
  site: () => [...lemmyKeys.all, 'site'] as const,
  user: (username?: string) => [...lemmyKeys.all, 'user', username] as const,
  communities: (params?: object) => [...lemmyKeys.all, 'communities', params] as const,
  community: (id?: number, name?: string) => [...lemmyKeys.all, 'community', id, name] as const,
  posts: (params?: object) => [...lemmyKeys.all, 'posts', params] as const,
  post: (id: number) => [...lemmyKeys.all, 'post', id] as const,
  comments: (params?: object) => [...lemmyKeys.all, 'comments', params] as const,
  search: (params?: object) => [...lemmyKeys.all, 'search', params] as const,
};

// Hooks
export function useLemmySite() {
  return useQuery({
    queryKey: lemmyKeys.site(),
    queryFn: async () => {
      const response = await api.get<unknown>('/lemmy/site');
      return response.data;
    },
  });
}

export function useLemmyUser(username?: string, personId?: number) {
  return useQuery({
    queryKey: lemmyKeys.user(username),
    queryFn: async () => {
      const response = await api.get<unknown>('/lemmy/user', {
        params: { username, person_id: personId },
      });
      return response.data;
    },
    enabled: !!(username || personId),
  });
}

export function useLemmyCommunities(params?: {
  sort?: string;
  limit?: number;
  page?: number;
  type_?: string;
}) {
  return useQuery({
    queryKey: lemmyKeys.communities(params),
    queryFn: async () => {
      const response = await api.get<{ data: { communities: LemmyCommunityView[] } }>(
        '/lemmy/community/list',
        { params }
      );
      return response.data?.communities;
    },
  });
}

export function useLemmyCommunity(id?: number, name?: string) {
  return useQuery({
    queryKey: lemmyKeys.community(id, name),
    queryFn: async () => {
      const response = await api.get<{ data: { community_view: LemmyCommunityView } }>(
        '/lemmy/community',
        { params: { id, name } }
      );
      return response.data?.community_view;
    },
    enabled: !!(id || name),
  });
}

export function useFollowLemmyCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ communityId, follow }: { communityId: number; follow: boolean }) => {
      const response = await api.post<{ data: { community_view: LemmyCommunityView } }>(
        '/lemmy/community/follow',
        { community_id: communityId, follow }
      );
      return response.data?.community_view;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lemmyKeys.communities() });
    },
  });
}

export function useLemmyPosts(params?: {
  sort?: string;
  limit?: number;
  page?: number;
  type_?: string;
  community_id?: number;
  community_name?: string;
}) {
  return useQuery({
    queryKey: lemmyKeys.posts(params),
    queryFn: async () => {
      const response = await api.get<{ data: { posts: LemmyPostView[] } }>('/lemmy/post/list', {
        params,
      });
      return response.data?.posts;
    },
  });
}

export function useLemmyPost(postId: number) {
  return useQuery({
    queryKey: lemmyKeys.post(postId),
    queryFn: async () => {
      const response = await api.get<{ data: { post_view: LemmyPostView } }>('/lemmy/post', {
        params: { id: postId },
      });
      return response.data?.post_view;
    },
    enabled: !!postId,
  });
}

export function useCreateLemmyPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const response = await api.post<{ data: { post_view: LemmyPostView } }>('/lemmy/post', input);
      return response.data?.post_view;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lemmyKeys.posts() });
    },
  });
}

export function useEditLemmyPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { post_id: number; name?: string; url?: string; body?: string; nsfw?: boolean }) => {
      const response = await api.put<{ data: { post_view: LemmyPostView } }>('/lemmy/post', input);
      return response.data?.post_view;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: lemmyKeys.post(variables.post_id) });
      queryClient.invalidateQueries({ queryKey: lemmyKeys.posts() });
    },
  });
}

export function useDeleteLemmyPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, deleted = true }: { postId: number; deleted?: boolean }) => {
      const response = await api.post<{ data: { post_view: LemmyPostView } }>('/lemmy/post/delete', {
        post_id: postId,
        deleted,
      });
      return response.data?.post_view;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lemmyKeys.posts() });
    },
  });
}

export function useVoteLemmyPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, score }: { postId: number; score: -1 | 0 | 1 }) => {
      const response = await api.post<{ data: { post_view: LemmyPostView } }>('/lemmy/post/like', {
        post_id: postId,
        score,
      });
      return response.data?.post_view;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: lemmyKeys.post(variables.postId) });
    },
  });
}

export function useLemmyComments(params?: { post_id?: number; sort?: string; limit?: number; page?: number }) {
  return useQuery({
    queryKey: lemmyKeys.comments(params),
    queryFn: async () => {
      const response = await api.get<{ data: { comments: LemmyCommentView[] } }>(
        '/lemmy/comment/list',
        { params }
      );
      return response.data?.comments;
    },
  });
}

export function useCreateLemmyComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      const response = await api.post<{ data: { comment_view: LemmyCommentView } }>(
        '/lemmy/comment',
        input
      );
      return response.data?.comment_view;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: lemmyKeys.comments({ post_id: variables.post_id }) });
    },
  });
}

export function useVoteLemmyComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, score }: { commentId: number; score: -1 | 0 | 1 }) => {
      const response = await api.post<{ data: { comment_view: LemmyCommentView } }>(
        '/lemmy/comment/like',
        { comment_id: commentId, score }
      );
      return response.data?.comment_view;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lemmyKeys.comments() });
    },
  });
}

export function useLemmySearch(params: {
  q: string;
  type_?: string;
  sort?: string;
  limit?: number;
  page?: number;
}) {
  return useQuery({
    queryKey: lemmyKeys.search(params),
    queryFn: async () => {
      const response = await api.get<unknown>('/lemmy/search', { params });
      return response.data;
    },
    enabled: !!params.q,
  });
}
