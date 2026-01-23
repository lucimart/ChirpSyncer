/**
 * Sprint 21: Member Management - TDD Stub
 * Component for managing workspace members and roles
 */

'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { UserPlus, Trash2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { Badge } from '../../ui/Badge';
import { Select } from '../../ui/Select';

export type MemberRole = 'admin' | 'editor' | 'viewer';

export interface WorkspaceMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: MemberRole;
  joinedAt: string;
  lastActive: string;
}

export interface InviteMemberData {
  email: string;
  role: MemberRole;
}

export interface MemberManagementProps {
  members: WorkspaceMember[];
  currentUserId: string;
  currentUserRole: MemberRole;
  onInvite: (data: InviteMemberData) => void;
  onRemove: (memberId: string) => void;
  onUpdateRole: (memberId: string, role: MemberRole) => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
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

const MemberInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const MemberName = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const MemberEmail = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const LastActive = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const InviteForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const ROLES: MemberRole[] = ['admin', 'editor', 'viewer'];

const ROLE_OPTIONS = ROLES.map((role) => ({
  value: role,
  label: role.charAt(0).toUpperCase() + role.slice(1),
}));

const ROLE_BADGE_VARIANT: Record<MemberRole, 'primary' | 'warning' | 'neutral'> = {
  admin: 'primary',
  editor: 'warning',
  viewer: 'neutral',
};

function formatLastActive(lastActive: string): string {
  const date = new Date(lastActive);
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

export function MemberManagement({
  members,
  currentUserId,
  currentUserRole,
  onInvite,
  onRemove,
  onUpdateRole,
}: MemberManagementProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('viewer');

  const isAdmin = currentUserRole === 'admin';

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmail.trim()) {
      onInvite({ email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      setInviteRole('viewer');
      setIsInviteModalOpen(false);
    }
  };

  const handleRoleChange = (memberId: string, newRole: MemberRole) => {
    onUpdateRole(memberId, newRole);
  };

  return (
    <Container data-testid="member-management">
      <Header>
        <Title>Members</Title>
        {isAdmin && (
          <Button
            onClick={() => setIsInviteModalOpen(true)}
            size="sm"
            aria-label="Invite Member"
          >
            <UserPlus size={16} />
            Invite Member
          </Button>
        )}
      </Header>

      <TableContainer>
        <Table role="table" aria-label="Workspace members">
          <Thead>
            <tr>
              <Th scope="col">Member</Th>
              <Th scope="col">Role</Th>
              <Th scope="col">Last Active</Th>
              {isAdmin && <Th scope="col">Actions</Th>}
            </tr>
          </Thead>
          <Tbody>
            {members.map((member) => {
              const isCurrentUser = member.userId === currentUserId;
              const canRemove = isAdmin && !isCurrentUser;

              return (
                <Tr key={member.id} data-testid={`member-row-${member.id}`}>
                  <Td>
                    <MemberInfo>
                      <MemberName>{member.name}</MemberName>
                      <MemberEmail>{member.email}</MemberEmail>
                    </MemberInfo>
                  </Td>
                  <Td>
                    {isAdmin && !isCurrentUser ? (
                      <Select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member.id, e.target.value as MemberRole)
                        }
                        aria-label={`Change role for ${member.name}`}
                        options={ROLE_OPTIONS}
                      />
                    ) : (
                      <Badge
                        variant={ROLE_BADGE_VARIANT[member.role]}
                        size="sm"
                        data-testid={`role-badge-${member.role}`}
                      >
                        {member.role}
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <LastActive>{formatLastActive(member.lastActive)}</LastActive>
                  </Td>
                  {isAdmin && (
                    <Td>
                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemove(member.id)}
                          aria-label={`Remove ${member.name}`}
                          title={`Remove ${member.name}`}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </Td>
                  )}
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>

      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Member"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsInviteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleInviteSubmit}>Send Invite</Button>
          </>
        }
      >
        <InviteForm onSubmit={handleInviteSubmit}>
          <Input
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@example.com"
            fullWidth
            required
          />
          <Select
            label="Role"
            id="invite-role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as MemberRole)}
            options={ROLE_OPTIONS}
            fullWidth
          />
        </InviteForm>
      </Modal>
    </Container>
  );
}
