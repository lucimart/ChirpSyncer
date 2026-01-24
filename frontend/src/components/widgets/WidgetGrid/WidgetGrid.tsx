'use client';

import { useState, useCallback, useMemo, type FC } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Plus, Pencil } from 'lucide-react';
import { Button, Stack, EmptyState } from '../../ui';
import { Widget } from '../Widget';
import { WidgetPicker } from '../WidgetPicker';
import { WidgetRenderer } from '../WidgetRenderer';
import type { WidgetConfig, WidgetType, ListItem } from '../types';

export interface WidgetGridProps {
  widgets: WidgetConfig[];
  onLayoutChange: (widgets: WidgetConfig[]) => void;
  onRemoveWidget: (id: string) => void;
  onWidgetSettings: (id: string) => void;
  onWidgetItemClick?: (widgetId: string, item: ListItem) => void;
  onWidgetViewAll?: (widgetId: string) => void;
  isLoading?: boolean;
  widgetErrors?: Record<string, string>;
  onRetry?: (widgetId: string) => void;
  compact?: boolean;
}

const PageTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Grid = styled(motion.div)<{ $compact: boolean }>`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${({ $compact }) => ($compact ? '280px' : '350px')}, 1fr));
  gap: ${({ theme, $compact }) => ($compact ? theme.spacing[3] : theme.spacing[4])};
`;

const WidgetWrapper = styled(motion.div)``;

const gridVariants = {
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const widgetVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

const ICON_SIZE = 16;

export const WidgetGrid: FC<WidgetGridProps> = ({
  widgets,
  onLayoutChange,
  onRemoveWidget,
  onWidgetSettings,
  onWidgetItemClick,
  onWidgetViewAll,
  isLoading = false,
  widgetErrors = {},
  onRetry,
  compact = false,
}) => {
  const [isEditable, setIsEditable] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const isEmpty = useMemo(() => widgets.length === 0, [widgets.length]);

  const handleAddWidget = useCallback(
    (type: WidgetType) => {
      const newWidget: WidgetConfig = {
        id: `widget-${Date.now()}`,
        type,
        title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Widget`,
        position: { x: 0, y: widgets.length },
        size: { width: 1, height: 1 },
      };
      onLayoutChange([...widgets, newWidget]);
    },
    [widgets, onLayoutChange]
  );

  const createItemClickHandler = useCallback(
    (widgetId: string) => (item: ListItem) => {
      onWidgetItemClick?.(widgetId, item);
    },
    [onWidgetItemClick]
  );

  const createViewAllHandler = useCallback(
    (widgetId: string) => () => {
      onWidgetViewAll?.(widgetId);
    },
    [onWidgetViewAll]
  );

  const createRetryHandler = useCallback(
    (widgetId: string) => () => {
      onRetry?.(widgetId);
    },
    [onRetry]
  );

  const openPicker = useCallback(() => setIsPickerOpen(true), []);
  const closePicker = useCallback(() => setIsPickerOpen(false), []);
  const toggleEditable = useCallback(() => setIsEditable((prev) => !prev), []);

  const addWidgetButton = useMemo(
    () => (
      <Button
        data-testid="add-widget-button"
        variant="primary"
        size="sm"
        onClick={openPicker}
        aria-label="Add widget"
      >
        <Plus size={ICON_SIZE} />
        Add Widget
      </Button>
    ),
    [openPicker]
  );

  return (
    <Stack
      gap={4}
      data-testid="widget-grid"
      data-layout="grid"
      data-compact={compact ? 'true' : undefined}
    >
      <Stack
        direction="row"
        align="center"
        justify="between"
        style={{ padding: '8px 0' }}
      >
        <PageTitle>Dashboard Widgets</PageTitle>
        <Stack direction="row" align="center" gap={2}>
          {!isEmpty && addWidgetButton}
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleEditable}
            aria-label={isEditable ? 'Done editing' : 'Edit'}
          >
            <Pencil size={ICON_SIZE} />
            {isEditable ? 'Done' : 'Edit'}
          </Button>
        </Stack>
      </Stack>

      {isEmpty ? (
        <EmptyState
          icon={LayoutGrid}
          title="No widgets yet"
          description="Customize your dashboard by selecting widgets"
          action={addWidgetButton}
          size="lg"
          data-testid="widget-grid-empty"
        />
      ) : (
        <Grid
          $compact={compact}
          variants={gridVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {widgets.map((config) => (
              <WidgetWrapper
                key={config.id}
                variants={widgetVariants}
                exit="exit"
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <Widget
                  config={config}
                  onRemove={() => onRemoveWidget(config.id)}
                  onSettings={() => onWidgetSettings(config.id)}
                  isEditable={isEditable}
                  isLoading={isLoading}
                  error={widgetErrors[config.id]}
                  onRetry={onRetry ? createRetryHandler(config.id) : undefined}
                >
                  <WidgetRenderer
                    config={config}
                    onItemClick={createItemClickHandler(config.id)}
                    onViewAll={createViewAllHandler(config.id)}
                  />
                </Widget>
              </WidgetWrapper>
            ))}
          </AnimatePresence>
        </Grid>
      )}

      <WidgetPicker
        isOpen={isPickerOpen}
        onClose={closePicker}
        onSelect={handleAddWidget}
      />
    </Stack>
  );
};

export default WidgetGrid;
