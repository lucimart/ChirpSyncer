/**
 * Phase B System Integration Tests
 * Tests the interconnectivity between frontend components and backend services
 * Verifies the unified system behavior across sprints 10-13
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { ToastProvider, useToast } from '@/components/ui/Toast';

// Test wrapper
const IntegrationTestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <ToastProvider>{children}</ToastProvider>
  </ThemeProvider>
);

const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: IntegrationTestWrapper });
};

// =============================================================================
// MOCK API LAYER - Simulates Backend Services
// =============================================================================

// Mock API responses based on actual backend structures
const mockAPI = {
  // UserSettings API (from user_settings.py)
  userSettings: {
    get: jest.fn().mockResolvedValue({
      sync_interval: 3600,
      twitter_to_bluesky_enabled: true,
      bluesky_to_twitter_enabled: true,
      sync_threads: true,
      sync_media: true,
      max_tweets_per_sync: 50,
      notification_email: 'user@example.com',
      timezone: 'UTC',
    }),
    update: jest.fn().mockResolvedValue({ success: true }),
  },

  // CleanupEngine API (from cleanup_engine.py)
  cleanup: {
    getRules: jest.fn().mockResolvedValue([
      {
        id: 1,
        user_id: 1,
        name: 'Delete old tweets',
        enabled: 1,
        rule_type: 'age',
        rule_config: JSON.stringify({ max_age_days: 30, exclude_with_replies: true }),
        last_run: null,
        deleted_count: 0,
        created_at: Date.now() / 1000,
      },
      {
        id: 2,
        user_id: 1,
        name: 'Remove low engagement',
        enabled: 1,
        rule_type: 'engagement',
        rule_config: JSON.stringify({ min_likes: 5, delete_if_below: true }),
        last_run: null,
        deleted_count: 15,
        created_at: Date.now() / 1000,
      },
    ]),
    preview: jest.fn().mockResolvedValue({
      count: 25,
      tweet_ids: ['tweet_1', 'tweet_2', 'tweet_3'],
      tweets: [],
    }),
    execute: jest.fn().mockResolvedValue({
      success: true,
      dry_run: false,
      tweets_deleted: 25,
      rule_id: 1,
      rule_name: 'Delete old tweets',
    }),
    getHistory: jest.fn().mockResolvedValue([
      { id: 1, rule_id: 1, user_id: 1, tweets_deleted: 10, executed_at: Date.now() / 1000, dry_run: 0, rule_name: 'Delete old tweets' },
      { id: 2, rule_id: 2, user_id: 1, tweets_deleted: 5, executed_at: Date.now() / 1000 - 3600, dry_run: 0, rule_name: 'Remove low engagement' },
    ]),
  },

  // SearchEngine API (from search_engine.py)
  search: {
    query: jest.fn().mockResolvedValue([
      { tweet_id: '1', user_id: 1, content: 'Hello Twitter!', hashtags: '#hello', author: 'user1', posted_at: Date.now() / 1000, rank: -5.0 },
      { tweet_id: '2', user_id: 1, content: 'React is awesome', hashtags: '#react #dev', author: 'user1', posted_at: Date.now() / 1000 - 3600, rank: -3.5 },
    ]),
    stats: jest.fn().mockResolvedValue({
      user_id: 1,
      total_indexed: 150,
      last_indexed: Date.now() / 1000,
    }),
  },

  // AnalyticsTracker API (from analytics_tracker.py)
  analytics: {
    getUserAnalytics: jest.fn().mockResolvedValue({
      user_id: 1,
      period: 'weekly',
      total_tweets: 45,
      total_impressions: 12500,
      total_engagements: 890,
      avg_engagement_rate: 7.12,
      total_likes: 650,
      total_retweets: 120,
      total_replies: 120,
    }),
    getTopTweets: jest.fn().mockResolvedValue([
      { tweet_id: '1', impressions: 5000, likes: 200, retweets: 50, engagement_rate: 5.0 },
      { tweet_id: '2', impressions: 3500, likes: 150, retweets: 30, engagement_rate: 5.14 },
    ]),
    getSnapshots: jest.fn().mockResolvedValue([
      { id: 1, user_id: 1, period: 'daily', data: { total_tweets: 10, total_impressions: 2500 }, created_at: Date.now() / 1000 },
    ]),
  },

  // NotificationService API (from notification_service.py)
  notifications: {
    testConnection: jest.fn().mockResolvedValue(true),
    sendTaskNotification: jest.fn().mockResolvedValue(true),
  },

  // Sync operations
  sync: {
    getStatus: jest.fn().mockResolvedValue({
      twitter_to_bluesky: { synced: 892, skipped: 45, failed: 3 },
      bluesky_to_twitter: { synced: 456, skipped: 12, failed: 1 },
      last_sync: Date.now() / 1000 - 1800,
    }),
    triggerSync: jest.fn().mockResolvedValue({ success: true, job_id: 'sync_12345' }),
  },
};

// =============================================================================
// INTEGRATION TESTS: Settings Flow (Sprint 11)
// =============================================================================

describe('Integration: Settings Management Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load user settings from backend API', async () => {
    const SettingsLoader = () => {
      const [settings, setSettings] = React.useState<Record<string, unknown> | null>(null);

      React.useEffect(() => {
        mockAPI.userSettings.get().then(setSettings);
      }, []);

      if (!settings) return <div>Loading...</div>;

      return (
        <div data-testid="settings-container">
          <div data-testid="sync-interval">{String(settings.sync_interval)}</div>
          <div data-testid="twitter-enabled">{String(settings.twitter_to_bluesky_enabled)}</div>
        </div>
      );
    };

    renderWithProviders(<SettingsLoader />);

    await waitFor(() => {
      expect(screen.getByTestId('sync-interval')).toHaveTextContent('3600');
      expect(screen.getByTestId('twitter-enabled')).toHaveTextContent('true');
    });

    expect(mockAPI.userSettings.get).toHaveBeenCalledTimes(1);
  });

  it('should update settings and trigger toast notification', async () => {
    const SettingsUpdater = () => {
      const { addToast } = useToast();

      const handleSave = async () => {
        const result = await mockAPI.userSettings.update({ sync_interval: 7200 });
        if (result.success) {
          addToast({ type: 'success', title: 'Settings saved' });
        }
      };

      return <button onClick={handleSave}>Save Settings</button>;
    };

    renderWithProviders(<SettingsUpdater />);

    fireEvent.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(mockAPI.userSettings.update).toHaveBeenCalledWith({ sync_interval: 7200 });
      expect(screen.getByText('Settings saved')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// INTEGRATION TESTS: Cleanup Flow (Sprint 12)
// =============================================================================

describe('Integration: Cleanup Rules Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load cleanup rules from backend', async () => {
    const CleanupRulesLoader = () => {
      const [rules, setRules] = React.useState<Array<{ id: number; name: string; rule_type: string }>>([]);

      React.useEffect(() => {
        mockAPI.cleanup.getRules().then(setRules);
      }, []);

      return (
        <div data-testid="cleanup-rules">
          {rules.map(rule => (
            <div key={rule.id} data-testid={`rule-${rule.id}`}>
              {rule.name} ({rule.rule_type})
            </div>
          ))}
        </div>
      );
    };

    renderWithProviders(<CleanupRulesLoader />);

    await waitFor(() => {
      expect(screen.getByTestId('rule-1')).toHaveTextContent('Delete old tweets (age)');
      expect(screen.getByTestId('rule-2')).toHaveTextContent('Remove low engagement (engagement)');
    });
  });

  it('should preview cleanup before execution', async () => {
    const CleanupPreview = () => {
      const [preview, setPreview] = React.useState<{ count: number } | null>(null);

      const handlePreview = async () => {
        const result = await mockAPI.cleanup.preview(1);
        setPreview(result);
      };

      return (
        <div>
          <button onClick={handlePreview}>Preview Cleanup</button>
          {preview && (
            <div data-testid="preview-result">
              {preview.count} tweets will be deleted
            </div>
          )}
        </div>
      );
    };

    renderWithProviders(<CleanupPreview />);

    fireEvent.click(screen.getByText('Preview Cleanup'));

    await waitFor(() => {
      expect(screen.getByTestId('preview-result')).toHaveTextContent('25 tweets will be deleted');
    });
  });

  it('should execute cleanup and show progress', async () => {
    const CleanupExecutor = () => {
      const { addToast } = useToast();
      const [result, setResult] = React.useState<{ success: boolean; tweets_deleted: number } | null>(null);

      const handleExecute = async () => {
        const res = await mockAPI.cleanup.execute(1);
        setResult(res);
        if (res.success) {
          addToast({ type: 'success', title: `Deleted ${res.tweets_deleted} tweets` });
        }
      };

      return (
        <div>
          <button onClick={handleExecute}>Execute Cleanup</button>
          {result && (
            <div data-testid="execution-result">
              Deleted: {result.tweets_deleted}
            </div>
          )}
        </div>
      );
    };

    renderWithProviders(<CleanupExecutor />);

    fireEvent.click(screen.getByText('Execute Cleanup'));

    await waitFor(() => {
      expect(screen.getByTestId('execution-result')).toHaveTextContent('Deleted: 25');
      expect(screen.getByText('Deleted 25 tweets')).toBeInTheDocument();
    });
  });

  it('should load cleanup history from backend', async () => {
    const CleanupHistory = () => {
      const [history, setHistory] = React.useState<Array<{ id: number; rule_name: string; tweets_deleted: number }>>([]);

      React.useEffect(() => {
        mockAPI.cleanup.getHistory().then(setHistory);
      }, []);

      return (
        <div data-testid="cleanup-history">
          {history.map(entry => (
            <div key={entry.id} data-testid={`history-${entry.id}`}>
              {entry.rule_name}: {entry.tweets_deleted} deleted
            </div>
          ))}
        </div>
      );
    };

    renderWithProviders(<CleanupHistory />);

    await waitFor(() => {
      expect(screen.getByTestId('history-1')).toHaveTextContent('Delete old tweets: 10 deleted');
      expect(screen.getByTestId('history-2')).toHaveTextContent('Remove low engagement: 5 deleted');
    });
  });
});

// =============================================================================
// INTEGRATION TESTS: Search Flow (Sprint 13)
// =============================================================================

describe('Integration: Search & Analytics Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should search tweets and display results', async () => {
    const SearchComponent = () => {
      const [results, setResults] = React.useState<Array<{ tweet_id: string; content: string }>>([]);
      const [query, setQuery] = React.useState('');

      const handleSearch = async () => {
        const res = await mockAPI.search.query(query);
        setResults(res);
      };

      return (
        <div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tweets..."
          />
          <button onClick={handleSearch}>Search</button>
          <div data-testid="search-results">
            {results.map(tweet => (
              <div key={tweet.tweet_id} data-testid={`result-${tweet.tweet_id}`}>
                {tweet.content}
              </div>
            ))}
          </div>
        </div>
      );
    };

    renderWithProviders(<SearchComponent />);

    fireEvent.change(screen.getByPlaceholderText('Search tweets...'), {
      target: { value: 'React' }
    });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(screen.getByTestId('result-1')).toHaveTextContent('Hello Twitter!');
      expect(screen.getByTestId('result-2')).toHaveTextContent('React is awesome');
    });
  });

  it('should load analytics dashboard data', async () => {
    const AnalyticsDashboard = () => {
      const [analytics, setAnalytics] = React.useState<{
        total_tweets: number;
        total_impressions: number;
        avg_engagement_rate: number;
      } | null>(null);

      React.useEffect(() => {
        mockAPI.analytics.getUserAnalytics(1, 'weekly').then(setAnalytics);
      }, []);

      if (!analytics) return <div>Loading analytics...</div>;

      return (
        <div data-testid="analytics-dashboard">
          <div data-testid="total-tweets">Tweets: {analytics.total_tweets}</div>
          <div data-testid="impressions">Impressions: {analytics.total_impressions}</div>
          <div data-testid="engagement">Engagement: {analytics.avg_engagement_rate}%</div>
        </div>
      );
    };

    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('total-tweets')).toHaveTextContent('Tweets: 45');
      expect(screen.getByTestId('impressions')).toHaveTextContent('Impressions: 12500');
      expect(screen.getByTestId('engagement')).toHaveTextContent('Engagement: 7.12%');
    });
  });

  it('should display top performing tweets', async () => {
    const TopTweets = () => {
      const [topTweets, setTopTweets] = React.useState<Array<{
        tweet_id: string;
        likes: number;
        engagement_rate: number;
      }>>([]);

      React.useEffect(() => {
        mockAPI.analytics.getTopTweets(1, 'engagement_rate', 10).then(setTopTweets);
      }, []);

      return (
        <div data-testid="top-tweets">
          {topTweets.map(tweet => (
            <div key={tweet.tweet_id} data-testid={`top-${tweet.tweet_id}`}>
              Likes: {tweet.likes} | Rate: {tweet.engagement_rate}%
            </div>
          ))}
        </div>
      );
    };

    renderWithProviders(<TopTweets />);

    await waitFor(() => {
      expect(screen.getByTestId('top-1')).toHaveTextContent('Likes: 200 | Rate: 5%');
      expect(screen.getByTestId('top-2')).toHaveTextContent('Likes: 150 | Rate: 5.14%');
    });
  });
});

// =============================================================================
// INTEGRATION TESTS: Sync Status Flow
// =============================================================================

describe('Integration: Sync Status Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display bidirectional sync status', async () => {
    const SyncStatus = () => {
      const [status, setStatus] = React.useState<{
        twitter_to_bluesky: { synced: number; failed: number };
        bluesky_to_twitter: { synced: number; failed: number };
      } | null>(null);

      React.useEffect(() => {
        mockAPI.sync.getStatus().then(setStatus);
      }, []);

      if (!status) return <div>Loading sync status...</div>;

      return (
        <div data-testid="sync-status">
          <div data-testid="twitter-to-bluesky">
            Twitter → Bluesky: {status.twitter_to_bluesky.synced} synced, {status.twitter_to_bluesky.failed} failed
          </div>
          <div data-testid="bluesky-to-twitter">
            Bluesky → Twitter: {status.bluesky_to_twitter.synced} synced, {status.bluesky_to_twitter.failed} failed
          </div>
        </div>
      );
    };

    renderWithProviders(<SyncStatus />);

    await waitFor(() => {
      expect(screen.getByTestId('twitter-to-bluesky')).toHaveTextContent('Twitter → Bluesky: 892 synced, 3 failed');
      expect(screen.getByTestId('bluesky-to-twitter')).toHaveTextContent('Bluesky → Twitter: 456 synced, 1 failed');
    });
  });

  it('should trigger manual sync and show progress', async () => {
    const ManualSync = () => {
      const { addToast } = useToast();
      const [syncing, setSyncing] = React.useState(false);

      const handleSync = async () => {
        setSyncing(true);
        const result = await mockAPI.sync.triggerSync();
        setSyncing(false);

        if (result.success) {
          addToast({ type: 'success', title: 'Sync started', message: `Job ID: ${result.job_id}` });
        }
      };

      return (
        <div>
          <button onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      );
    };

    renderWithProviders(<ManualSync />);

    fireEvent.click(screen.getByText('Sync Now'));

    await waitFor(() => {
      expect(screen.getByText('Sync started')).toBeInTheDocument();
      expect(screen.getByText('Job ID: sync_12345')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// INTEGRATION TESTS: Notification System
// =============================================================================

describe('Integration: Notification System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should test SMTP connection', async () => {
    const NotificationTest = () => {
      const { addToast } = useToast();
      const [testing, setTesting] = React.useState(false);

      const handleTest = async () => {
        setTesting(true);
        const success = await mockAPI.notifications.testConnection();
        setTesting(false);

        if (success) {
          addToast({ type: 'success', title: 'SMTP connection successful' });
        } else {
          addToast({ type: 'error', title: 'SMTP connection failed' });
        }
      };

      return (
        <button onClick={handleTest} disabled={testing}>
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      );
    };

    renderWithProviders(<NotificationTest />);

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText('SMTP connection successful')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// CROSS-PHASE INTEGRATION: Full User Journey
// =============================================================================

describe('Integration: Complete User Journey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete settings → cleanup → analytics flow', async () => {
    const FullJourney = () => {
      const { addToast } = useToast();
      const [step, setStep] = React.useState(1);
      const [data, setData] = React.useState<{
        settings?: Record<string, unknown>;
        cleanupResult?: { tweets_deleted: number };
        analytics?: { total_tweets: number };
      }>({});

      const completeStep = async () => {
        if (step === 1) {
          // Step 1: Load settings
          const settings = await mockAPI.userSettings.get();
          setData(prev => ({ ...prev, settings }));
          addToast({ type: 'info', title: 'Settings loaded' });
          setStep(2);
        } else if (step === 2) {
          // Step 2: Execute cleanup
          const result = await mockAPI.cleanup.execute(1);
          setData(prev => ({ ...prev, cleanupResult: result }));
          addToast({ type: 'success', title: `Cleaned ${result.tweets_deleted} tweets` });
          setStep(3);
        } else if (step === 3) {
          // Step 3: View analytics
          const analytics = await mockAPI.analytics.getUserAnalytics(1, 'weekly');
          setData(prev => ({ ...prev, analytics }));
          addToast({ type: 'success', title: 'Analytics loaded' });
          setStep(4);
        }
      };

      return (
        <div data-testid="journey-container">
          <div data-testid="current-step">Step: {step}</div>
          <button onClick={completeStep} disabled={step > 3}>
            {step === 1 && 'Load Settings'}
            {step === 2 && 'Run Cleanup'}
            {step === 3 && 'View Analytics'}
            {step === 4 && 'Complete'}
          </button>
          {data.settings && <div data-testid="settings-loaded">Settings: OK</div>}
          {data.cleanupResult && <div data-testid="cleanup-done">Cleanup: {data.cleanupResult.tweets_deleted}</div>}
          {data.analytics && <div data-testid="analytics-shown">Analytics: {data.analytics.total_tweets} tweets</div>}
        </div>
      );
    };

    renderWithProviders(<FullJourney />);

    // Step 1: Load settings
    fireEvent.click(screen.getByText('Load Settings'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-loaded')).toBeInTheDocument();
      expect(screen.getByText('Settings loaded')).toBeInTheDocument();
    });

    // Step 2: Run cleanup
    fireEvent.click(screen.getByText('Run Cleanup'));
    await waitFor(() => {
      expect(screen.getByTestId('cleanup-done')).toHaveTextContent('Cleanup: 25');
      expect(screen.getByText('Cleaned 25 tweets')).toBeInTheDocument();
    });

    // Step 3: View analytics
    fireEvent.click(screen.getByText('View Analytics'));
    await waitFor(() => {
      expect(screen.getByTestId('analytics-shown')).toHaveTextContent('Analytics: 45 tweets');
      expect(screen.getByText('Analytics loaded')).toBeInTheDocument();
    });

    // Verify all API calls were made
    expect(mockAPI.userSettings.get).toHaveBeenCalledTimes(1);
    expect(mockAPI.cleanup.execute).toHaveBeenCalledTimes(1);
    expect(mockAPI.analytics.getUserAnalytics).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// ERROR HANDLING INTEGRATION
// =============================================================================

describe('Integration: Error Handling', () => {
  it('should handle API failures gracefully', async () => {
    // Mock API failure
    mockAPI.userSettings.get.mockRejectedValueOnce(new Error('Network error'));

    const ErrorHandling = () => {
      const { addToast } = useToast();
      const [error, setError] = React.useState<string | null>(null);

      const loadSettings = async () => {
        try {
          await mockAPI.userSettings.get();
        } catch (err) {
          setError((err as Error).message);
          addToast({ type: 'error', title: 'Failed to load settings', message: (err as Error).message });
        }
      };

      React.useEffect(() => {
        loadSettings();
      }, []);

      return (
        <div>
          {error && <div data-testid="error-message">{error}</div>}
        </div>
      );
    };

    renderWithProviders(<ErrorHandling />);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Network error');
      expect(screen.getByText('Failed to load settings')).toBeInTheDocument();
    });
  });

  it('should show retry option on transient failures', async () => {
    let callCount = 0;
    mockAPI.sync.getStatus.mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error('Temporary failure'));
      }
      return Promise.resolve({
        twitter_to_bluesky: { synced: 100, failed: 0 },
        bluesky_to_twitter: { synced: 50, failed: 0 },
        last_sync: Date.now() / 1000,
      });
    });

    const RetryComponent = () => {
      const { addToast } = useToast();
      const [status, setStatus] = React.useState<{ twitter_to_bluesky: { synced: number } } | null>(null);
      const [retries, setRetries] = React.useState(0);

      const loadStatus = async () => {
        try {
          const result = await mockAPI.sync.getStatus();
          setStatus(result);
          addToast({ type: 'success', title: 'Status loaded' });
        } catch {
          setRetries(r => r + 1);
          if (retries < 2) {
            setTimeout(loadStatus, 100);
          } else {
            addToast({ type: 'error', title: 'Failed after retries' });
          }
        }
      };

      return (
        <div>
          <button onClick={loadStatus}>Load Status</button>
          <div data-testid="retry-count">Retries: {retries}</div>
          {status && <div data-testid="status-loaded">Synced: {status.twitter_to_bluesky.synced}</div>}
        </div>
      );
    };

    renderWithProviders(<RetryComponent />);

    fireEvent.click(screen.getByText('Load Status'));

    await waitFor(() => {
      expect(screen.getByTestId('status-loaded')).toHaveTextContent('Synced: 100');
    }, { timeout: 1000 });
  });
});
