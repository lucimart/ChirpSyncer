'use client';

import { useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Sparkles,
  Key,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Shield,
  AlertTriangle,
  ExternalLink,
  CheckCircle,
  Globe,
  Zap,
} from 'lucide-react';
import {
  Button,
  Input,
  Stack,
  Typography,
  SmallText,
  Caption,
  Checkbox,
  SelectableCard,
  Alert,
} from '@/components/ui';

// ============ Types ============
interface NostrCredentials {
  private_key?: string;
  public_key?: string;
  relays?: string;
  [key: string]: string | undefined;
}

interface NostrConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

type WizardStep = 'intro' | 'choose-path' | 'generate' | 'import' | 'relays' | 'confirm';
type ImportSource = 'damus' | 'amethyst' | 'primal' | 'nos' | 'manual';

// ============ Styled Components ============
const WizardContainer = styled.div`
  min-height: 400px;
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const StepDot = styled.div<{ $active: boolean; $completed: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $active, $completed, theme }) =>
    $active
      ? theme.colors.primary[500]
      : $completed
        ? theme.colors.success[500]
        : theme.colors.neutral[200]};
  transition: all 0.2s ease;
`;

const IntroHero = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[6]} 0;
`;

const NostrLogo = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto ${({ theme }) => theme.spacing[4]};
  background: linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%);
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 40px;
  font-weight: bold;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
  margin: ${({ theme }) => theme.spacing[4]} 0;
`;

const FeatureItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: ${({ theme }) => theme.spacing[3]};
`;

const FeatureIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.primary[50]};
  color: ${({ theme }) => theme.colors.primary[600]};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const PathOption = styled(SelectableCard)`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const PathIcon = styled.div<{ $variant: 'new' | 'existing' }>`
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ $variant, theme }) =>
    $variant === 'new'
      ? `linear-gradient(135deg, ${theme.colors.success[400]} 0%, ${theme.colors.success[600]} 100%)`
      : `linear-gradient(135deg, ${theme.colors.primary[400]} 0%, ${theme.colors.primary[600]} 100%)`};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const PathContent = styled.div`
  flex: 1;
`;

const PathTitle = styled.h4`
  margin: 0 0 ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const PathDescription = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const AppGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
`;

const AppCard = styled(SelectableCard)`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[4]};
  text-align: center;
`;

const AppIcon = styled.img`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  object-fit: cover;
`;

const AppIconPlaceholder = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.neutral[100]};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const AppName = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Instructions = styled.div`
  background: ${({ theme }) => theme.colors.neutral[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  margin: ${({ theme }) => theme.spacing[4]} 0;
`;

const InstructionStep = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};

  &:last-child {
    margin-bottom: 0;
  }
`;

const StepNumber = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary[100]};
  color: ${({ theme }) => theme.colors.primary[700]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  flex-shrink: 0;
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const GeneratedKeyBox = styled.div`
  background: ${({ theme }) => theme.colors.neutral[900]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  margin: ${({ theme }) => theme.spacing[3]} 0;
`;

const KeyLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.neutral[400]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const KeyValue = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const KeyText = styled.code`
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.success[400]};
  word-break: break-all;
  flex: 1;
`;

const CopyButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.neutral[400]};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[1]};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  transition: color 0.2s;

  &:hover {
    color: white;
  }
`;

const SecurityBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.warning[50]};
  border: 1px solid ${({ theme }) => theme.colors.warning[200]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[3]};
  margin: ${({ theme }) => theme.spacing[4]} 0;
`;

const SecurityIcon = styled.div`
  color: ${({ theme }) => theme.colors.warning[600]};
  flex-shrink: 0;
`;

const RelayList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  margin: ${({ theme }) => theme.spacing[3]} 0;
`;

const RelayItem = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary[300]};
  }
`;

const RelayInfo = styled.div`
  flex: 1;
`;

