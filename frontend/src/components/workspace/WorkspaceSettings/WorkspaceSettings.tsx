/**
 * Sprint 21: Workspace Settings
 * Settings panel for workspace configuration
 */

'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
import type { Workspace } from '../WorkspaceSwitcher';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Label } from '../../ui/Label';

export interface WorkspaceSettingsProps {
  workspace: Workspace;
  currentUserRole: 'admin' | 'editor' | 'viewer';
  isOwner?: boolean;
  onUpdate: (updates: Partial<Workspace>) => void;
  onDelete: () => void;
  onLeave: () => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const TypeDisplay = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: capitalize;
`;

const DangerZone = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.surface.danger.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.surface.danger.bg};
`;

const DangerZoneTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.surface.danger.text};
  margin: 0 0 ${({ theme }) => theme.spacing[3]} 0;
`;

const DangerActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const WarningIcon = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const IconCircle = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.surface.danger.bg};
  color: ${({ theme }) => theme.colors.danger[600]};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DialogTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: center;
  margin: 0 0 ${({ theme }) => theme.spacing[2]} 0;
`;

const DialogDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
  margin: 0 0 ${({ theme }) => theme.spacing[6]} 0;
`;

const DialogFooter = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  justify-content: flex-end;
`;

export function WorkspaceSettings({
  workspace,
  currentUserRole,
  isOwner = false,
  onUpdate,
  onDelete,
  onLeave,
}: WorkspaceSettingsProps) {
  const [name, setName] = useState(workspace.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isAdmin = currentUserRole === 'admin';
  const canEdit = isAdmin;

  const handleSave = () => {
    if (name.trim() && name !== workspace.name) {
      onUpdate({ name: name.trim() });
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <Container data-testid="workspace-settings">
      <Section>
        <SectionTitle>General</SectionTitle>

        <FieldGroup>
          <Input
            label="Workspace Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            fullWidth
          />
        </FieldGroup>

        <FieldGroup>
          <Label spacing="none">Workspace Type</Label>
          <TypeDisplay>{workspace.type}</TypeDisplay>
        </FieldGroup>

        {canEdit && (
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!name.trim() || name === workspace.name}
          >
            Save Changes
          </Button>
        )}
      </Section>

      <DangerZone>
        <DangerZoneTitle>Danger Zone</DangerZoneTitle>
        <DangerActions>
          {!isOwner && (
            <Button variant="secondary" onClick={onLeave}>
              Leave Workspace
            </Button>
          )}
          {isAdmin && (
            <Button variant="danger" onClick={handleDeleteClick}>
              Delete Workspace
            </Button>
          )}
        </DangerActions>
      </DangerZone>

      <Modal isOpen={showDeleteConfirm} onClose={handleDeleteCancel} size="sm">
        <WarningIcon>
          <IconCircle>
            <AlertTriangle size={32} />
          </IconCircle>
        </WarningIcon>

        <DialogTitle>Are you sure?</DialogTitle>
        <DialogDescription>
          This action cannot be undone. This will permanently delete the workspace
          and all its data.
        </DialogDescription>

        <DialogFooter>
          <Button variant="secondary" onClick={handleDeleteCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </Modal>
    </Container>
  );
}
