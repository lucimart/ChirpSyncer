'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { LayoutGrid } from 'lucide-react';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui';
import { Widget, WidgetConfig } from './Widget';
import { WidgetPicker } from './WidgetPicker';

export interface WidgetGridProps {
  widgets: WidgetConfig[];
  onLayoutChange: (widgets: WidgetConfig[]) => void;
  onRemoveWidget: (id: string) => void;
  onWidgetSettings: (id: string) => void;
  compact?: boolean;
}

const GridContainer = styled.div<{ $compact: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const GridHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spacing[2]} 0`};
`;

const GridTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};

  /* Override Button to ensure SVG size match if needed, though ui/Button aligns items center */
  button svg {
    width: 16px;
    height: 16px;
  }
`;

const Grid = styled.div<{ $compact: boolean }>`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${({ $compact }) => ($compact ? '280px' : '350px')}, 1fr));
  gap: ${({ theme, $compact }) => ($compact ? theme.spacing[3] : theme.spacing[4])};
`;

// Icons
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const WidgetGrid: React.FC<WidgetGridProps> = ({
  widgets,
  onLayoutChange,
  onRemoveWidget,
  onWidgetSettings,
  compact = false,
}) => {
  const [isEditable, setIsEditable] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleAddWidget = (type: 'stats' | 'chart' | 'list' | 'custom') => {
    const newWidget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Widget`,
      position: { x: 0, y: widgets.length },
      size: { width: 1, height: 1 },
    };
    onLayoutChange([...widgets, newWidget]);
  };

  const isEmpty = widgets.length === 0;

  return (
    <GridContainer
      data-testid="widget-grid"
      data-layout="grid"
      data-compact={compact ? 'true' : undefined}
      $compact={compact}
    >
      <GridHeader>
        <GridTitle>Dashboard Widgets</GridTitle>
        <HeaderActions>
          {!isEmpty && (
            <Button
              data-testid="add-widget-button"
              variant="primary"
              size="sm"
              onClick={() => setIsPickerOpen(true)}
              aria-label="Add widget"
            >
              <PlusIcon />
              Add Widget
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditable(!isEditable)}
            aria-label={isEditable ? 'Done editing' : 'Edit'}
          >
            <EditIcon />
            {isEditable ? 'Done' : 'Edit'}
          </Button>
        </HeaderActions>
      </GridHeader>

      {isEmpty ? (
        <EmptyState
          icon={LayoutGrid}
          title="No widgets yet"
          description="Customize your dashboard by selecting widgets"
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPickerOpen(true)}
              aria-label="Add widget"
            >
              <PlusIcon />
              Add Widget
            </Button>
          }
          size="lg"
        />
      ) : (
        <Grid $compact={compact}>
          {widgets.map((config) => (
            <Widget
              key={config.id}
              config={config}
              onRemove={() => onRemoveWidget(config.id)}
              onSettings={() => onWidgetSettings(config.id)}
              isEditable={isEditable}
            >
              <div>Widget content placeholder</div>
            </Widget>
          ))}
        </Grid>
      )}

      <WidgetPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleAddWidget}
      />
    </GridContainer>
  );
};

export type { WidgetConfig };
export default WidgetGrid;
