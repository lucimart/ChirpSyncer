'use client';

import { useMemo, ReactNode } from 'react';
import styled from 'styled-components';
import { LucideIcon, CheckCircle, Key, Shield, Zap } from 'lucide-react';
import {
  ConnectionWizard,
  WizardStep,
  PlatformIntro,
  PlatformFeature,
  OAuthGuide,
  OAuthStep,
  Input,
  Stack,
  SmallText,
  Alert,
} from '@/components/ui';

// ============ Types ============
export interface OAuthField {
  key: string;
  label: string;
  type: 'text' | 'password';
  placeholder?: string;
  hint?: string;
  required?: boolean;
}

export interface OAuthConnectConfig {
  // Platform info
  platform: string;
  tagline: string;
  description: string;
  color: string;
  logo: ReactNode;
  features?: PlatformFeature[];
  learnMoreUrl?: string;

  // Developer portal
  portalName: string;
  portalUrl: string;
  setupSteps: OAuthStep[];
  scopes?: string[];
  warning?: string;
  tip?: string;

  // Credential fields
  fields: OAuthField[];
}

interface OAuthConnectProps {
  config: OAuthConnectConfig;
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const FieldsGrid = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

// ============ Preset Configs ============
export const OAUTH_CONFIGS: Record<string, OAuthConnectConfig> = {
  linkedin: {
    platform: 'LinkedIn',
    tagline: 'The professional network',
    description: 'Connect your LinkedIn account to share professional updates and sync your content across platforms.',
    color: '#0A66C2',
    logo: <span style={{ fontSize: 24, fontWeight: 'bold' }}>in</span>,
    features: [
      { icon: Key, label: 'OAuth 2.0' },
      { icon: Shield, label: 'Secure' },
      { icon: Zap, label: 'Post & share' },
    ],
    portalName: 'LinkedIn Developer Portal',
    portalUrl: 'https://www.linkedin.com/developers/apps',
    setupSteps: [
      {
        title: 'Create a LinkedIn App',
        description: 'Go to the LinkedIn Developer Portal and create a new application.',
        tip: 'You\'ll need a LinkedIn Page to create an app.',
      },
      {
        title: 'Configure OAuth Settings',
        description: 'In your app settings, go to Auth and add the redirect URL for ChirpSyncer.',
      },
      {
        title: 'Request API Access',
        description: 'Go to Products and request access to "Share on LinkedIn" and "Sign in with LinkedIn".',
        tip: 'Some products require manual review which can take a few days.',
      },
      {
        title: 'Generate Access Token',
        description: 'Use the OAuth flow or LinkedIn\'s token generator tool to get an access token.',
      },
    ],
    scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
    warning: 'LinkedIn API access may require app review for certain permissions.',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true, hint: 'OAuth 2.0 access token from LinkedIn' },
    ],
  },
  facebook: {
    platform: 'Facebook',
    tagline: 'Connect with Pages',
    description: 'Connect your Facebook Page to sync posts and engage with your audience across platforms.',
    color: '#1877F2',
    logo: <span style={{ fontSize: 28, fontWeight: 'bold' }}>f</span>,
    features: [
      { icon: Key, label: 'Page token' },
      { icon: Shield, label: 'Secure' },
      { icon: Zap, label: 'Post & engage' },
    ],
    portalName: 'Meta Developer Console',
    portalUrl: 'https://developers.facebook.com/apps',
    setupSteps: [
      {
        title: 'Create a Meta App',
        description: 'Go to Meta for Developers and create a new app of type "Business".',
      },
      {
        title: 'Add Facebook Login Product',
        description: 'In your app dashboard, add the "Facebook Login" product.',
      },
      {
        title: 'Generate Page Access Token',
        description: 'Use the Graph API Explorer to generate a Page Access Token for your page.',
        tip: 'Select your app, then your page, and request the required permissions.',
      },
      {
        title: 'Extend Token (Optional)',
        description: 'Use the Access Token Debugger to extend your token to a long-lived token.',
      },
    ],
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
    tip: 'You need admin access to the Facebook Page you want to connect.',
    fields: [
      { key: 'access_token', label: 'Page Access Token', type: 'password', required: true, hint: 'Long-lived Page access token' },
    ],
  },
  threads: {
    platform: 'Threads',
    tagline: 'Where ideas meet',
    description: 'Connect your Threads account to sync text posts and updates from Instagram\'s companion app.',
    color: '#000000',
    logo: <span style={{ fontSize: 28, fontWeight: 'bold' }}>@</span>,
    features: [
      { icon: Key, label: 'Meta OAuth' },
      { icon: Shield, label: 'Secure' },
      { icon: Zap, label: 'Post threads' },
    ],
    portalName: 'Meta Developer Console',
    portalUrl: 'https://developers.facebook.com/apps',
    setupSteps: [
      {
        title: 'Create a Meta App',
        description: 'Go to Meta for Developers and create a new app.',
      },
      {
        title: 'Enable Threads API',
        description: 'In your app dashboard, go to Add Products and enable the Threads API.',
      },
      {
        title: 'Configure OAuth Settings',
        description: 'Add the ChirpSyncer redirect URL in your Threads API settings.',
      },
      {
        title: 'Generate Access Token',
        description: 'Complete the OAuth flow to get your access token.',
      },
    ],
    scopes: ['threads_basic', 'threads_content_publish', 'threads_manage_insights'],
    tip: 'Threads API access is tied to your Instagram account.',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true, hint: 'Threads API access token' },
    ],
  },
  reddit: {
    platform: 'Reddit',
    tagline: 'The front page of the internet',
    description: 'Connect your Reddit account to sync posts to subreddits and engage with communities.',
    color: '#FF4500',
    logo: <span style={{ fontSize: 24 }}>👽</span>,
    features: [
      { icon: Key, label: 'OAuth 2.0' },
      { icon: Shield, label: 'Secure' },
      { icon: Zap, label: 'Post & comment' },
    ],
    portalName: 'Reddit App Preferences',
    portalUrl: 'https://www.reddit.com/prefs/apps',
    setupSteps: [
      {
        title: 'Create a Reddit App',
        description: 'Go to Reddit preferences and click "create an app" at the bottom.',
      },
      {
        title: 'Choose App Type',
        description: 'Select "script" for personal use or "web app" for broader access.',
        tip: 'Script apps are easier to set up for personal use.',
      },
      {
        title: 'Get Credentials',
        description: 'Copy your Client ID (under the app name) and Client Secret.',
      },
      {
        title: 'Generate Refresh Token',
        description: 'Use the OAuth flow to get a refresh token for long-term access.',
        tip: 'There are various tools online to help generate Reddit OAuth tokens.',
      },
    ],
    scopes: ['submit', 'read', 'identity'],
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true, placeholder: 'xxxxxxxxxxxxxxx' },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true, hint: 'For automatic token refresh' },
    ],
  },
  youtube: {
    platform: 'YouTube',
    tagline: 'Broadcast yourself',
    description: 'Connect your YouTube channel to manage videos, community posts, and channel content.',
    color: '#FF0000',
    logo: <span style={{ fontSize: 24 }}>▶</span>,
    features: [
      { icon: Key, label: 'Google OAuth' },
      { icon: Shield, label: 'Secure' },
      { icon: Zap, label: 'Manage channel' },
    ],
    portalName: 'Google Cloud Console',
    portalUrl: 'https://console.cloud.google.com/apis/dashboard',
    setupSteps: [
      {
        title: 'Create a Google Cloud Project',
        description: 'Go to Google Cloud Console and create a new project.',
      },
      {
        title: 'Enable YouTube Data API v3',
        description: 'In APIs & Services, enable the YouTube Data API v3.',
      },
      {
        title: 'Configure OAuth Consent',
        description: 'Set up the OAuth consent screen with your app details.',
        tip: 'Choose "External" user type unless you have a Google Workspace account.',
      },
      {
        title: 'Create OAuth Credentials',
        description: 'Create OAuth 2.0 credentials and add the ChirpSyncer redirect URL.',
      },
      {
        title: 'Generate Tokens',
        description: 'Use the OAuth flow to get access and refresh tokens.',
      },
    ],
    scopes: ['https://www.googleapis.com/auth/youtube.force-ssl'],
    warning: 'Google OAuth requires app verification for public use.',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true, placeholder: 'xxxxx.apps.googleusercontent.com' },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true, hint: 'For automatic token refresh' },
    ],
  },
  tiktok: {
    platform: 'TikTok',
    tagline: 'Make your day',
    description: 'Connect your TikTok account to manage content and sync posts across platforms.',
    color: '#000000',
    logo: <span style={{ fontSize: 24 }}>♪</span>,
    features: [
      { icon: Key, label: 'OAuth 2.0' },
      { icon: Shield, label: 'Secure' },
      { icon: Zap, label: 'Post videos' },
    ],
    portalName: 'TikTok Developer Portal',
    portalUrl: 'https://developers.tiktok.com/',
    setupSteps: [
      {
        title: 'Create a TikTok Developer Account',
        description: 'Sign up at developers.tiktok.com with your TikTok account.',
      },
      {
        title: 'Create an App',
        description: 'Go to Manage Apps and create a new application.',
      },
      {
        title: 'Request API Access',
        description: 'Apply for the APIs you need (Content Posting, User Info, etc.).',
        tip: 'TikTok requires manual review which can take 1-2 weeks.',
      },
      {
        title: 'Configure OAuth',
        description: 'Add the ChirpSyncer redirect URL in your app settings.',
      },
      {
        title: 'Generate Tokens',
        description: 'Complete the OAuth flow once approved to get your tokens.',
      },
    ],
    scopes: ['user.info.basic', 'video.list', 'video.publish'],
    warning: 'TikTok API requires app review and approval before use.',
    fields: [
      { key: 'client_key', label: 'Client Key', type: 'text', required: true, placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true },
    ],
  },
  tumblr: {
    platform: 'Tumblr',
    tagline: 'Come for what you love. Stay for what you discover.',
    description: 'Connect your Tumblr blog to sync posts and engage with the community.',
    color: '#001935',
    logo: <span style={{ fontSize: 24, fontWeight: 'bold' }}>t</span>,
    features: [
      { icon: Key, label: 'OAuth 1.0a' },
      { icon: Shield, label: 'Secure' },
      { icon: Zap, label: 'Post & reblog' },
    ],
    portalName: 'Tumblr OAuth Apps',
    portalUrl: 'https://www.tumblr.com/oauth/apps',
    setupSteps: [
      {
        title: 'Register an Application',
        description: 'Go to Tumblr OAuth Apps and click "Register application".',
      },
      {
        title: 'Fill App Details',
        description: 'Enter your application name, website, and description.',
      },
      {
        title: 'Get Consumer Keys',
        description: 'Copy your Consumer Key and Consumer Secret.',
      },
      {
        title: 'Authorize and Get Tokens',
        description: 'Complete the OAuth 1.0a flow to get your access tokens.',
        tip: 'OAuth 1.0a is more complex - consider using a library or tool to help.',
      },
    ],
    fields: [
      { key: 'consumer_key', label: 'Consumer Key', type: 'text', required: true },
      { key: 'consumer_secret', label: 'Consumer Secret', type: 'password', required: true },
      { key: 'oauth_token', label: 'OAuth Token', type: 'text', required: true },
      { key: 'oauth_token_secret', label: 'OAuth Token Secret', type: 'password', required: true },
    ],
  },
  pinterest: {
    platform: 'Pinterest',
    tagline: 'Get your next great idea',
    description: 'Connect your Pinterest account to manage pins and boards across platforms.',
    color: '#E60023',
    logo: <span style={{ fontSize: 24, fontWeight: 'bold' }}>P</span>,
    features: [
      { icon: Key, label: 'OAuth 2.0' },
      { icon: Shield, label: 'Secure' },
      { icon: Zap, label: 'Pin & create' },
    ],
    portalName: 'Pinterest Developer Portal',
    portalUrl: 'https://developers.pinterest.com/apps/',
    setupSteps: [
      {
        title: 'Create a Pinterest App',
        description: 'Go to the Pinterest Developer Portal and create a new app.',
      },
      {
        title: 'Configure Redirect URIs',
        description: 'Add the ChirpSyncer redirect URL in your app settings.',
      },
      {
        title: 'Generate Access Token',
        description: 'Use the OAuth 2.0 flow to generate an access token.',
      },
      {
        title: 'Get Refresh Token',
        description: 'Save the refresh token for automatic token renewal.',
      },
    ],
    scopes: ['boards:read', 'boards:write', 'pins:read', 'pins:write'],
    fields: [
      { key: 'client_id', label: 'App ID', type: 'text', required: true },
      { key: 'client_secret', label: 'App Secret', type: 'password', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true },
    ],
  },
};

