import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CanonicalPost } from './connectors';

// LinkedIn API Types

export interface LinkedInProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  profile_picture_url?: string;
  locale?: string;
}

export interface LinkedInUrn {
  urn: string;
  id: string;
}

export interface LinkedInPost {
  id: string;
  author: string;
  lifecycleState: string;
  visibility: string;
  commentary?: string;
  created?: {
    time: number;
  };
  content?: {
    article?: {
      source: string;
      title?: string;
      description?: string;
    };
    multiImage?: {
      images: Array<{ id: string }>;
    };
  };
  distribution?: {
    feedDistribution: string;
  };
}

export interface LinkedInPostsResponse {
  posts: LinkedInPost[];
  paging: {
    start?: number;
    count?: number;
    total?: number;
  };
}

export interface LinkedInComment {
  id: string;
  actor: string;
  message: {
    text: string;
  };
  created: {
    time: number;
  };
}

export interface LinkedInCommentsResponse {
  comments: LinkedInComment[];
  paging: {
    start?: number;
    count?: number;
  };
}

export interface LinkedInReaction {
  actor: string;
  reactionType: 'LIKE' | 'CELEBRATE' | 'SUPPORT' | 'LOVE' | 'INSIGHTFUL' | 'FUNNY';
  created: {
    time: number;
  };
}

export interface LinkedInReactionsResponse {
  reactions: LinkedInReaction[];
  paging: {
    start?: number;
    count?: number;
  };
}

export interface LinkedInPostAnalytics {
  post_id: string;
  total_shares: number;
  unique_impressions: number;
  engagement: number;
  click_count: number;
  like_count: number;
  comment_count: number;
}

export interface LinkedInOrganization {
  organization: string;
  role: string;
  state: string;
}

export interface LinkedInOrganizationsResponse {
  organizations: LinkedInOrganization[];
}

// Create post types
export interface CreateLinkedInPostRequest {
  text: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN';
  media_category?: 'NONE' | 'ARTICLE' | 'IMAGE';
  original_url?: string;
  title?: string;
  description?: string;
  image_urns?: string[];
}

export interface CreatePostResponse {
  id: string;
  urn: string;
  status: string;
}

export interface MediaUploadInitResponse {
  upload_url: string;
  asset_urn: string;
}

// Utility Functions

export function getProfileUrl(vanityName: string): string {
  return `https://linkedin.com/in/${vanityName}`;
}

export function getPostUrl(postUrn: string): string {
  // Extract the activity ID from the URN
  const activityId = postUrn.replace('urn:li:share:', '').replace('urn:li:activity:', '');
  return `https://linkedin.com/feed/update/${postUrn}`;
}

export function linkedInToCanonical(post: LinkedInPost): CanonicalPost {
  return {
    id: post.id,
    content: post.commentary || '',
    created_at: post.created ? new Date(post.created.time).toISOString() : new Date().toISOString(),
    author: {
      id: post.author,
      handle: post.author, // URN, would need separate API call for handle
      displayName: 'LinkedIn User', // Would need separate API call
    },
    media: post.content?.article ? [{
      type: 'image' as const,
      url: post.content.article.source,
    }] : undefined,
    metrics: { likes: 0, reposts: 0, replies: 0, quotes: 0 },
  };
}

// API Client

class LinkedInApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/linkedin${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data.data;
  }

  // Profile
  async getProfile(): Promise<LinkedInProfile> {
    return this.request('/profile');
  }

  async getProfileUrn(): Promise<LinkedInUrn> {
    return this.request('/profile/urn');
  }

  // Posts
  async getPosts(count = 10, start = 0): Promise<LinkedInPostsResponse> {
    const params = new URLSearchParams();
    params.set('count', String(count));
    params.set('start', String(start));
    return this.request(`/posts?${params.toString()}`);
  }

  async getPost(postId: string): Promise<LinkedInPost> {
    return this.request(`/post/${encodeURIComponent(postId)}`);
  }

  async createPost(data: CreateLinkedInPostRequest): Promise<CreatePostResponse> {
    return this.request('/post', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePost(postId: string): Promise<{ deleted: boolean; id: string }> {
    return this.request(`/post/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
    });
  }

  // Media Upload
  async initializeMediaUpload(ownerUrn?: string): Promise<MediaUploadInitResponse> {
    return this.request('/media/upload/initialize', {
      method: 'POST',
      body: JSON.stringify({ owner_urn: ownerUrn }),
    });
  }

  // Comments
  async getComments(postId: string, count = 10, start = 0): Promise<LinkedInCommentsResponse> {
    const params = new URLSearchParams();
    params.set('count', String(count));
    params.set('start', String(start));
    return this.request(`/post/${encodeURIComponent(postId)}/comments?${params.toString()}`);
  }

  async createComment(postId: string, text: string): Promise<LinkedInComment> {
    return this.request(`/post/${encodeURIComponent(postId)}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Reactions
  async getReactions(postId: string, count = 10): Promise<LinkedInReactionsResponse> {
    const params = new URLSearchParams();
    params.set('count', String(count));
    return this.request(`/post/${encodeURIComponent(postId)}/reactions?${params.toString()}`);
  }

  async react(
    postId: string,
    reactionType: 'LIKE' | 'CELEBRATE' | 'SUPPORT' | 'LOVE' | 'INSIGHTFUL' | 'FUNNY' = 'LIKE'
  ): Promise<{ reacted: boolean; type: string }> {
    return this.request(`/post/${encodeURIComponent(postId)}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction_type: reactionType }),
    });
  }

  async unreact(postId: string): Promise<{ unreacted: boolean }> {
    return this.request(`/post/${encodeURIComponent(postId)}/react`, {
      method: 'DELETE',
    });
  }

  // Analytics
  async getPostAnalytics(postId: string): Promise<LinkedInPostAnalytics> {
    return this.request(`/post/${encodeURIComponent(postId)}/analytics`);
  }

  // Organizations
  async getOrganizations(): Promise<LinkedInOrganizationsResponse> {
    return this.request('/organizations');
  }

  async getOrganizationPosts(orgId: string, count = 10, start = 0): Promise<LinkedInPostsResponse> {
    const params = new URLSearchParams();
    params.set('count', String(count));
    params.set('start', String(start));
    return this.request(`/organization/${encodeURIComponent(orgId)}/posts?${params.toString()}`);
  }
}

export const linkedInApi = new LinkedInApiClient();

// React Query Hooks

export function useLinkedInProfile() {
  return useQuery<LinkedInProfile>({
    queryKey: ['linkedin-profile'],
    queryFn: () => linkedInApi.getProfile(),
  });
}

export function useLinkedInProfileUrn() {
  return useQuery<LinkedInUrn>({
    queryKey: ['linkedin-profile-urn'],
    queryFn: () => linkedInApi.getProfileUrn(),
  });
}

export function useLinkedInPosts(count = 10, start = 0) {
  return useQuery<LinkedInPostsResponse>({
    queryKey: ['linkedin-posts', count, start],
    queryFn: () => linkedInApi.getPosts(count, start),
  });
}

export function useLinkedInPost(postId?: string) {
  return useQuery<LinkedInPost>({
    queryKey: ['linkedin-post', postId],
    queryFn: () => linkedInApi.getPost(postId!),
    enabled: !!postId,
  });
}

export function useLinkedInComments(postId?: string, count = 10) {
  return useQuery<LinkedInCommentsResponse>({
    queryKey: ['linkedin-comments', postId, count],
    queryFn: () => linkedInApi.getComments(postId!, count),
    enabled: !!postId,
  });
}

export function useLinkedInReactions(postId?: string) {
  return useQuery<LinkedInReactionsResponse>({
    queryKey: ['linkedin-reactions', postId],
    queryFn: () => linkedInApi.getReactions(postId!),
    enabled: !!postId,
  });
}

export function useLinkedInPostAnalytics(postId?: string) {
  return useQuery<LinkedInPostAnalytics>({
    queryKey: ['linkedin-analytics', postId],
    queryFn: () => linkedInApi.getPostAnalytics(postId!),
    enabled: !!postId,
  });
}

export function useLinkedInOrganizations() {
  return useQuery<LinkedInOrganizationsResponse>({
    queryKey: ['linkedin-organizations'],
    queryFn: () => linkedInApi.getOrganizations(),
  });
}

export function useLinkedInOrganizationPosts(orgId?: string, count = 10) {
  return useQuery<LinkedInPostsResponse>({
    queryKey: ['linkedin-org-posts', orgId, count],
    queryFn: () => linkedInApi.getOrganizationPosts(orgId!, count),
    enabled: !!orgId,
  });
}

export function useCreateLinkedInPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLinkedInPostRequest) => linkedInApi.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedin-posts'] });
    },
  });
}

export function useDeleteLinkedInPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => linkedInApi.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedin-posts'] });
    },
  });
}

export function useLinkedInReact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, reactionType }: { postId: string; reactionType?: 'LIKE' | 'CELEBRATE' | 'SUPPORT' | 'LOVE' | 'INSIGHTFUL' | 'FUNNY' }) =>
      linkedInApi.react(postId, reactionType),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['linkedin-reactions', postId] });
    },
  });
}

export function useLinkedInUnreact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => linkedInApi.unreact(postId),
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['linkedin-reactions', postId] });
    },
  });
}

export function useCreateLinkedInComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, text }: { postId: string; text: string }) =>
      linkedInApi.createComment(postId, text),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['linkedin-comments', postId] });
    },
  });
}

export function useInitializeMediaUpload() {
  return useMutation({
    mutationFn: (ownerUrn?: string) => linkedInApi.initializeMediaUpload(ownerUrn),
  });
}

// LinkedIn limitations
export const LINKEDIN_LIMITATIONS = {
  maxTextLength: 3000,
  maxMediaItems: 20, // For carousel
  maxImageSize: 8 * 1024 * 1024, // 8MB
  maxVideoSize: 200 * 1024 * 1024, // 200MB
  maxVideoDuration: 600, // 10 minutes
  supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif'],
  supportedVideoFormats: ['video/mp4', 'video/mpeg', 'video/quicktime'],
  visibilityOptions: ['PUBLIC', 'CONNECTIONS', 'LOGGED_IN'],
  reactionTypes: ['LIKE', 'CELEBRATE', 'SUPPORT', 'LOVE', 'INSIGHTFUL', 'FUNNY'],
};
