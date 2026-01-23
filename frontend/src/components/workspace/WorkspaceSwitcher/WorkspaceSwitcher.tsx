import { useState, useRef, useEffect, useCallback, type FC } from 'react';
import styled from 'styled-components';
import { ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { Stack, SmallText, Caption, Button } from '@/components/ui';

export interface Workspace {
  id: string;
  name: string;
  type: 'personal' | 'team';
  ownerId: string;
  memberCount: number;
  createdAt: string;
}

export interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  onSwitch: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
}

type WorkspaceType = Workspace['type'];

const ICON_SIZE = 16;

const Container = styled.div`
  position: relative;
  display: inline-block;
`;

const TriggerButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.dark};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }
`;

const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  min-width: 240px;
  margin-top: ${({ theme }) => theme.spacing[1]};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  overflow: hidden;
`;

const OptionsList = styled.ul`
  list-style: none;
  margin: 0;
  padding: ${({ theme }) => theme.spacing[1]} 0;
  max-height: 300px;
  overflow-y: auto;
`;

const Option = styled.li<{ $selected: boolean }>`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transitions.fast};
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.surface.primary.bg : 'transparent'};

  &:hover {
    background-color: ${({ theme, $selected }) =>
      $selected ? theme.colors.surface.primary.bg : theme.colors.background.secondary};
  }
`;

const TypeBadge = styled.span<{ $type: WorkspaceType }>`
  display: inline-block;
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[2]}`};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background-color: ${({ theme, $type }) =>
    $type === 'team' ? theme.colors.surface.primary.bg : theme.colors.background.tertiary};
  color: ${({ theme, $type }) =>
    $type === 'team' ? theme.colors.surface.primary.text : theme.colors.text.secondary};
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]};
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.primary[600]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.surface.primary.bg};
  }
`;

const formatMemberCount = (count: number): string =>
  `${count} ${count === 1 ? 'member' : 'members'}`;

export const WorkspaceSwitcher: FC<WorkspaceSwitcherProps> = ({
  workspaces,
  currentWorkspace,
  onSwitch,
  onCreateWorkspace,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelectWorkspace = useCallback(
    (workspaceId: string) => {
      if (workspaceId !== currentWorkspace.id) {
        onSwitch(workspaceId);
      }
      setIsOpen(false);
    },
    [currentWorkspace.id, onSwitch]
  );

  const handleCreateWorkspace = useCallback(() => {
    setIsOpen(false);
    onCreateWorkspace();
  }, [onCreateWorkspace]);

  return (
    <Container data-testid="workspace-switcher" ref={dropdownRef}>
      <TriggerButton
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Current workspace: ${currentWorkspace.name}`}
      >
        <span>{currentWorkspace.name}</span>
        {isOpen ? (
          <ChevronUp size={ICON_SIZE} aria-hidden="true" />
        ) : (
          <ChevronDown size={ICON_SIZE} aria-hidden="true" />
        )}
      </TriggerButton>

      {isOpen && (
        <Dropdown>
          <OptionsList role="listbox" aria-label="Available workspaces">
            {workspaces.map((workspace) => {
              const isSelected = workspace.id === currentWorkspace.id;
              return (
                <Option
                  key={workspace.id}
                  role="option"
                  aria-selected={isSelected}
                  $selected={isSelected}
                  onClick={() => handleSelectWorkspace(workspace.id)}
                >
                  <Stack gap={1}>
                    <Stack direction="row" align="center" gap={2}>
                      <SmallText style={{ fontWeight: 500 }}>{workspace.name}</SmallText>
                      <TypeBadge $type={workspace.type} className={`workspace-type-${workspace.type}`}>{workspace.type}</TypeBadge>
                    </Stack>
                    {workspace.type === 'team' && (
                      <Caption>{formatMemberCount(workspace.memberCount)}</Caption>
                    )}
                  </Stack>
                </Option>
              );
            })}
          </OptionsList>
          <CreateButton type="button" onClick={handleCreateWorkspace}>
            <Plus size={ICON_SIZE} />
            Create Workspace
          </CreateButton>
        </Dropdown>
      )}
    </Container>
  );
};
