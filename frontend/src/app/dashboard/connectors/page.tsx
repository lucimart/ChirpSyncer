'use client';

import { useState } from 'react';
import styled from 'styled-components';
import {
  Link2,
  Link2Off,
  Check,
  X,
  ChevronRight,
  Settings,
  RefreshCw,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  Button,
  Card,
  Modal,
  useToast,
} from '@/components/ui';
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

const CapabilityBadge = styled.span<{ $enabled: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  background-color: ${({ $enabled, theme }) =>
    $enabled ? theme.colors.success[50] : theme.colors.gray[100]};
  color: ${({ $enabled, theme }) =>
    $enabled ? theme.colors.success[700] : theme.colors.gray[500]};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  svg {
    width: 12px;
    height: 12px;
  }
`;

const ConnectorActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ComingSoonBadge = styled.span`
  position: absolute;
  top: ${({ theme }) => theme.spacing[3]};
  right: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  background-color: ${({ theme }) => theme.colors.warning[100]};
  color: ${({ theme }) => theme.colors.warning[700]};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
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

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const FormLabel = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const FormInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }
`;

const FormHelp = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: ${({ theme }) => theme.spacing[1]};
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

const SyncToggle = styled.button<{ $enabled: boolean }>`
  position: relative;
  width: 44px;
  height: 24px;
  border: none;
  border-radius: 12px;
  background-color: ${({ $enabled, theme }) =>
    $enabled ? theme.colors.success[500] : theme.colors.gray[300]};
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $enabled }) => ($enabled ? '22px' : '2px')};
    width: 20px;
    height: 20px;
    background-color: white;
    border-radius: 50%;
    transition: left ${({ theme }) => theme.transitions.fast};
  }
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