// ============ Component ============
export function OAuthConnect({
  config,
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: OAuthConnectProps) {
  const requiredFields = config.fields.filter(f => f.required !== false);

  const canConnect = useMemo(() => {
    return requiredFields.every(field => {
      const value = credentials[field.key];
      return value && value.length > 0;
    });
  }, [credentials, requiredFields]);

  const fieldColumns = config.fields.length <= 2 ? 1 : 2;

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={config.logo}
          name={config.platform}
          tagline={config.tagline}
          description={config.description}
          features={config.features}
          color={config.color}
          learnMoreUrl={config.learnMoreUrl}
        />
      ),
      canProceed: true,
    },
    {
      id: 'setup',
      title: 'Setup Guide',
      content: (
        <StepContainer>
          <OAuthGuide
            platform={config.platform}
            portalName={config.portalName}
            portalUrl={config.portalUrl}
            steps={config.setupSteps}
            scopes={config.scopes}
            warning={config.warning}
            tip={config.tip}
            color={config.color}
          />
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'credentials',
      title: 'Credentials',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <div style={{ textAlign: 'center' }}>
              <SmallText style={{ color: '#666' }}>
                Enter the credentials you obtained from the {config.portalName}.
              </SmallText>
            </div>

            <FieldsGrid $columns={fieldColumns}>
              {config.fields.map((field) => (
                <Input
                  key={field.key}
                  label={field.label}
                  type={field.type}
                  value={credentials[field.key] || ''}
                  onChange={(e) => onCredentialsChange({ ...credentials, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  hint={field.hint}
                  fullWidth
                />
              ))}
            </FieldsGrid>
          </Stack>
        </StepContainer>
      ),
      canProceed: canConnect,
    },
    {
      id: 'confirm',
      title: 'Ready',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <div style={{
              textAlign: 'center',
              padding: '32px',
              background: '#f0f9ff',
              borderRadius: '12px'
            }}>
              <div style={{
                width: 64,
                height: 64,
                background: '#dcfce7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#22c55e'
              }}>
                <CheckCircle size={32} />
              </div>
              <h4 style={{ margin: '0 0 8px', fontSize: '18px' }}>Ready to Connect!</h4>
              <SmallText style={{ color: '#666' }}>
                Your {config.platform} credentials are configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              {requiredFields.map((field) => (
                <SmallText key={field.key} style={{ color: '#666' }}>
                  <strong>{field.label}:</strong> ••••••••••••
                </SmallText>
              ))}
            </div>

            <Alert variant="info">
              Once connected, ChirpSyncer can sync your content between {config.platform} and other platforms.
            </Alert>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
  ];

  return (
    <ConnectionWizard
      steps={steps}
      onComplete={onConnect}
      isLoading={isConnecting}
      completeButtonText={`Connect ${config.platform}`}
      platformColor={config.color}
    />
  );
}

export default OAuthConnect;
