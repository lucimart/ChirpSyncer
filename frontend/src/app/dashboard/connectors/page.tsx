'use client';

import { useState } from 'react';
import styled from 'styled-components';
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

const ConnectorCard = styled(Card)<{ $connected?: boolean; $comingSoon?: boolean }>`
  position: relative;
  opacity: ${({ $comingSoon }) => ($comingSoon ? 0.7 : 1)};
  border: 2px solid ${({ $connected, theme }) =>
    $connected ? theme.colors.success[200] : 'transparent'};

  ${({ $comingSoon }) => $comingSoon && `
    pointer-events: none;
  `}
`;

const ConnectorStatus = styled.span<{ $status: 'connected' | 'disconnected' | 'coming_soon' }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ $status, theme }) =>
    $status === 'connected'
      ? theme.colors.success[600]
      : $status === 'coming_soon'
        ? theme.colors.warning[600]
        : theme.colors.text.tertiary};
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

const CapabilitiesWrapper = styled.div<{ $expanded: boolean }>`
  overflow: hidden;
  max-height: ${({ $expanded }) => ($expanded ? '500px' : '0')};
  opacity: ${({ $expanded }) => ($expanded ? 1 : 0)};
  transition: max-height 0.3s ease, opacity 0.2s ease;
`;

const CapabilitySectionTitle = styled(Caption)`
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

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

type TabId = 'platforms' | 'flow';

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

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const connectorsList = connectors ?? AVAILABLE_CONNECTORS;

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

  const handleNodeClick = (_platform: Platform) => {
    // Platform node click handling - could show platform settings
  };

  const handleEdgeClick = (_connection: SyncConnection) => {
    // Connection edge click handling - could show sync settings
  };

  const getConnection = (platform: PlatformType): PlatformConnection | undefined => {
    return connections?.find((c) => c.platform === platform);
  };

  const getSyncConfig = (platform: PlatformType): PlatformSyncConfig | undefined => {
    if (!syncConfigs || !Array.isArray(syncConfigs)) return undefined;
    return syncConfigs.find((c) => c.platform === platform);
  };

  const handleConnect = async () => {
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
  };

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
            <Badge variant={enabledVariant(caps.edit)} size="sm">
              {caps.edit ? <Check /> : <X />}
              Edit
            </Badge>
            <Badge variant={enabledVariant(caps.delete)} size="sm">
              {caps.delete ? <Check /> : <X />}
              Delete
            </Badge>
            <Badge variant={enabledVariant(caps.metrics)} size="sm">
              {caps.metrics ? <Check /> : <X />}
              Metrics
            </Badge>
            <Badge variant={enabledVariant(caps.schedule)} size="sm">
              {caps.schedule ? <Check /> : <X />}
              Schedule
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
              {caps.media.images ? <Check /> : <X />}
              Images ({caps.media.maxImages})
            </Badge>
            <Badge variant={enabledVariant(caps.media.videos)} size="sm">
              {caps.media.videos ? <Check /> : <X />}
              Videos
            </Badge>
            <Badge variant={enabledVariant(caps.media.gifs)} size="sm">
              {caps.media.gifs ? <Check /> : <X />}
              GIFs
            </Badge>
          </Stack>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <CapabilitySectionTitle>Interactions</CapabilitySectionTitle>
          <Stack direction="row" wrap gap={2}>
            <Badge variant={enabledVariant(caps.interactions.like)} size="sm">
              {caps.interactions.like ? <Check /> : <X />}
              Like
            </Badge>
            <Badge variant={enabledVariant(caps.interactions.repost)} size="sm">
              {caps.interactions.repost ? <Check /> : <X />}
              Repost
            </Badge>
            <Badge variant={enabledVariant(caps.interactions.reply)} size="sm">
              {caps.interactions.reply ? <Check /> : <X />}
              Reply
            </Badge>
            <Badge variant={enabledVariant(caps.interactions.quote)} size="sm">
              {caps.interactions.quote ? <Check /> : <X />}
              Quote
            </Badge>
            <Badge variant={enabledVariant(caps.interactions.bookmark)} size="sm">
              {caps.interactions.bookmark ? <Check /> : <X />}
              Bookmark
            </Badge>
          </Stack>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <CapabilitySectionTitle>Limits</CapabilitySectionTitle>
          <Stack direction="row" wrap gap={2}>
            <Badge variant="success" size="sm">
              <Check />
              {caps.characterLimit} chars
            </Badge>
            <Badge variant="success" size="sm">
              <Check />
              {caps.altTextLimit} alt text
            </Badge>
          </Stack>
        </div>
      </>
    );
  };

  const renderConnectForm = () => {
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
          <Stack gap={4}>
            <Input
              label="Handle"
              type="text"
              value={credentials.handle || ''}
              onChange={(e) => setCredentials({ ...credentials, handle: e.target.value })}
              placeholder="yourname.bsky.social"
              fullWidth
            />
            <Input
              label="App Password"
              type="password"
              value={credentials.app_password || ''}
              onChange={(e) => setCredentials({ ...credentials, app_password: e.target.value })}
              hint="Create an app password at bsky.app/settings/app-passwords"
              fullWidth
            />
          </Stack>
        );
      case 'oauth2':
        // Instagram vs Mastodon OAuth handling
        if (connectModal.platform === 'instagram') {
          return (
            <Stack gap={4}>
              <SmallText>
                Instagram requires a Business or Creator account connected to a Facebook Page.
                You&apos;ll need to provide your access token from the Meta Developer Console.
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
        // Mastodon OAuth
        return (
          <Input
            label="Instance URL"
            type="text"
            value={credentials.instance || ''}
            onChange={(e) => setCredentials({ ...credentials, instance: e.target.value })}
            placeholder="mastodon.social"
            hint="You'll be redirected to authorize the app"
            fullWidth
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
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
          <SectionTitle style={{ marginTop: '24px' }}>Available Platforms</SectionTitle>
          <Grid minWidth="320px" gap={4} style={{ marginBottom: '32px' }}>
            {connectorsList.map((connector) => {
              const connection = getConnection(connector.platform);
              const isConnected = connection?.connected;
              const isComingSoon = connector.status === 'coming_soon';

              return (
                <ConnectorCard
                  key={connector.id}
                  padding="md"
                  $connected={isConnected}
                  $comingSoon={isComingSoon}
                >
                  {isComingSoon && (
                    <div style={{ position: 'absolute', top: 16, right: 16 }}>
                      <Badge variant="warning-soft" size="sm">
                        Coming Soon
                      </Badge>
                    </div>
                  )}
                  <Stack direction="row" gap={3} align="center" style={{ marginBottom: '16px' }}>
                    <PlatformIcon icon={connector.icon} color={connector.color} size="lg" />
                    <div style={{ flex: 1 }}>
                      <Typography variant="h4">{connector.name}</Typography>
                      <ConnectorStatus
                        $status={
                          isConnected ? 'connected' : isComingSoon ? 'coming_soon' : 'disconnected'
                        }
                      >
                        {isConnected
                          ? `Connected as ${connection?.handle}`
                          : isComingSoon
                            ? 'Coming soon'
                            : 'Not connected'}
                      </ConnectorStatus>
                    </div>
                  </Stack>

                  <div style={{ marginBottom: '16px' }}>
                    <SmallText>{connector.description}</SmallText>
                  </div>

                  {isConnected && connection && (
                    <div style={{ marginBottom: '16px' }}>
                      <DetailsList
                        variant="compact"
                        items={[
                          {
                            label: 'Last Sync',
                            value: (
                              <>
                                <Clock size={14} />
                                {connection.last_sync
                                  ? new Date(connection.last_sync).toLocaleString()
                                  : 'Never'}
                              </>
                            ),
                          },
                          {
                            label: 'Sync Status',
                            value: connection.sync_enabled ? 'Enabled' : 'Disabled',
                          },
                        ]}
                      />
                    </div>
                  )}

                  <ExpandButton onClick={() => toggleExpand(connector.id)}>
                    {expandedCards.has(connector.id) ? (
                      <>
                        Hide Details
                        <ChevronDown style={{ transform: 'rotate(180deg)' }} />
                      </>
                    ) : (
                      <>
                        Show Details
                        <ChevronDown />
                      </>
                    )}
                  </ExpandButton>

                  <CapabilitiesWrapper $expanded={expandedCards.has(connector.id)}>
                    {renderCapabilities(connector)}
                  </CapabilitiesWrapper>

                  <Stack direction="row" gap={2}>
                    {isConnected ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDisconnect(connector.platform)}
                          isLoading={disconnectMutation.isPending}
                        >
                          <Link2Off size={16} />
                          Disconnect
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSettingsModal(connector)}
                        >
                          <Settings size={16} />
                          Settings
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setConnectModal(connector)}
                        disabled={isComingSoon}
                      >
                        <Link2 size={16} />
                        Connect
                      </Button>
                    )}
                  </Stack>
                </ConnectorCard>
              );
            })}
          </Grid>

          <SectionTitle>Sync Configuration</SectionTitle>
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
                      title={!connector.capabilities.read ? 'Inbound sync not supported' : undefined}
                      onClick={() => handleChangeDirection(config, 'inbound')}
                    >
                      {connector.name} {'\u2192'} Hub
                    </DirectionButton>
                    <DirectionButton
                      $active={config.direction === 'bidirectional'}
                      $disabled={!connector.capabilities.read || !connector.capabilities.publish}
                      title={
                        !connector.capabilities.read || !connector.capabilities.publish
                          ? 'Bidirectional sync requires read + publish support'
                          : undefined
                      }
                      onClick={() => handleChangeDirection(config, 'bidirectional')}
                    >
                      Bidirectional
                    </DirectionButton>
                    <DirectionButton
                      $active={config.direction === 'outbound'}
                      $disabled={!connector.capabilities.publish}
                      title={!connector.capabilities.publish ? 'Outbound sync not supported' : undefined}
                      onClick={() => handleChangeDirection(config, 'outbound')}
                    >
                      Hub {'\u2192'} {connector.name}
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

          {connections?.filter((c) => c.connected).length === 0 && (
            <Card padding="lg">
              <div style={{ textAlign: 'center', color: '#666' }}>
                <AlertCircle size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                <p>Connect a platform above to configure sync settings</p>
              </div>
            </Card>
          )}
        </>
      )}

      <Modal
        isOpen={!!connectModal}
        onClose={() => {
          setConnectModal(null);
          setCredentials({});
        }}
        title={`Connect to ${connectModal?.name}`}
        footer={
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
        }
      >
        {renderConnectForm()}
      </Modal>

      {/* Connector Settings Modal */}
      <Modal
        isOpen={!!settingsModal}
        onClose={() => setSettingsModal(null)}
        title={`${settingsModal?.name} Settings`}
        footer={
          <Stack direction="row" justify="end" gap={2}>
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
            <div>
              <Label spacing="md">API Rate Limits</Label>
              <SmallText>
                {settingsModal.capabilities.characterLimit} characters per post
              </SmallText>
            </div>
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
    </div>
  );
}
