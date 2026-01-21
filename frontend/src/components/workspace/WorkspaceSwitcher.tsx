/**
 * Sprint 21: Workspace Switcher
 * Dropdown for switching between personal and team workspaces
 */

import React, { useState, useRef, useEffect } from 'react';

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

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspace,
  onSwitch,
  onCreateWorkspace,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSelectWorkspace = (workspaceId: string) => {
    if (workspaceId !== currentWorkspace.id) {
      onSwitch(workspaceId);
    }
    setIsOpen(false);
  };

  const handleCreateWorkspace = () => {
    setIsOpen(false);
    onCreateWorkspace();
  };

  return (
    <div
      data-testid="workspace-switcher"
      ref={dropdownRef}
      className="workspace-switcher"
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Current workspace: ${currentWorkspace.name}`}
        className="workspace-switcher-trigger"
      >
        <span className="workspace-name">{currentWorkspace.name}</span>
        <span className="dropdown-icon" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div
          className="workspace-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 1000,
            minWidth: '200px',
          }}
        >
          <ul
            role="listbox"
            aria-label="Available workspaces"
            className="workspace-list"
            style={{ listStyle: 'none', margin: 0, padding: 0 }}
          >
            {workspaces.map((workspace) => {
              const isSelected = workspace.id === currentWorkspace.id;
              return (
                <li
                  key={workspace.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectWorkspace(workspace.id)}
                  className={`workspace-option ${isSelected ? 'selected' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="workspace-option-name">{workspace.name}</span>
                  <span
                    className={`workspace-type-badge workspace-type-${workspace.type}`}
                  >
                    {workspace.type}
                  </span>
                  {workspace.type === 'team' && (
                    <span className="workspace-member-count">
                      {workspace.memberCount} {workspace.memberCount === 1 ? 'member' : 'members'}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={handleCreateWorkspace}
            className="create-workspace-button"
            style={{ width: '100%' }}
          >
            Create Workspace
          </button>
        </div>
      )}
    </div>
  );
}
