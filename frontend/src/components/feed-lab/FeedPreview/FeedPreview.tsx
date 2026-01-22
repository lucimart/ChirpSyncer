import React from 'react';
import { WhyAmISeeingThis } from '../WhyAmISeeingThis';

interface Post {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  score: number;
  appliedRules: Array<{
    ruleId: string;
    ruleName: string;
    contribution: number;
  }>;
}

interface FeedPreviewProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
}

export const FeedPreview: React.FC<FeedPreviewProps> = ({ posts, onPostClick }) => {
  // Sort posts by score in descending order
  const sortedPosts = [...posts].sort((a, b) => b.score - a.score);

  // Empty state
  if (sortedPosts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No posts to display
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedPosts.map((post) => {
        const isBoosted = post.score > 0;

        return (
          <div
            key={post.id}
            data-testid={`post-preview-${post.id}`}
            onClick={() => onPostClick(post)}
            className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
              isBoosted ? 'boosted border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
            }`}
          >
            {/* Header with author and score badge */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-900">{post.author}</span>
                <span className="text-sm text-gray-500">{post.timestamp}</span>
              </div>
              <div
                data-testid={`score-badge-${post.id}`}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  post.score > 0
                    ? 'bg-blue-100 text-blue-800'
                    : post.score < 0
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                Score: {post.score}
              </div>
            </div>

            {/* Post content */}
            <p className="text-gray-800 mb-3">{post.content}</p>

            {/* Applied rules */}
            <div className="border-t pt-3">
              {post.appliedRules.length > 0 ? (
                <div>
                  <span className="text-xs font-medium text-gray-600 uppercase">
                    Applied Rules:
                  </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {post.appliedRules.map((rule) => (
                      <div
                        key={rule.ruleId}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          rule.contribution > 0
                            ? 'bg-green-100 text-green-800'
                            : rule.contribution < 0
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {rule.ruleName}: {rule.contribution > 0 ? '+' : ''}{rule.contribution}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-gray-500 italic">No rules applied</span>
              )}
            </div>

            <div className="mt-3" onClick={(event) => event.stopPropagation()}>
              <WhyAmISeeingThis postId={post.id} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
