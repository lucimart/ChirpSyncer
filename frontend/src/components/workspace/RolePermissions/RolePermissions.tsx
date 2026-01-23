'use client';

import { type FC } from 'react';
import styled from 'styled-components';
import { Check, X } from 'lucide-react';

const PERMISSIONS = [
  { key: 'canViewDashboard', label: 'View Dashboard' },
  { key: 'canManageCredentials', label: 'Manage Credentials' },
  { key: 'canTriggerSync', label: 'Trigger Sync' },
  { key: 'canViewCleanupRules', label: 'View Cleanup Rules' },
  { key: 'canEditCleanupRules', label: 'Edit Cleanup Rules' },
  { key: 'canExecuteCleanup', label: 'Execute Cleanup' },
  { key: 'canViewAnalytics', label: 'View Analytics' },
  { key: 'canExportData', label: 'Export Data' },
  { key: 'canViewAuditLog', label: 'View Audit Log' },
  { key: 'canManageUsers', label: 'Manage Users' },
] as const;

type PermissionKey = (typeof PERMISSIONS)[number]['key'];
type RoleType = 'admin' | 'editor' | 'viewer';

const ICON_SIZE = 16;

const ROLES: readonly RoleType[] = ['admin', 'editor', 'viewer'] as const;

const ROLE_LABELS: Record<RoleType, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
} as const;

const ROLE_PERMISSIONS: Record<RoleType, Record<PermissionKey, boolean>> = {
  admin: {
    canViewDashboard: true,
    canManageCredentials: true,
    canTriggerSync: true,
    canViewCleanupRules: true,
    canEditCleanupRules: true,
    canExecuteCleanup: true,
    canViewAnalytics: true,
    canExportData: true,
    canViewAuditLog: true,
    canManageUsers: true,
  },
  editor: {
    canViewDashboard: true,
    canManageCredentials: true,
    canTriggerSync: true,
    canViewCleanupRules: true,
    canEditCleanupRules: true,
    canExecuteCleanup: false,
    canViewAnalytics: true,
    canExportData: true,
    canViewAuditLog: false,
    canManageUsers: false,
  },
  viewer: {
    canViewDashboard: true,
    canManageCredentials: false,
    canTriggerSync: false,
    canViewCleanupRules: true,
    canEditCleanupRules: false,
    canExecuteCleanup: false,
    canViewAnalytics: true,
    canExportData: false,
    canViewAuditLog: false,
    canManageUsers: false,
  },
};

const Container = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  overflow-x: auto;
`;

const Column = styled.div<{ $minWidth?: string }>`
  display: flex;
  flex-direction: column;
  min-width: ${({ $minWidth }) => $minWidth ?? '100px'};
  text-align: center;
`;

const HeaderCell = styled.div`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Cell = styled.div`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  color: ${({ theme }) => theme.colors.text.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  display: flex;
  align-items: center;
  justify-content: center;

  &:nth-child(even) {
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }
`;

const LabelCell = styled(Cell)`
  justify-content: flex-start;
`;

const IconWrapper = styled.span<{ $granted: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${({ theme, $granted }) =>
    $granted ? theme.colors.success[600] : theme.colors.danger[500]};
`;

interface PermissionIndicatorProps {
  granted: boolean;
  permissionLabel: string;
  role: string;
}

const PermissionIndicator: FC<PermissionIndicatorProps> = ({ granted, permissionLabel, role }) => (
  <IconWrapper
    $granted={granted}
    data-testid={granted ? 'permission-granted' : 'permission-denied'}
    aria-label={`${permissionLabel} ${granted ? 'granted' : 'denied'} for ${role}`}
    role="img"
  >
    {granted ? (
      <Check size={ICON_SIZE} aria-hidden="true" />
    ) : (
      <X size={ICON_SIZE} aria-hidden="true" />
    )}
  </IconWrapper>
);

export const RolePermissions: FC = () => (
  <Container data-testid="role-permissions">
    <Column $minWidth="180px">
      <HeaderCell>Permission</HeaderCell>
      {PERMISSIONS.map((permission) => (
        <LabelCell key={permission.key}>{permission.label}</LabelCell>
      ))}
    </Column>

    {ROLES.map((role) => (
      <Column key={role} data-testid={`permissions-${role}`}>
        <HeaderCell>{ROLE_LABELS[role]}</HeaderCell>
        {PERMISSIONS.map((permission) => (
          <Cell key={permission.key}>
            <PermissionIndicator
              granted={ROLE_PERMISSIONS[role][permission.key]}
              permissionLabel={permission.label}
              role={role}
            />
          </Cell>
        ))}
      </Column>
    ))}
  </Container>
);
