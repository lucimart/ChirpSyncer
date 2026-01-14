/**
 * Sprint 19: Feed Scoring Engine
 * TDD Stubs - Implementation pending
 */

// Types
export interface Post {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    handle: string;
    displayName: string;
  };
  platform: string;
  metrics?: {
    likes: number;
    reposts: number;
    replies: number;
  };
  labels?: string[];
  language?: string | null;
}

export interface Condition {
  field: string;
  operator: 'contains' | 'equals' | 'gt' | 'lt' | 'regex';
  value: string | number;
}

export interface FeedRule {
  id: string;
  name: string;
  type: 'boost' | 'demote' | 'filter';
  weight?: number;
  enabled: boolean;
  condition: Condition;
}

export interface ScoredPost extends Post {
  score: number;
}

export interface FeedPreviewStats {
  avgScore: number;
  minScore: number;
  maxScore: number;
  totalPosts: number;
  filteredPosts: number;
  visiblePosts: number;
}

export interface FeedPreviewResult {
  posts: ScoredPost[];
  stats: FeedPreviewStats;
}

// Helper to get nested field value
function getFieldValue(obj: any, path: string): any {
  const parts = path.split('.');
  let value = obj;
  for (const part of parts) {
    if (value === undefined || value === null) return undefined;
    value = value[part];
  }
  return value;
}

// Calculate age in hours
function getAgeHours(post: Post): number {
  const created = new Date(post.created_at).getTime();
  const now = Date.now();
  return (now - created) / (1000 * 60 * 60);
}

// Calculate engagement ratio
function getEngagementRatio(post: Post): number {
  if (!post.metrics || post.metrics.likes === 0) return 0;
  const total = post.metrics.likes + post.metrics.reposts + post.metrics.replies;
  return total / post.metrics.likes;
}

// Evaluate a single condition against a post
export function evaluateCondition(post: Post, condition: Condition): boolean {
  let fieldValue: any;

  // Handle special computed fields
  if (condition.field === 'age_hours') {
    fieldValue = getAgeHours(post);
  } else if (condition.field === 'engagement_ratio') {
    fieldValue = getEngagementRatio(post);
  } else {
    fieldValue = getFieldValue(post, condition.field);
  }

  // Handle undefined/null values
  if (fieldValue === undefined || fieldValue === null) {
    return false;
  }

  switch (condition.operator) {
    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(v =>
          String(v).toLowerCase().includes(String(condition.value).toLowerCase())
        );
      }
      return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());

    case 'equals':
      return fieldValue === condition.value;

    case 'gt':
      return Number(fieldValue) > Number(condition.value);

    case 'lt':
      return Number(fieldValue) < Number(condition.value);

    case 'regex':
      try {
        const regex = new RegExp(String(condition.value));
        return regex.test(String(fieldValue));
      } catch {
        return false;
      }

    default:
      return false;
  }
}

// Apply boost rule and return score adjustment
export function applyBoostRule(post: Post, rule: FeedRule): number {
  if (!rule.enabled || rule.type !== 'boost') return 0;
  if (!evaluateCondition(post, rule.condition)) return 0;
  return rule.weight || 0;
}

// Apply demote rule and return score adjustment (negative)
export function applyDemoteRule(post: Post, rule: FeedRule): number {
  if (!rule.enabled || rule.type !== 'demote') return 0;
  if (!evaluateCondition(post, rule.condition)) return 0;
  return -(rule.weight || 0);
}

// Apply filter rule - returns false if post should be hidden
export function applyFilterRule(post: Post, rule: FeedRule): boolean {
  if (!rule.enabled || rule.type !== 'filter') return true;
  if (evaluateCondition(post, rule.condition)) return false;
  return true;
}

// Calculate final score for a post with all rules applied
export function calculatePostScore(post: Post, rules: FeedRule[]): number {
  const BASE_SCORE = 50;
  let score = BASE_SCORE;

  for (const rule of rules) {
    if (!rule.enabled) continue;

    if (rule.type === 'boost') {
      score += applyBoostRule(post, rule);
    } else if (rule.type === 'demote') {
      score += applyDemoteRule(post, rule);
    }
  }

  // Clamp score to 0-100
  return Math.max(0, Math.min(100, score));
}

// Hook: Score and sort posts
export function useScoredFeed(posts: Post[], rules: FeedRule[]) {
  const scoredPosts: ScoredPost[] = posts.map(post => ({
    ...post,
    score: calculatePostScore(post, rules),
  }));

  // Sort by score descending
  scoredPosts.sort((a, b) => b.score - a.score);

  return {
    data: scoredPosts,
    isLoading: false,
    error: null,
  };
}

// Hook: Filter posts based on filter rules
export function useFilteredFeed(posts: Post[], rules: FeedRule[]) {
  const filterRules = rules.filter(r => r.type === 'filter');

  const filteredPosts = posts.filter(post => {
    for (const rule of filterRules) {
      if (!applyFilterRule(post, rule)) return false;
    }
    return true;
  });

  return {
    data: filteredPosts,
    isLoading: false,
    error: null,
  };
}

// Sample posts for preview
const samplePosts: Post[] = [
  {
    id: 'sample-1',
    content: 'Exploring new technology trends in AI and machine learning',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    author: { id: '1', handle: 'techuser', displayName: 'Tech User' },
    platform: 'bluesky',
    metrics: { likes: 100, reposts: 20, replies: 10 },
  },
  {
    id: 'sample-2',
    content: 'Regular update about my day',
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    author: { id: '2', handle: 'normaluser', displayName: 'Normal User' },
    platform: 'mastodon',
    metrics: { likes: 10, reposts: 2, replies: 1 },
  },
  {
    id: 'sample-3',
    content: 'NSFW content warning',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    author: { id: '3', handle: 'adultuser', displayName: 'Adult User' },
    platform: 'bluesky',
    metrics: { likes: 5, reposts: 0, replies: 0 },
    labels: ['nsfw'],
  },
];

// Hook: Generate preview of how rules would affect feed
export function useFeedPreview(rules: FeedRule[]) {
  const { data: filteredPosts } = useFilteredFeed(samplePosts, rules);
  const { data: scoredPosts } = useScoredFeed(filteredPosts || [], rules);

  const posts = scoredPosts || [];
  const scores = posts.map(p => p.score);

  const stats: FeedPreviewStats = {
    avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    minScore: scores.length > 0 ? Math.min(...scores) : 0,
    maxScore: scores.length > 0 ? Math.max(...scores) : 0,
    totalPosts: samplePosts.length,
    filteredPosts: samplePosts.length - (filteredPosts?.length || 0),
    visiblePosts: filteredPosts?.length || 0,
  };

  return {
    data: { posts, stats },
    isLoading: false,
    error: null,
  };
}
