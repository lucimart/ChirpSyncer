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

const PageHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const PageDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ConnectorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`;

const ConnectorCard = styled(Card)<{ $connected?: boolean; $comingSoon?: boolean }>`
  position: relative;
  opacity: ${({ $comingSoon }) => ($comingSoon ? 0.7 : 1)};
  border: 2px solid ${({ $connected, theme }) =>
    $connected ? theme.colors.success[200] : 'transparent'};

  ${({ $comingSoon }) => $comingSoon && `
    pointer-events: none;
  `}
`;

const ConnectorHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const PlatformIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background-color: ${({ $color }) => $color};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: ${({ theme }) => theme.fontSizes.xl};
`;

const ConnectorInfo = styled.div`
  flex: 1;
`;

const ConnectorName = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
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

const ConnectorDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const CapabilitiesGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const CapabilitySection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const CapabilitySectionTitle = styled.h4`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;


const ConnectorActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
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


const ConnectionDetails = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ConnectionRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => `${theme.spacing[1]} 0`};

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`;

const ConnectionLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ConnectionValue = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ModalContent = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
`;

const SpacedInput = styled(Input)`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[6]};
`;

const SyncConfigCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const SyncConfigHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const SyncConfigTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const FormLabel = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const DirectionSelector = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
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

  // Transform connections to FlowDiagram format
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

  // Add hub node if there are connections
  if (flowDiagramData.platforms.length > 0) {
    flowDiagramData.platforms.unshift({
      id: 'hub-chirpsyncer',
      name: 'ChirpSyncer Hub',
      icon: 'C',
      color: '#6366F1',
      status: 'active',
    });
  }

  const handleNodeClick = (platform: Platform) => {
    // Could open settings modal for the platform
    console.log('Node clicked:', platform);
  };

  const handleEdgeClick = (connection: SyncConnection) => {
    // Could show sync details
    console.log('Edge clicked:', connection);
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
        <CapabilitySection>
          <CapabilitySectionTitle>Core</CapabilitySectionTitle>
          <CapabilitiesGrid>
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
          </CapabilitiesGrid>
        </CapabilitySection>

        <CapabilitySection>
          <CapabilitySectionTitle>Media</CapabilitySectionTitle>
          <CapabilitiesGrid>
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
          </CapabilitiesGrid>
        </CapabilitySection>

        <CapabilitySection>
          <CapabilitySectionTitle>Interactions</CapabilitySectionTitle>
          <CapabilitiesGrid>
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
          </CapabilitiesGrid>
        </CapabilitySection>

        <CapabilitySection>
          <CapabilitySectionTitle>Limits</CapabilitySectionTitle>
          <CapabilitiesGrid>
            <Badge variant="success" size="sm">
              <Check />
              {caps.characterLimit} chars
            </Badge>
            <Badge variant="success" size="sm">
              <Check />
              {caps.altTextLimit} alt text
            </Badge>
          </CapabilitiesGrid>
        </CapabilitySection>
      </>
    );
  };

  const renderConnectForm = () => {
    if (!connectModal) return null;

    switch (connectModal.auth_type) {
      case 'session':
        return (
          <>
            <SpacedInput
              label="Username"
              type="text"
              value={credentials.username || ''}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              placeholder="@username"
              fullWidth
            />
            <SpacedInput
              label="Password"
              type="password"
              value={credentials.password || ''}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              hint="Your credentials are encrypted with AES-256-GCM"
              fullWidth
            />
          </>
        );
      case 'atproto':
        return (
          <>
            <SpacedInput
              label="Handle"
              type="text"
              value={credentials.handle || ''}
              onChange={(e) => setCredentials({ ...credentials, handle: e.target.value })}
              placeholder="yourname.bsky.social"
              fullWidth
            />
            <SpacedInput
              label="App Password"
              type="password"
              value={credentials.app_password || ''}
              onChange={(e) => setCredentials({ ...credentials, app_password: e.target.value })}
              hint="Create an app password at bsky.app/settings/app-passwords"
              fullWidth
            />
          </>
        );
      case 'oauth2':
        return (
          <SpacedInput
            label="Instance URL (for Mastodon)"
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
      <PageHeader>
        <PageTitle>Platform Connectors</PageTitle>
        <PageDescription>
          Connect your social media accounts and configure sync settings
        </PageDescription>
      </PageHeader>

      <Tabs
        tabs={[
          { id: 'platforms', label: 'Platforms', badge: String(connectorsList.filter(c => c.status !== 'coming_soon').length) },
          { id: 'flow', label: 'Flow View', badge: String(flowDiagramData.platforms.length - 1) },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as 'platforms' | 'flow')}
        variant="soft"
      />

      {activeTab === 'flow' ? (
        <div style={{ marginTop: '24px' }}>
          <FlowDiagram
            data={flowDiagramData}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
          />
        </div>
      ) : (
        <>
          <SectionTitle style={{ marginTop: '24px' }}>Available Platforms</SectionTitle>
          <ConnectorGrid>
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
              <ConnectorHeader>
                <PlatformIcon $color={connector.color}>{connector.icon}</PlatformIcon>
                <ConnectorInfo>
                  <ConnectorName>{connector.name}</ConnectorName>
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
                </ConnectorInfo>
              </ConnectorHeader>

              <ConnectorDescription>{connector.description}</ConnectorDescription>

              {isConnected && connection && (
                <ConnectionDetails>
                  <ConnectionRow>
                    <ConnectionLabel>Last Sync</ConnectionLabel>
                    <ConnectionValue>
                      <Clock size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      {connection.last_sync
                        ? new Date(connection.last_sync).toLocaleString()
                        : 'Never'}
                    </ConnectionValue>
                  </ConnectionRow>
                  <ConnectionRow>
                    <ConnectionLabel>Sync Status</ConnectionLabel>
                    <ConnectionValue>
                      {connection.sync_enabled ? 'Enabled' : 'Disabled'}
                    </ConnectionValue>
                  </ConnectionRow>
                </ConnectionDetails>
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

              <ConnectorActions>
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
                    <Button variant="secondary" size="sm">
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
              </ConnectorActions>
            </ConnectorCard>
          );
        })}
      </ConnectorGrid>

      <SectionTitle>Sync Configuration</SectionTitle>
      {connections
        ?.filter((c) => c.connected)
        .map((connection) => {
          const config = getSyncConfig(connection.platform);
          const connector = connectorsList.find((c) => c.platform === connection.platform);

          if (!config || !connector) return null;

          return (
            <SyncConfigCard key={connection.id} padding="md">
              <SyncConfigHeader>
                <SyncConfigTitle>
                  <PlatformIcon $color={connector.color}>{connector.icon}</PlatformIcon>
                  <div>
                    <ConnectorName>{connector.name}</ConnectorName>
                    <ConnectionLabel>{connection.handle}</ConnectionLabel>
                  </div>
                </SyncConfigTitle>
                <Switch
                  checked={config.enabled}
                  onChange={() => handleToggleSync(config)}
                  title={config.enabled ? 'Disable sync' : 'Enable sync'}
                />
              </SyncConfigHeader>

              <FormLabel>Sync Direction</FormLabel>
              <DirectionSelector>
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
              </DirectionSelector>

              <Button variant="secondary" size="sm">
                <Settings size={16} />
                Advanced Settings
                <ChevronRight size={16} />
              </Button>
            </SyncConfigCard>
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
      >
        <ModalContent>
          {renderConnectForm()}
          <ModalActions>
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
          </ModalActions>
        </ModalContent>
      </Modal>
    </div>
  );
}
