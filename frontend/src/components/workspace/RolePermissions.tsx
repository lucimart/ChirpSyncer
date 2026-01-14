/**
 * Sprint 21: Role Permissions
 * Display permission matrix for all roles
 */

'use client';

import React from 'react';
import styled from 'styled-components';

// Permission definitions matching MASTER_ROADMAP.md
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

const ROLE_PERMISSIONS: Record<'admin' | 'editor' | 'viewer', Record<PermissionKey, boolean>> = {
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

const PermissionLabels = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 180px;
`;

const LabelHeader = styled.div`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const LabelCell = styled.div`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  color: ${({ theme }) => theme.colors.text.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &:nth-child(even) {
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }
`;

const RoleColumn = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 100px;
  text-align: center;
`;

const RoleHeader = styled.div`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const PermissionCell = styled.div`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  &:nth-child(even) {
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }
`;

const PermissionGranted = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${({ theme }) => theme.colors.success[600]};
`;

const PermissionDenied = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${({ theme }) => theme.colors.danger[500]};
`;

interface PermissionIndicatorProps {
  granted: boolean;
  permissionLabel: string;
  role: string;
}

function PermissionIndicator({ granted, permissionLabel, role }: PermissionIndicatorProps) {
  if (granted) {
    return (
      <PermissionGranted
        data-testid="permission-granted"
        aria-label={`${permissionLabel} granted for ${role}`}
        role="img"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M13.5 4.5L6 12L2.5 8.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </PermissionGranted>
    );
  }

  return (
    <PermissionDenied
      data-testid="permission-denied"
      aria-label={`${permissionLabel} denied for ${role}`}
      role="img"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M12 4L4 12M4 4L12 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </PermissionDenied>
  );
}

export function RolePermissions() {
  const roles = ['admin', 'editor', 'viewer'] as const;
  const roleLabels = { admin: 'Admin', editor: 'Editor', viewer: 'Viewer' };

  return (
    <Container data-testid="role-permissions">
      <PermissionLabels>
        <LabelHeader>Permission</LabelHeader>
        {PERMISSIONS.map((permission) => (
          <LabelCell key={permission.key}>{permission.label}</LabelCell>
        ))}
      </PermissionLabels>

      {roles.map((role) => (
        <RoleColumn key={role} data-testid={`permissions-${role}`}>
          <RoleHeader>{roleLabels[role]}</RoleHeader>
          {PERMISSIONS.map((permission) => (
            <PermissionCell key={permission.key}>
              <PermissionIndicator
                granted={ROLE_PERMISSIONS[role][permission.key]}
                permissionLabel={permission.label}
                role={role}
              />
            </PermissionCell>
          ))}
        </RoleColumn>
      ))}
    </Container>
  );
}