const RelayName = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const RelayUrl = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-family: monospace;
`;

const RelayBadge = styled.span<{ $type: 'fast' | 'popular' | 'reliable' }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ $type, theme }) =>
    $type === 'fast'
      ? theme.colors.success[100]
      : $type === 'popular'
        ? theme.colors.primary[100]
        : theme.colors.neutral[100]};
  color: ${({ $type, theme }) =>
    $type === 'fast'
      ? theme.colors.success[700]
      : $type === 'popular'
        ? theme.colors.primary[700]
        : theme.colors.neutral[700]};
`;

const NavigationButtons = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const ConfirmSection = styled.div`
  background: ${({ theme }) => theme.colors.success[50]};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  text-align: center;
  margin: ${({ theme }) => theme.spacing[4]} 0;
`;

const ConfirmIcon = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.success[100]};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.success[600]};
`;

// ============ Constants ============
const POPULAR_RELAYS = [
  { url: 'wss://relay.damus.io', name: 'Damus', badge: 'popular' as const },
  { url: 'wss://nos.lol', name: 'nos.lol', badge: 'fast' as const },
  { url: 'wss://relay.nostr.band', name: 'Nostr Band', badge: 'reliable' as const },
  { url: 'wss://relay.snort.social', name: 'Snort', badge: 'popular' as const },
  { url: 'wss://nostr.wine', name: 'Nostr Wine', badge: 'reliable' as const },
];

const NOSTR_APPS: { id: ImportSource; name: string; icon: string; instructions: string[] }[] = [
  {
    id: 'damus',
    name: 'Damus',
    icon: '/icons/damus.png',
    instructions: [
      'Open Damus on your iPhone',
      'Go to Settings (gear icon)',
      'Tap "Keys" at the bottom',
      'Copy your "Private Key" (nsec...)',
    ],
  },
  {
    id: 'amethyst',
    name: 'Amethyst',
    icon: '/icons/amethyst.png',
    instructions: [
      'Open Amethyst on Android',
      'Tap your profile picture',
      'Go to "Backup Keys"',
      'Copy your private key (nsec...)',
    ],
  },
  {
    id: 'primal',
    name: 'Primal',
    icon: '/icons/primal.png',
    instructions: [
      'Open Primal app or primal.net',
      'Go to Settings > Keys',
      'Click "Show Private Key"',
      'Copy the nsec key',
    ],
  },
  {
    id: 'manual',
    name: 'Other / Manual',
    icon: '',
    instructions: [
      'Find your private key in your current Nostr app',
      'It starts with "nsec1..." or is a 64-character hex',
      'Copy it securely',
    ],
  },
];

// ============ Utility Functions ============
// Simple key generation using Web Crypto API (client-side only)
async function generateNostrKeys(): Promise<{ privateKey: string; publicKey: string }> {
  // Generate random bytes for private key
  const privateKeyBytes = new Uint8Array(32);
  crypto.getRandomValues(privateKeyBytes);

  // Convert to hex (this is a simplified version - real impl would use bech32 for nsec)
  const privateKeyHex = Array.from(privateKeyBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Derive public key using secp256k1 (simplified - real impl needs proper library)
  // For now, return hex format - backend should handle conversion
  const publicKeyHex = privateKeyHex; // Placeholder - real impl needs secp256k1

  return {
    privateKey: privateKeyHex,
    publicKey: publicKeyHex,
  };
}

// ============ Component ============
export function NostrConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: NostrConnectProps) {
  const [step, setStep] = useState<WizardStep>('intro');
  const [path, setPath] = useState<'new' | 'existing' | null>(null);
  const [importSource, setImportSource] = useState<ImportSource | null>(null);
  const [selectedRelays, setSelectedRelays] = useState<string[]>([
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
  ]);
  const [generatedKeys, setGeneratedKeys] = useState<{ privateKey: string; publicKey: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<'private' | 'public' | null>(null);
  const [hasBackedUp, setHasBackedUp] = useState(false);
  const [keyValidation, setKeyValidation] = useState<{ valid: boolean; message?: string } | null>(null);

  const steps: WizardStep[] = path === 'new'
    ? ['intro', 'choose-path', 'generate', 'relays', 'confirm']
    : ['intro', 'choose-path', 'import', 'relays', 'confirm'];

  const currentStepIndex = steps.indexOf(step);

  const validateKey = useCallback((key: string): { valid: boolean; message?: string } => {
    if (!key) return { valid: false };

    // nsec format
    if (key.startsWith('nsec1')) {
      if (key.length === 63) {
        return { valid: true, message: 'Valid nsec key' };
      }
      return { valid: false, message: 'Invalid nsec length' };
    }

    // hex format
    if (/^[a-fA-F0-9]{64}$/.test(key)) {
      return { valid: true, message: 'Valid hex key' };
    }

    return { valid: false, message: 'Invalid key format' };
  }, []);

  const handlePrivateKeyChange = (value: string) => {
    onCredentialsChange({ ...credentials, private_key: value });
    if (value) {
      setKeyValidation(validateKey(value));
    } else {
      setKeyValidation(null);
    }
  };

  const handleGenerateKeys = async () => {
    const keys = await generateNostrKeys();
    setGeneratedKeys(keys);
    onCredentialsChange({
      ...credentials,
      private_key: keys.privateKey,
      public_key: keys.publicKey,
    });
  };

  const copyToClipboard = async (text: string, type: 'private' | 'public') => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(type);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleRelay = (url: string) => {
    setSelectedRelays(prev =>
      prev.includes(url)
        ? prev.filter(r => r !== url)
        : [...prev, url]
    );
  };

  const goNext = () => {
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      setStep(nextStep);

      // Update credentials with selected relays when moving to confirm
      if (nextStep === 'confirm') {
        onCredentialsChange({
          ...credentials,
          relays: selectedRelays.join(','),
        });
      }
    }
  };

  const goBack = () => {
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 'intro':
        return true;
      case 'choose-path':
        return path !== null;
      case 'generate':
        return generatedKeys !== null && hasBackedUp;
      case 'import':
        return !!credentials.private_key && keyValidation?.valid === true;
      case 'relays':
        return selectedRelays.length > 0;
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  // ============ Render Steps ============
  const renderIntro = () => (
    <IntroHero>
      <NostrLogo>N</NostrLogo>
      <Typography variant="h3" style={{ marginBottom: 8 }}>
        Connect to Nostr
      </Typography>
      <SmallText style={{ color: '#666', maxWidth: 400, margin: '0 auto' }}>
        Nostr is a decentralized social network where <strong>you own your identity</strong>.
        No company controls your account - your posts live across multiple servers (relays)
        and follow you everywhere.
      </SmallText>

      <FeatureGrid>
        <FeatureItem>
          <FeatureIcon>
            <Key size={20} />
          </FeatureIcon>
          <Caption>You own your keys</Caption>
        </FeatureItem>
        <FeatureItem>
          <FeatureIcon>
            <Globe size={20} />
          </FeatureIcon>
          <Caption>Decentralized</Caption>
        </FeatureItem>
        <FeatureItem>
          <FeatureIcon>
            <Zap size={20} />
          </FeatureIcon>
          <Caption>Censorship resistant</Caption>
        </FeatureItem>
      </FeatureGrid>
    </IntroHero>
  );

  const renderChoosePath = () => (
    <Stack gap={4}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <Typography variant="h4">How would you like to connect?</Typography>
      </div>

      <PathOption
        selected={path === 'new'}
        onClick={() => setPath('new')}
      >
        <PathIcon $variant="new">
          <Sparkles size={24} />
        </PathIcon>
        <PathContent>
          <PathTitle>I&apos;m new to Nostr</PathTitle>
          <PathDescription>
            Create a fresh identity in seconds. We&apos;ll generate your keys
            and help you get started.
          </PathDescription>
        </PathContent>
        {path === 'new' && <Check size={20} color="#22c55e" />}
      </PathOption>

      <PathOption
        selected={path === 'existing'}
        onClick={() => setPath('existing')}
      >
        <PathIcon $variant="existing">
          <Key size={24} />
        </PathIcon>
        <PathContent>
          <PathTitle>I already have a Nostr account</PathTitle>
          <PathDescription>
            Import your existing identity from Damus, Amethyst, Primal,
            or any other Nostr app.
          </PathDescription>
        </PathContent>
        {path === 'existing' && <Check size={20} color="#22c55e" />}
      </PathOption>
    </Stack>
  );

  const renderGenerate = () => (
    <Stack gap={4}>
      <div style={{ textAlign: 'center' }}>
        <Typography variant="h4">Create Your Nostr Identity</Typography>
        <SmallText style={{ color: '#666' }}>
          Your identity is a pair of cryptographic keys. Keep your private key secret!
        </SmallText>
      </div>

      {!generatedKeys ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Button onClick={handleGenerateKeys} size="lg">
            <Sparkles size={20} />
            Generate My Identity
          </Button>
        </div>
      ) : (
        <>
          <GeneratedKeyBox>
            <KeyLabel>
              <Shield size={14} />
              Private Key (keep this secret!)
            </KeyLabel>
            <KeyValue>
              <KeyText>{generatedKeys.privateKey.slice(0, 16)}...{generatedKeys.privateKey.slice(-8)}</KeyText>
              <CopyButton onClick={() => copyToClipboard(generatedKeys.privateKey, 'private')}>
                {copiedKey === 'private' ? <Check size={18} /> : <Copy size={18} />}
              </CopyButton>
            </KeyValue>
          </GeneratedKeyBox>

          <SecurityBanner>
            <SecurityIcon>
              <AlertTriangle size={24} />
            </SecurityIcon>
            <div>
              <SmallText style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}>
                Save your private key now!
              </SmallText>
              <SmallText style={{ color: '#92400e' }}>
                This is the only way to recover your account. Store it somewhere safe
                (password manager, written down in a secure place).
                If you lose it, your Nostr identity is gone forever.
              </SmallText>
            </div>
          </SecurityBanner>

          <Checkbox
            label="I have saved my private key in a safe place"
            checked={hasBackedUp}
            onChange={(e) => setHasBackedUp(e.target.checked)}
          />
        </>
      )}
    </Stack>
  );

  const renderImport = () => (
    <Stack gap={4}>
      <div style={{ textAlign: 'center' }}>
        <Typography variant="h4">Import Your Identity</Typography>
        <SmallText style={{ color: '#666' }}>
          Select where you&apos;re importing from for step-by-step instructions
        </SmallText>
      </div>

      {!importSource ? (
        <AppGrid>
          {NOSTR_APPS.map((app) => (
            <AppCard
              key={app.id}
              selected={importSource === app.id}
              onClick={() => setImportSource(app.id)}
            >
              {app.icon ? (
                <AppIconPlaceholder>
                  <Key size={24} />
                </AppIconPlaceholder>
              ) : (
                <AppIconPlaceholder>
                  <Key size={24} />
                </AppIconPlaceholder>
              )}
              <AppName>{app.name}</AppName>
            </AppCard>
          ))}
        </AppGrid>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setImportSource(null)}
            style={{ alignSelf: 'flex-start' }}
          >
            <ArrowLeft size={16} />
            Back to app selection
          </Button>

          <Instructions>
            <SmallText style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
              How to get your key from {NOSTR_APPS.find(a => a.id === importSource)?.name}:
            </SmallText>
            {NOSTR_APPS.find(a => a.id === importSource)?.instructions.map((instruction, i) => (
              <InstructionStep key={i}>
                <StepNumber>{i + 1}</StepNumber>
                <SmallText>{instruction}</SmallText>
              </InstructionStep>
            ))}
          </Instructions>

          <Input
            label="Your Private Key"
            type="password"
            value={credentials.private_key || ''}
            onChange={(e) => handlePrivateKeyChange(e.target.value)}
            placeholder="nsec1... or 64-character hex"
            hint={keyValidation?.message || "Paste your private key here"}
            error={keyValidation && !keyValidation.valid ? keyValidation.message : undefined}
            fullWidth
          />

          {keyValidation?.valid && (
            <Alert variant="success">
              <CheckCircle size={16} />
              Key validated successfully
            </Alert>
          )}
        </>
      )}
    </Stack>
  );

  const renderRelays = () => (
    <Stack gap={4}>
      <div style={{ textAlign: 'center' }}>
        <Typography variant="h4">Choose Your Relays</Typography>
        <SmallText style={{ color: '#666' }}>
          Relays are servers that store and share your posts. Select at least 2-3 for reliability.
        </SmallText>
      </div>

      <RelayList>
        {POPULAR_RELAYS.map((relay) => (
          <RelayItem key={relay.url}>
            <Checkbox
              checked={selectedRelays.includes(relay.url)}
              onChange={() => toggleRelay(relay.url)}
            />
            <RelayInfo>
              <RelayName>{relay.name}</RelayName>
              <RelayUrl>{relay.url}</RelayUrl>
            </RelayInfo>
            <RelayBadge $type={relay.badge}>
              {relay.badge === 'fast' ? '⚡ Fast' : relay.badge === 'popular' ? '🔥 Popular' : '✓ Reliable'}
            </RelayBadge>
          </RelayItem>
        ))}
      </RelayList>

      <SmallText style={{ color: '#666', textAlign: 'center' }}>
        Selected: {selectedRelays.length} relays
      </SmallText>
    </Stack>
  );

  const renderConfirm = () => (
    <Stack gap={4}>
      <ConfirmSection>
        <ConfirmIcon>
          <CheckCircle size={32} />
        </ConfirmIcon>
        <Typography variant="h4">Ready to Connect!</Typography>
        <SmallText style={{ color: '#166534' }}>
          Your Nostr identity is configured
        </SmallText>
      </ConfirmSection>

      <div style={{ padding: '0 16px' }}>
        <SmallText style={{ color: '#666' }}>
          <strong>Relays:</strong> {selectedRelays.length} selected
        </SmallText>
        <SmallText style={{ color: '#666' }}>
          <strong>Identity:</strong> {path === 'new' ? 'Newly generated' : 'Imported'}
        </SmallText>
      </div>

      <Alert variant="info">
        Once connected, ChirpSyncer can sync your posts between Nostr and other platforms.
      </Alert>
    </Stack>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 'intro':
        return renderIntro();
      case 'choose-path':
        return renderChoosePath();
      case 'generate':
        return renderGenerate();
      case 'import':
        return renderImport();
      case 'relays':
        return renderRelays();
      case 'confirm':
        return renderConfirm();
      default:
        return null;
    }
  };

  return (
    <WizardContainer>
      <StepIndicator>
        {steps.map((s, i) => (
          <StepDot
            key={s}
            $active={s === step}
            $completed={i < currentStepIndex}
          />
        ))}
      </StepIndicator>

      {renderCurrentStep()}

      <NavigationButtons>
        {step !== 'intro' ? (
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft size={16} />
            Back
          </Button>
        ) : (
          <div />
        )}

        {step === 'confirm' ? (
          <Button onClick={onConnect} disabled={isConnecting}>
            {isConnecting ? 'Connecting...' : 'Connect Nostr'}
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canProceed()}>
            {step === 'intro' ? 'Get Started' : 'Continue'}
            <ArrowRight size={16} />
          </Button>
        )}
      </NavigationButtons>
    </WizardContainer>
  );
}

export default NostrConnect;