export default function ConnectorsPage() {
  const { addToast } = useToast();
  const { data: connectors } = useConnectors();
  const { data: connections } = useConnections();
  const { data: syncConfigs } = useSyncConfigs();
  const connectMutation = useConnectPlatform();
  const disconnectMutation = useDisconnectPlatform();
  const updateConfigMutation = useUpdateSyncConfig();

  const [connectModal, setConnectModal] = useState<PlatformConnector | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const connectorsList = connectors ?? AVAILABLE_CONNECTORS;

  const getConnection = (platform: PlatformType): PlatformConnection | undefined => {
    return connections?.find((c) => c.platform === platform);
  };

  const getSyncConfig = (platform: PlatformType): PlatformSyncConfig | undefined => {
    return syncConfigs?.find((c) => c.platform === platform);
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
    return (
      <>
        <CapabilitySection>
          <CapabilitySectionTitle>Core</CapabilitySectionTitle>
          <CapabilitiesGrid>
            <CapabilityBadge $enabled={caps.publish}>
              {caps.publish ? <Check /> : <X />}
              Publish
            </CapabilityBadge>
            <CapabilityBadge $enabled={caps.read}>
              {caps.read ? <Check /> : <X />}
              Read
            </CapabilityBadge>
            <CapabilityBadge $enabled={caps.edit}>
              {caps.edit ? <Check /> : <X />}
              Edit
            </CapabilityBadge>
            <CapabilityBadge $enabled={caps.delete}>
              {caps.delete ? <Check /> : <X />}
              Delete
            </CapabilityBadge>
            <CapabilityBadge $enabled={caps.metrics}>
              {caps.metrics ? <Check /> : <X />}
              Metrics
            </CapabilityBadge>
            <CapabilityBadge $enabled={caps.schedule}>
              {caps.schedule ? <Check /> : <X />}
              Schedule
            </CapabilityBadge>
            <CapabilityBadge $enabled={caps.threads}>
              {caps.threads ? <Check /> : <X />}
              Threads
            </CapabilityBadge>
          </CapabilitiesGrid>
        </CapabilitySection>

        <CapabilitySection>
          <CapabilitySectionTitle>Media</CapabilitySectionTitle>
          <CapabilitiesGrid>
            <CapabilityBadge $enabled={caps.media.images}>
              {caps.media.images ? <Check /> : <X />}
              Images ({caps.media.maxImages})
            </CapabilityBadge>
            <CapabilityBadge $enabled={caps.media.videos}>
              {caps.media.videos ? <Check /> : <X />}
              Videos
            </CapabilityBadge>
            <CapabilityBadge $enabled={caps.media.gifs}>
              {caps.media.gifs ? <Check /> : <X />}
              GIFs
            </CapabilityBadge>
          </CapabilitiesGrid>
        </CapabilitySection>

        <CapabilitySection>
          <CapabilitySectionTitle>Interactions</CapabilitySectionTitle>
          <CapabilitiesGrid>
            <CapabilityBadge $enabled={caps.interactions.like}>
              {caps.interactions.like ? <Check /> : <X />}
              Like
            </CapabilityBadge>
            <CapabilityBadge $enabled={caps.interactions.repost}>
              {caps.interactions.repost ? <Check /> : <X />}
              Repost
            </CapabilityBadge>
            <CapabilityBadge $enabled={caps.interactions.reply}>
              {caps.interactions.reply ? <Check /> : <X />}
              Reply
            </CapabilityBadge>
            <CapabilityBadge $enabled={caps.interactions.quote}>
              {caps.interactions.quote ? <Check /> : <X />}
              Quote
            </CapabilityBadge>
            <CapabilityBadge $enabled={caps.interactions.bookmark}>
              {caps.interactions.bookmark ? <Check /> : <X />}
              Bookmark
            </CapabilityBadge>
          </CapabilitiesGrid>
        </CapabilitySection>

        <CapabilitySection>
          <CapabilitySectionTitle>Limits</CapabilitySectionTitle>
          <CapabilitiesGrid>
            <CapabilityBadge $enabled={true}>
              <Check />
              {caps.characterLimit} chars
            </CapabilityBadge>
            <CapabilityBadge $enabled={true}>
              <Check />
              {caps.altTextLimit} alt text
            </CapabilityBadge>
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
            <FormGroup>
              <FormLabel>Username</FormLabel>
              <FormInput
                type="text"
                value={credentials.username || ''}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                placeholder="@username"
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Password</FormLabel>
              <FormInput
                type="password"
                value={credentials.password || ''}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              />
              <FormHelp>Your credentials are encrypted with AES-256-GCM</FormHelp>
            </FormGroup>
          </>
        );
      case 'atproto':
        return (
          <>
            <FormGroup>
              <FormLabel>Handle</FormLabel>
              <FormInput
                type="text"
                value={credentials.handle || ''}
                onChange={(e) => setCredentials({ ...credentials, handle: e.target.value })}
                placeholder="yourname.bsky.social"
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>App Password</FormLabel>
              <FormInput
                type="password"
                value={credentials.app_password || ''}
                onChange={(e) => setCredentials({ ...credentials, app_password: e.target.value })}
              />
              <FormHelp>Create an app password at bsky.app/settings/app-passwords</FormHelp>
            </FormGroup>
          </>
        );
      case 'oauth2':
        return (
          <FormGroup>
            <FormLabel>Instance URL (for Mastodon)</FormLabel>
            <FormInput
              type="text"
              value={credentials.instance || ''}
              onChange={(e) => setCredentials({ ...credentials, instance: e.target.value })}
              placeholder="mastodon.social"
            />
            <FormHelp>You&apos;ll be redirected to authorize the app</FormHelp>
          </FormGroup>
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

      <SectionTitle>Available Platforms</SectionTitle>
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
              {isComingSoon && <ComingSoonBadge>Coming Soon</ComingSoonBadge>}
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

              {renderCapabilities(connector)}

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
                <SyncToggle
                  $enabled={config.enabled}
                  onClick={() => handleToggleSync(config)}
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
                  {connector.name} → Hub
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
                  Hub → {connector.name}
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
