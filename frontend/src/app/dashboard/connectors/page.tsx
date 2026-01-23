'use client';

import { useState, useMemo, useCallback } from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  Link2,
  Link2Off,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Settings,
  AlertCircle,
  Clock,
  Search,
  Grid3X3,
  List,
  Zap,
  MessageSquare,
  Video,
  FileText,
  Globe,
  Rss,
  Sparkles,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Modal,
  useToast,
  Input,
  Switch,
  Tabs,
  PageHeader,
  PlatformIcon,
  DetailsList,
  SectionTitle,
  Grid,
  Stack,
  Typography,
  SmallText,
  Caption,
  Label,
} from '@/components/ui';
import { FlowDiagram, FlowDiagramData, Platform, SyncConnection } from '@/components/flow';
import {
  NostrConnect,
  BlueskyConnect,
  MastodonConnect,
  TwitterConnect,
  MatrixConnect,
  DiscordConnect,
  TelegramConnect,
  LinkedInConnect,
  FacebookConnect,
  RedditConnect,
  YouTubeConnect,
  ThreadsConnect,
  TikTokConnect,
  PinterestConnect,
  TumblrConnect,
  MediumConnect,
  SubstackConnect,
  DevToConnect,
  HashnodeConnect,
  CohostConnect,
  LemmyConnect,
  PixelfedConnect,
  RSSConnect,
  WebhookConnect,
  OAuthConnect,
  OAUTH_CONFIGS,
} from '@/components/connectors';
import {
  useConnectors,
  useConnections,
  useSyncConfigs,
  useConnectPlatform,
  useDisconnectPlatform,
  useUpdateSyncConfig,
  AVAILABLE_CONNECTORS,
  PlatformConnector,
  PlatformConnection,
  PlatformSyncConfig,
  PlatformType,
} from '@/lib/connectors';

// ============ Constants ============
type Category = 'all' | 'social' | 'video' | 'blogging' | 'messaging' | 'decentralized' | 'utilities';
type ViewMode = 'grid' | 'list';
type TabId = 'platforms' | 'flow';

const CATEGORIES: { id: Category; label: string; icon: React.ReactNode; platforms: PlatformType[] }[] = [
  { id: 'all', label: 'All', icon: <Sparkles size={16} />, platforms: [] },
  {
    id: 'social',
    label: 'Social',
    icon: <MessageSquare size={16} />,
    platforms: ['twitter', 'bluesky', 'mastodon', 'threads', 'facebook', 'linkedin', 'instagram', 'tumblr', 'reddit', 'cohost', 'pixelfed']
  },
  {
    id: 'video',
    label: 'Video',
    icon: <Video size={16} />,
    platforms: ['youtube', 'tiktok', 'pinterest']
  },
  {
    id: 'blogging',
    label: 'Blogging',
    icon: <FileText size={16} />,
    platforms: ['medium', 'substack', 'devto', 'hashnode']
  },
  {
    id: 'messaging',
    label: 'Messaging',
    icon: <MessageSquare size={16} />,
    platforms: ['discord', 'telegram', 'matrix']
  },
  {
    id: 'decentralized',
    label: 'Decentralized',
    icon: <Globe size={16} />,
    platforms: ['nostr', 'lemmy', 'dsnp', 'ssb']
  },
  {
    id: 'utilities',
    label: 'Utilities',
    icon: <Rss size={16} />,
    platforms: ['rss', 'webhooks']
  },
];

// ============ Styled Components ============
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;

  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]} ${theme.spacing[2]} ${theme.spacing[10]}`};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const CategoryChips = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  flex: 1;
`;

const CategoryChip = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.primary[500] : theme.colors.border.light};
  background: ${({ $active, theme }) => $active ? theme.colors.primary[50] : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.primary[700] : theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary[300]};
    background: ${({ theme }) => theme.colors.primary[50]};
  }
`;

const ViewToggle = styled.div`
  display: flex;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
