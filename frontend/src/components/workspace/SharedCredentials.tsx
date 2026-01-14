/**
 * Sprint 21: Shared Credentials
 * Component for managing shared credentials within a workspace
 */

'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { Twitter, Share2, FileText, Image } from 'lucide-react';
import type { MemberRole } from './MemberManagement';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export type AccessLevel = 'full' | 'read_only';
export type Platform = 'twitter' | 'bluesky' | 'mastodon' | 'instagram';

export interface SharedCredential {
  id: string;
  name: string;
  platform: Platform;
  sharedBy: string;
  sharedByName: string;
  sharedAt: string;
  accessLevel: AccessLevel;
  lastUsed: string;
}

export interface SharedCredentialsProps {
  credentials: SharedCredential[];
  currentUserRole: MemberRole;
  onShare: (credentialId: string, accessLevel: AccessLevel) => void;
  onRevoke: (credentialId: string) => void;
  onUpdateAccess: (credentialId: string, accessLevel: AccessLevel) => void;
}

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const TableContainer = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background-color: ${({ theme }) => theme.colors.background.tertiary};
`;

const Th = styled.th`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  text-align: left;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const Tbody = styled.tbody``;

const Tr = styled.tr`
  &:hover {
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`;

const Td = styled.td`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CredentialInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const PlatformIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CredentialName = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const Badge = styled.span<{ $variant: 'full' | 'readonly' }>`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  background-color: ${({ theme, $variant }) =>
    $variant === 'full' ? theme.colors.success[100] : theme.colors.warning[100]};
  color: ${({ theme, $variant }) =>
    $variant === 'full' ? theme.colors.success[700] : theme.colors.warning[700]};
`;

const SharedByText = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LastUsedText = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const Select = styled.select`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  background-color: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
  }
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const FormSelect = styled.select`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.base};
  background-color: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
  }
`;

const EmptyState = styled.div`
  padding: ${({ theme }) => theme.spacing[10]};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const platformIcons: Record<Platform, React.ReactNode> = {
  twitter: <Twitter size={18} />,
  bluesky: <Share2 size={18} />,
  mastodon: <FileText size={18} />,
  instagram: <Image size={18} />,
};

const accessLevelLabels: Record<AccessLevel, string> = {
  full: 'Full Access',
  read_only: 'Read Only',
};

function formatLastUsed(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function SharedCredentials({
  credentials,
  currentUserRole,
  onShare,
  onRevoke,
  onUpdateAccess,
}: SharedCredentialsProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedCredentialId, setSelectedCredentialId] = useState('');
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<AccessLevel>('read_only');

  const isAdmin = currentUserRole === 'admin';

  const handleShare = () => {
    if (selectedCredentialId) {
      onShare(selectedCredentialId, selectedAccessLevel);
      setIsShareModalOpen(false);
      setSelectedCredentialId('');
      setSelectedAccessLevel('read_only');
    }
  };

  const handleAccessChange = (credentialId: string, newAccessLevel: AccessLevel) => {
    onUpdateAccess(credentialId, newAccessLevel);
  };

  return (
    <Container data-testid="shared-credentials">
      <Header>
        <Title>Shared Credentials</Title>
        {isAdmin && (
          <Button onClick={() => setIsShareModalOpen(true)}>
            Share Credential
          </Button>
        )}
      </Header>

      {credentials.length === 0 ? (
        <TableContainer>
          <EmptyState>No shared credentials</EmptyState>
        </TableContainer>
      ) : (
        <TableContainer>
          <Table>
            <Thead>
              <tr>
                <Th>Credential</Th>
                <Th>Access Level</Th>
                <Th>Shared By</Th>
                <Th>Last Used</Th>
                <Th>Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {credentials.map((credential) => (
                <Tr key={credential.id}>
                  <Td>
                    <CredentialInfo>
                      <PlatformIcon data-testid={`platform-icon-${credential.platform}`}>
                        {platformIcons[credential.platform]}
                      </PlatformIcon>
                      <CredentialName>{credential.name}</CredentialName>
                    </CredentialInfo>
                  </Td>
                  <Td>
                    {isAdmin ? (
                      <Select
                        aria-label="Access level"
                        value={credential.accessLevel}
                        onChange={(e) =>
                          handleAccessChange(credential.id, e.target.value as AccessLevel)
                        }
                      >
                        <option value="full">Full Access</option>
                        <option value="read_only">Read Only</option>
                      </Select>
                    ) : (
                      <Badge $variant={credential.accessLevel === 'full' ? 'full' : 'readonly'}>
                        {accessLevelLabels[credential.accessLevel]}
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <SharedByText>Shared by {credential.sharedByName}</SharedByText>
                  </Td>
                  <Td>
                    <LastUsedText>{formatLastUsed(credential.lastUsed)}</LastUsedText>
                  </Td>
                  <Td>
                    <Actions>
                      <Button variant="ghost" size="sm">
                        View Audit
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => onRevoke(credential.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </Actions>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Credential"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsShareModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={!selectedCredentialId}>
              Share
            </Button>
          </>
        }
      >
        <FormGroup>
          <Label htmlFor="credential-select">Select Credential</Label>
          <FormSelect
            id="credential-select"
            aria-label="Select Credential"
            value={selectedCredentialId}
            onChange={(e) => setSelectedCredentialId(e.target.value)}
          >
            <option value="">Choose a credential...</option>
            {credentials.map((cred) => (
              <option key={cred.id} value={cred.id}>
                {cred.name} ({cred.platform})
              </option>
            ))}
          </FormSelect>
        </FormGroup>
        <FormGroup>
          <Label htmlFor="access-level-select">Access Level</Label>
          <FormSelect
            id="access-level-select"
            aria-label="Access Level"
            value={selectedAccessLevel}
            onChange={(e) => setSelectedAccessLevel(e.target.value as AccessLevel)}
          >
            <option value="read_only">Read Only</option>
            <option value="full">Full Access</option>
          </FormSelect>
        </FormGroup>
      </Modal>
    </Container>
  );
}