`;

const ViewButton = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]};
  background: ${({ $active, theme }) => $active ? theme.colors.primary[50] : 'transparent'};
  border: none;
  color: ${({ $active, theme }) => $active ? theme.colors.primary[600] : theme.colors.text.tertiary};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
`;

// Connected platforms strip
const ConnectedStrip = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.neutral[300]};
    border-radius: 2px;
  }
`;

const ConnectedLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const ConnectedPlatform = styled.button<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  background: ${({ $color }) => `${$color}15`};
  border: 1px solid ${({ $color }) => `${$color}30`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ $color }) => `${$color}25`};
    transform: translateY(-1px);
  }
`;

const ConnectedPlatformName = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`;

// Compact grid
const CompactGrid = styled.div<{ $viewMode: ViewMode }>`
  display: ${({ $viewMode }) => $viewMode === 'grid' ? 'grid' : 'flex'};
  ${({ $viewMode }) => $viewMode === 'grid' ? css`
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: ${({ theme }) => theme.spacing[3]};
  ` : css`
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing[2]};
  `}
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const CompactCard = styled.div<{ $connected?: boolean; $comingSoon?: boolean; $expanded?: boolean; $viewMode: ViewMode }>`
  position: relative;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 2px solid ${({ $connected, theme }) => $connected ? theme.colors.success[200] : theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ $viewMode, theme }) => $viewMode === 'grid' ? theme.spacing[3] : theme.spacing[2]};
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: ${({ $comingSoon }) => $comingSoon ? 0.6 : 1};

  ${({ $viewMode }) => $viewMode === 'list' && css`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing[3]};
  `}

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary[300]};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  ${({ $comingSoon }) => $comingSoon && css`
    pointer-events: none;
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      background-size: 200% 100%;
      animation: ${shimmer} 2s infinite;
      border-radius: inherit;
    }
  `}
`;

const CardIconWrapper = styled.div<{ $viewMode: ViewMode }>`
  ${({ $viewMode, theme }) => $viewMode === 'grid' ? css`
    display: flex;
    justify-content: center;
    margin-bottom: ${theme.spacing[2]};
  ` : css`
    flex-shrink: 0;
  `}
`;

const CardContent = styled.div<{ $viewMode: ViewMode }>`
  ${({ $viewMode }) => $viewMode === 'grid' ? css`
    text-align: center;
  ` : css`
    flex: 1;
    min-width: 0;
  `}
`;

const CardName = styled.h4<{ $viewMode: ViewMode }>`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  ${({ $viewMode }) => $viewMode === 'list' && css`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `}
`;

const CardStatus = styled.span<{ $status: 'connected' | 'beta' | 'coming_soon' | 'available' }>`
  font-size: 10px;
  color: ${({ $status, theme }) => {
    switch ($status) {
      case 'connected': return theme.colors.success[600];
      case 'beta': return theme.colors.warning[600];
      case 'coming_soon': return theme.colors.text.tertiary;
      default: return theme.colors.text.tertiary;
    }
  }};
`;

const CardActions = styled.div<{ $viewMode: ViewMode }>`
  ${({ $viewMode, theme }) => $viewMode === 'grid' ? css`
    margin-top: ${theme.spacing[2]};
    display: flex;
    justify-content: center;
  ` : css`
    flex-shrink: 0;
  `}
`;

const ComingSoonBadge = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  background: ${({ theme }) => theme.colors.warning[100]};
  color: ${({ theme }) => theme.colors.warning[700]};
  border-radius: 4px;
`;

const ConnectedIndicator = styled.div`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  background: ${({ theme }) => theme.colors.success[500]};
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.colors.background.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ResultCount = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

// Original styled components for modals and sync config
const DirectionButton = styled.button<{ $active: boolean; $disabled?: boolean }>`
  flex: 1;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.colors.primary[500] : theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.primary[50] : 'white'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary[700] : theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary[300]};
  }

  ${({ $disabled }) => $disabled && `
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  `}
`;

const CapabilitySectionTitle = styled(Caption)`
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const CapabilitiesWrapper = styled.div<{ $expanded: boolean }>`
  overflow: hidden;
  max-height: ${({ $expanded }) => ($expanded ? '500px' : '0')};
  opacity: ${({ $expanded }) => ($expanded ? 1 : 0)};
  transition: max-height 0.3s ease, opacity 0.2s ease;
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: ${({ theme }) => theme.spacing[3]};

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 14px;
    height: 14px;
    transition: transform 0.2s ease;
  }
`;

// ============ Component ============
export default function ConnectorsPage() {
  const { addToast } = useToast();
  const { data: connectors } = useConnectors();
  const { data: connections } = useConnections();
  const { data: syncConfigs } = useSyncConfigs();
  const connectMutation = useConnectPlatform();
  const disconnectMutation = useDisconnectPlatform();
  const updateConfigMutation = useUpdateSyncConfig();

  const [activeTab, setActiveTab] = useState<TabId>('platforms');
  const [connectModal, setConnectModal] = useState<PlatformConnector | null>(null);
  const [settingsModal, setSettingsModal] = useState<PlatformConnector | null>(null);
  const [advancedSettingsModal, setAdvancedSettingsModal] = useState<PlatformSyncConfig | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // New UX state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const connectorsList = connectors ?? AVAILABLE_CONNECTORS;

  // Filtered connectors based on search and category
  const filteredConnectors = useMemo(() => {
    let filtered = connectorsList;

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.platform.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (activeCategory !== 'all') {
      const categoryPlatforms = CATEGORIES.find(c => c.id === activeCategory)?.platforms || [];
      filtered = filtered.filter(c => categoryPlatforms.includes(c.platform));
    }

    // Sort: connected first, then available, then coming soon
    return filtered.sort((a, b) => {
      const aConnected = connections?.some(c => c.platform === a.platform && c.connected) ? 0 : 1;
      const bConnected = connections?.some(c => c.platform === b.platform && c.connected) ? 0 : 1;
      if (aConnected !== bConnected) return aConnected - bConnected;

      const statusOrder = { available: 0, beta: 1, coming_soon: 2 };
      return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
    });
  }, [connectorsList, searchQuery, activeCategory, connections]);

  // Connected platforms
  const connectedPlatforms = useMemo(() => {
    if (!connections) return [];
    return connections
      .filter(c => c.connected)
      .map(c => {
        const connector = connectorsList.find(con => con.platform === c.platform);
        return connector ? { ...connector, connection: c } : null;
      })
      .filter(Boolean) as (PlatformConnector & { connection: PlatformConnection })[];
  }, [connections, connectorsList]);

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const flowDiagramData: FlowDiagramData = {
    platforms: (connections ?? [])
      .filter((c) => c.connected)
      .map((c) => {
        const connector = connectorsList.find((con) => con.platform === c.platform);
        return {
          id: c.id,
          name: connector?.name ?? c.platform,
          icon: connector?.icon ?? c.platform[0].toUpperCase(),
          color: connector?.color ?? '#6366F1',
          status: c.sync_enabled ? ('active' as const) : ('paused' as const),
          connected: c.connected,
          handle: c.handle,
        };
      }),
    connections: (syncConfigs ?? [])
      .filter((config) => config.enabled)
      .flatMap((config) => {
        const connection = connections?.find((c) => c.platform === config.platform);
        if (!connection) return [];
        const result: SyncConnection[] = [];
        const hubId = 'hub-chirpsyncer';

        if (config.direction === 'inbound' || config.direction === 'bidirectional') {
          result.push({
            id: `${connection.id}-inbound`,
            sourceId: connection.id,
            targetId: hubId,
            direction: 'unidirectional',
            status: 'active',
          });
        }
        if (config.direction === 'outbound' || config.direction === 'bidirectional') {
          result.push({
            id: `${connection.id}-outbound`,
            sourceId: hubId,
            targetId: connection.id,
            direction: 'unidirectional',
            status: 'active',
          });
        }
        return result;
      }),
  };

  if (flowDiagramData.platforms.length > 0) {
    flowDiagramData.platforms.unshift({
      id: 'hub-chirpsyncer',
      name: 'ChirpSyncer Hub',
      icon: 'C',
      color: '#6366F1',
      status: 'active',
      connected: true,
    });
  }

  const handleNodeClick = (_platform: Platform) => {};
  const handleEdgeClick = (_connection: SyncConnection) => {};

  const getConnection = (platform: PlatformType): PlatformConnection | undefined => {
    return connections?.find((c) => c.platform === platform);
  };

  const getSyncConfig = (platform: PlatformType): PlatformSyncConfig | undefined => {
    if (!syncConfigs || !Array.isArray(syncConfigs)) return undefined;
    return syncConfigs.find((c) => c.platform === platform);
  };

  const handleConnect = useCallback(async () => {
    if (!connectModal) return;
    try {
      await connectMutation.mutateAsync({
        platform: connectModal.platform,
        credentials,
      });
      addToast({
        type: 'success',
        title: 'Connected',
        message: `Successfully connected to ${connectModal.name}`,
      });
      setConnectModal(null);
      setCredentials({});
    } catch {
      addToast({
        type: 'error',
        title: 'Connection Failed',
        message: 'Failed to connect to platform',
      });
    }
  }, [connectModal, credentials, connectMutation, addToast]);

  const handleDisconnect = async (platform: PlatformType) => {
    try {
      await disconnectMutation.mutateAsync(platform);
      addToast({
        type: 'success',
        title: 'Disconnected',
        message: 'Platform disconnected successfully',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to disconnect platform',
      });
    }
  };

  const handleToggleSync = async (config: PlatformSyncConfig) => {
    await updateConfigMutation.mutateAsync({
      ...config,
      enabled: !config.enabled,
    });
  };

  const handleChangeDirection = async (
    config: PlatformSyncConfig,
    direction: 'inbound' | 'outbound' | 'bidirectional'
  ) => {
    await updateConfigMutation.mutateAsync({
      ...config,
      direction,
    });
  };

  const renderCapabilities = (connector: PlatformConnector) => {
    const caps = connector.capabilities;
    const enabledVariant = (enabled: boolean) => (enabled ? 'success' : 'neutral-soft');

    return (
      <>
        <div style={{ marginBottom: '16px' }}>
          <CapabilitySectionTitle>Core</CapabilitySectionTitle>
          <Stack direction="row" wrap gap={2}>
            <Badge variant={enabledVariant(caps.publish)} size="sm">
              {caps.publish ? <Check /> : <X />}
              Publish
            </Badge>
            <Badge variant={enabledVariant(caps.read)} size="sm">
              {caps.read ? <Check /> : <X />}
              Read
            </Badge>
            <Badge variant={enabledVariant(caps.metrics)} size="sm">
              {caps.metrics ? <Check /> : <X />}
              Metrics
            </Badge>
            <Badge variant={enabledVariant(caps.threads)} size="sm">
              {caps.threads ? <Check /> : <X />}
              Threads
            </Badge>
          </Stack>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <CapabilitySectionTitle>Media</CapabilitySectionTitle>
          <Stack direction="row" wrap gap={2}>
            <Badge variant={enabledVariant(caps.media.images)} size="sm">
              Images ({caps.media.maxImages})
            </Badge>
            <Badge variant={enabledVariant(caps.media.videos)} size="sm">
              Videos
            </Badge>
            <Badge variant={enabledVariant(caps.media.gifs)} size="sm">
              GIFs
            </Badge>
          </Stack>
        </div>

        <div>
          <CapabilitySectionTitle>Limits</CapabilitySectionTitle>
          <Stack direction="row" wrap gap={2}>
            <Badge variant="success" size="sm">
              {caps.characterLimit} chars
            </Badge>
          </Stack>
        </div>
      </>
    );
  };

  const renderConnectForm = useCallback(() => {
    if (!connectModal) return null;

    switch (connectModal.auth_type) {
      case 'session':
        return (
          <Stack gap={4}>
            <Input
              label="Username"
              type="text"
              value={credentials.username || ''}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              placeholder="@username"
              fullWidth
            />
            <Input
              label="Password"
              type="password"
              value={credentials.password || ''}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              hint="Your credentials are encrypted with AES-256-GCM"
              fullWidth
            />
          </Stack>
        );
      case 'atproto':
        return (
          <BlueskyConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'oauth2':
        if (connectModal.platform === 'mastodon') {
          return (
            <MastodonConnect
              credentials={credentials}
              onCredentialsChange={setCredentials}
              onConnect={handleConnect}
              isConnecting={connectMutation.isPending}
            />
          );
        }
        if (connectModal.platform === 'linkedin') {
          return (
            <LinkedInConnect
              credentials={credentials}
              onCredentialsChange={setCredentials}
              onConnect={handleConnect}
              isConnecting={connectMutation.isPending}
            />
          );
        }
        if (connectModal.platform === 'facebook') {
          return (
            <FacebookConnect
              credentials={credentials}
              onCredentialsChange={setCredentials}
              onConnect={handleConnect}
              isConnecting={connectMutation.isPending}
            />
          );
        }
        if (connectModal.platform === 'threads') {
          return (
            <ThreadsConnect
              credentials={credentials}
              onCredentialsChange={setCredentials}
              onConnect={handleConnect}
              isConnecting={connectMutation.isPending}
            />
          );
        }
        if (connectModal.platform === 'instagram') {
          return (
            <Stack gap={4}>
              <SmallText>
                Instagram requires a Business or Creator account connected to a Facebook Page.
              </SmallText>
              <Input
                label="Instagram User ID"
                type="text"
                value={credentials.user_id || ''}
                onChange={(e) => setCredentials({ ...credentials, user_id: e.target.value })}
                placeholder="17841405822304"
                hint="Your Instagram Business Account ID"
                fullWidth
              />
              <Input
                label="Access Token"
                type="password"
                value={credentials.access_token || ''}
                onChange={(e) => setCredentials({ ...credentials, access_token: e.target.value })}
                hint="Long-lived access token from Meta Developer Console"
                fullWidth
              />
            </Stack>
          );
        }
        if (OAUTH_CONFIGS[connectModal.platform]) {
          return (
            <OAuthConnect
              config={OAUTH_CONFIGS[connectModal.platform]}
              credentials={credentials}
              onCredentialsChange={setCredentials}
              onConnect={handleConnect}
              isConnecting={connectMutation.isPending}
            />
          );
        }
        return null;
      case 'api_key':
        return (
          <TwitterConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'nostr':
        return (
          <NostrConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'matrix':
        return (
          <MatrixConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'discord':
        return (
          <DiscordConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'reddit':
        return (
          <RedditConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'youtube':
        return (
          <YouTubeConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'telegram':
        return (
          <TelegramConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'tumblr':
        return (
          <TumblrConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'pinterest':
        return (
          <PinterestConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'tiktok':
        return (
          <TikTokConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'medium':
        return (
          <MediumConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'substack':
        return (
          <SubstackConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'devto':
        return (
          <DevToConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'hashnode':
        return (
          <HashnodeConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'cohost':
        return (
          <CohostConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'lemmy':
        return (
          <LemmyConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'pixelfed':
        return (
          <PixelfedConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'rss':
        return (
          <RSSConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      case 'webhooks':
        return (
          <WebhookConnect
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        );
      default:
        return null;
    }
  }, [connectModal, credentials, connectMutation.isPending, handleConnect]);

  return (
    <PageContainer>
      <PageHeader
        title="Platform Connectors"
        description="Connect your social media accounts and configure sync settings"
      />

      <Tabs
        items={[
          { id: 'platforms', label: 'Platforms', badge: String(connectorsList.filter(c => c.status !== 'coming_soon').length) },
          { id: 'flow', label: 'Flow View', badge: String(flowDiagramData.platforms.length - 1) },
        ]}
        value={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
        variant="soft"
      />

      {activeTab === 'flow' ? (
        <div style={{ marginTop: '24px' }}>
          <FlowDiagram
            data={flowDiagramData}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            showParticles
          />
        </div>
      ) : (
        <>
          {/* Connected platforms strip */}
          {connectedPlatforms.length > 0 && (
            <ConnectedStrip>
              <ConnectedLabel>
                <Zap size={14} />
                Connected ({connectedPlatforms.length})
              </ConnectedLabel>
              {connectedPlatforms.map((cp) => (
                <ConnectedPlatform
                  key={cp.id}
                  $color={cp.color}
                  onClick={() => setSettingsModal(cp)}
                  title={`${cp.name} - ${cp.connection.handle || 'Connected'}`}
                >
                  <PlatformIcon icon={cp.icon} color={cp.color} size="sm" />
                  <ConnectedPlatformName>{cp.name}</ConnectedPlatformName>
                </ConnectedPlatform>
              ))}
            </ConnectedStrip>
          )}

          {/* Search and filters */}
          <TopBar>
            <SearchContainer>
              <SearchIcon size={18} />
              <SearchInput
                type="text"
                placeholder="Search platforms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </SearchContainer>

            <CategoryChips>
              {CATEGORIES.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  $active={activeCategory === cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.icon}
                  {cat.label}
                </CategoryChip>
              ))}
            </CategoryChips>

            <ViewToggle>
              <ViewButton
                $active={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <Grid3X3 size={18} />
              </ViewButton>
              <ViewButton
                $active={viewMode === 'list'}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List size={18} />
              </ViewButton>
            </ViewToggle>

            <ResultCount>
              {filteredConnectors.length} platform{filteredConnectors.length !== 1 ? 's' : ''}
            </ResultCount>
          </TopBar>

          {/* Platform grid */}
          {filteredConnectors.length > 0 ? (
            <CompactGrid $viewMode={viewMode}>
              {filteredConnectors.map((connector) => {
                const connection = getConnection(connector.platform);
                const isConnected = connection?.connected;
                const isComingSoon = connector.status === 'coming_soon';
                const isBeta = connector.status === 'beta';

                return (
                  <CompactCard
                    key={connector.id}
                    $connected={isConnected}
                    $comingSoon={isComingSoon}
                    $viewMode={viewMode}
                    onClick={() => !isComingSoon && (isConnected ? setSettingsModal(connector) : setConnectModal(connector))}
                  >
                    {isConnected && (
                      <ConnectedIndicator>
                        <Check size={10} />
                      </ConnectedIndicator>
                    )}
                    {isComingSoon && <ComingSoonBadge>Soon</ComingSoonBadge>}

                    <CardIconWrapper $viewMode={viewMode}>
                      <PlatformIcon icon={connector.icon} color={connector.color} size={viewMode === 'grid' ? 'lg' : 'md'} />
                    </CardIconWrapper>

                    <CardContent $viewMode={viewMode}>
                      <CardName $viewMode={viewMode}>{connector.name}</CardName>
                      <CardStatus $status={isConnected ? 'connected' : isBeta ? 'beta' : isComingSoon ? 'coming_soon' : 'available'}>
                        {isConnected ? (connection?.handle || 'Connected') : isBeta ? 'Beta' : isComingSoon ? 'Coming Soon' : 'Available'}
                      </CardStatus>
                    </CardContent>

                    {viewMode === 'list' && !isComingSoon && (
                      <CardActions $viewMode={viewMode}>
                        <Button
                          size="sm"
                          variant={isConnected ? 'secondary' : 'primary'}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isConnected) {
                              setSettingsModal(connector);
                            } else {
                              setConnectModal(connector);
                            }
                          }}
                        >
                          {isConnected ? <Settings size={14} /> : <Link2 size={14} />}
                          {isConnected ? 'Settings' : 'Connect'}
                        </Button>
                      </CardActions>
                    )}
                  </CompactCard>
                );
              })}
            </CompactGrid>
          ) : (
            <EmptyState>
              <AlertCircle size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <p>No platforms found matching &quot;{searchQuery}&quot;</p>
              <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}>
                Clear filters
              </Button>
            </EmptyState>
          )}

          {/* Sync Configuration for connected platforms */}
          {connectedPlatforms.length > 0 && (
            <>
              <SectionTitle style={{ marginTop: '32px' }}>Sync Configuration</SectionTitle>
              {connections
                ?.filter((c) => c.connected)
                .map((connection) => {
                  const config = getSyncConfig(connection.platform);
                  const connector = connectorsList.find((c) => c.platform === connection.platform);

                  if (!config || !connector) return null;

                  return (
                    <Card key={connection.id} padding="md" style={{ marginBottom: '16px' }}>
                      <Stack direction="row" justify="between" align="center" style={{ marginBottom: '16px' }}>
                        <Stack direction="row" gap={3} align="center">
                          <PlatformIcon icon={connector.icon} color={connector.color} size="lg" />
                          <div>
                            <Typography variant="h4">{connector.name}</Typography>
                            <SmallText>{connection.handle}</SmallText>
                          </div>
                        </Stack>
                        <Switch
                          checked={config.enabled}
                          onChange={() => handleToggleSync(config)}
                          title={config.enabled ? 'Disable sync' : 'Enable sync'}
                        />
                      </Stack>

                      <Label spacing="md">Sync Direction</Label>
                      <Stack direction="row" gap={2} style={{ marginBottom: '16px' }}>
                        <DirectionButton
                          $active={config.direction === 'inbound'}
                          $disabled={!connector.capabilities.read}
                          onClick={() => handleChangeDirection(config, 'inbound')}
                        >
                          {connector.name} → Hub
                        </DirectionButton>
                        <DirectionButton
                          $active={config.direction === 'bidirectional'}
                          $disabled={!connector.capabilities.read || !connector.capabilities.publish}
                          onClick={() => handleChangeDirection(config, 'bidirectional')}
                        >
                          Bidirectional
                        </DirectionButton>
                        <DirectionButton
                          $active={config.direction === 'outbound'}
                          $disabled={!connector.capabilities.publish}
                          onClick={() => handleChangeDirection(config, 'outbound')}
                        >
                          Hub → {connector.name}
                        </DirectionButton>
                      </Stack>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setAdvancedSettingsModal(config)}
                      >
                        <Settings size={16} />
                        Advanced Settings
                        <ChevronRight size={16} />
                      </Button>
                    </Card>
                  );
                })}
            </>
          )}
        </>
      )}

      {/* Connect Modal */}
      <Modal
        isOpen={!!connectModal}
        onClose={() => {
          setConnectModal(null);
          setCredentials({});
        }}
        title={`Connect to ${connectModal?.name}`}
        footer={
          ['nostr', 'bluesky', 'mastodon', 'twitter', 'matrix', 'discord', 'telegram', 'linkedin', 'facebook', 'threads', 'reddit', 'youtube', 'tumblr', 'pinterest', 'tiktok', 'medium', 'substack', 'devto', 'hashnode', 'cohost', 'lemmy', 'pixelfed', 'rss', 'webhooks'].includes(connectModal?.platform || '') ? null : (
            <Stack direction="row" justify="end" gap={2}>
              <Button
                variant="secondary"
                onClick={() => {
                  setConnectModal(null);
                  setCredentials({});
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConnect}
                isLoading={connectMutation.isPending}
              >
                <Link2 size={16} />
                Connect
              </Button>
            </Stack>
          )
        }
      >
        {renderConnectForm()}
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={!!settingsModal}
        onClose={() => setSettingsModal(null)}
        title={`${settingsModal?.name} Settings`}
        footer={
          <Stack direction="row" justify="end" gap={2}>
            <Button
              variant="secondary"
              onClick={() => {
                if (settingsModal) handleDisconnect(settingsModal.platform);
                setSettingsModal(null);
              }}
            >
              <Link2Off size={16} />
              Disconnect
            </Button>
            <Button variant="secondary" onClick={() => setSettingsModal(null)}>
              Close
            </Button>
          </Stack>
        }
      >
        {settingsModal && (
          <Stack gap={4}>
            <div>
              <Label spacing="md">Connected Account</Label>
              <SmallText>{getConnection(settingsModal.platform)?.handle || 'N/A'}</SmallText>
            </div>
            <div>
              <Label spacing="md">Connection Status</Label>
              <Badge variant={getConnection(settingsModal.platform)?.connected ? 'success' : 'neutral'} size="sm">
                {getConnection(settingsModal.platform)?.connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <div>
              <Label spacing="md">Last Sync</Label>
              <SmallText>
                {getConnection(settingsModal.platform)?.last_sync
                  ? new Date(getConnection(settingsModal.platform)!.last_sync!).toLocaleString()
                  : 'Never'}
              </SmallText>
            </div>

            <ExpandButton onClick={() => toggleExpand(settingsModal.id)}>
              {expandedCards.has(settingsModal.id) ? (
                <>
                  Hide Capabilities
                  <ChevronDown style={{ transform: 'rotate(180deg)' }} />
                </>
              ) : (
                <>
                  Show Capabilities
                  <ChevronDown />
                </>
              )}
            </ExpandButton>

            <CapabilitiesWrapper $expanded={expandedCards.has(settingsModal.id)}>
              {renderCapabilities(settingsModal)}
            </CapabilitiesWrapper>
          </Stack>
        )}
      </Modal>

      {/* Advanced Sync Settings Modal */}
      <Modal
        isOpen={!!advancedSettingsModal}
        onClose={() => setAdvancedSettingsModal(null)}
        title="Advanced Sync Settings"
        footer={
          <Stack direction="row" justify="end" gap={2}>
            <Button variant="secondary" onClick={() => setAdvancedSettingsModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                addToast({
                  type: 'success',
                  title: 'Settings Saved',
                  message: 'Advanced sync settings have been updated.',
                });
                setAdvancedSettingsModal(null);
              }}
            >
              Save Changes
            </Button>
          </Stack>
        }
      >
        {advancedSettingsModal && (
          <Stack gap={4}>
            <div>
              <Label spacing="md">Sync Interval</Label>
              <Input
                type="number"
                defaultValue={15}
                min={5}
                max={60}
                hint="Minutes between sync operations (5-60)"
                fullWidth
              />
            </div>
            <div>
              <Label spacing="md">Content Filters</Label>
              <Stack gap={2}>
                <Switch
                  checked={true}
                  onChange={() => {}}
                  label="Include replies"
                />
                <Switch
                  checked={true}
                  onChange={() => {}}
                  label="Include reposts/retweets"
                />
                <Switch
                  checked={false}
                  onChange={() => {}}
                  label="Include media-only posts"
                />
              </Stack>
            </div>
            <div>
              <Label spacing="md">Error Handling</Label>
              <Stack gap={2}>
                <Switch
                  checked={true}
                  onChange={() => {}}
                  label="Retry failed syncs automatically"
                />
                <Switch
                  checked={false}
                  onChange={() => {}}
                  label="Pause sync on repeated errors"
                />
              </Stack>
            </div>
          </Stack>
        )}
      </Modal>
    </PageContainer>
  );
}
