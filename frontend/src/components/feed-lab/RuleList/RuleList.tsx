'use client';

import React, { memo, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { GripVertical, Pencil, Trash2, Zap, TrendingDown, Filter } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Switch } from '../../ui/Switch';
import { formatConditionCount, getRuleTypeLabel } from '../shared';
import type { Rule, RuleType } from '../shared';

export type { Rule };

interface RuleListProps {
  rules: Rule[];
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder?: (rules: Rule[]) => void;
}

const RulesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const RuleCard = styled.div<{ $enabled: boolean; $isDragging?: boolean }>`
  background: ${({ theme, $enabled }) =>
    $enabled ? theme.colors.background.primary : theme.colors.background.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  transition: all ${({ theme }) => theme.transitions.fast};
  opacity: ${({ $isDragging }) => ($isDragging ? 0.5 : 1)};
  cursor: ${({ $isDragging }) => ($isDragging ? 'grabbing' : 'default')};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }
`;

const RuleHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: grab;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.tertiary};
  }

  &:active {
    cursor: grabbing;
  }
`;

const RuleInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const RuleTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`;

const RuleName = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const RuleMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const WeightBadge = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const RuleActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const LeftSection = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  flex: 1;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[12]};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyTitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EmptyText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

// Helper function for rule type icons
const getRuleTypeIcon = (type: RuleType) => {
  switch (type) {
    case 'boost':
      return <Zap size={12} />;
    case 'demote':
      return <TrendingDown size={12} />;
    case 'filter':
      return <Filter size={12} />;
  }
};

// Sortable Rule Item Component
interface SortableRuleItemProps {
  rule: Rule;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isDraggable: boolean;
}

const SortableRuleItemComponent: React.FC<SortableRuleItemProps> = ({
  rule,
  onToggle,
  onEdit,
  onDelete,
  isDraggable,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [transform, transition]
  );

  // Memoized callbacks
  const handleToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onToggle(rule.id, e.target.checked);
    },
    [onToggle, rule.id]
  );

  const handleEdit = useCallback(() => {
    onEdit(rule.id);
  }, [onEdit, rule.id]);

  const handleDelete = useCallback(() => {
    onDelete(rule.id);
  }, [onDelete, rule.id]);

  return (
    <div ref={setNodeRef} style={style}>
      <RuleCard
        $enabled={rule.enabled}
        $isDragging={isDragging}
        data-testid={`rule-item-${rule.id}`}
      >
        <RuleHeader>
          <LeftSection>
            {isDraggable && (
              <DragHandle {...attributes} {...listeners} aria-label="Drag to reorder">
                <GripVertical size={18} />
              </DragHandle>
            )}
            <RuleInfo>
              <RuleTitleRow>
                <RuleName>{rule.name}</RuleName>
                <Badge
                  variant={
                    rule.type === 'boost'
                      ? 'success'
                      : rule.type === 'demote'
                        ? 'warning'
                        : 'danger'
                  }
                  size="sm"
                  data-testid={`rule-type-badge-${rule.id}`}
                >
                  {getRuleTypeIcon(rule.type)}
                  {getRuleTypeLabel(rule.type)}
                </Badge>
              </RuleTitleRow>

              <RuleMeta>
                <span>{formatConditionCount(rule.conditions.length)}</span>
                {rule.type !== 'filter' && (
                  <WeightBadge>Weight: {rule.weight}</WeightBadge>
                )}
              </RuleMeta>
            </RuleInfo>
          </LeftSection>

          <RuleActions>
            <Switch
              checked={rule.enabled}
              onChange={handleToggle}
              aria-label="Toggle rule"
              size="md"
            />

            <Button
              variant="soft"
              size="sm"
              onClick={handleEdit}
              aria-label="Edit"
            >
              <Pencil size={14} />
              Edit
            </Button>

            <Button
              variant="danger-soft"
              size="sm"
              onClick={handleDelete}
              aria-label="Delete"
            >
              <Trash2 size={14} />
              Delete
            </Button>
          </RuleActions>
        </RuleHeader>
      </RuleCard>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
const SortableRuleItem = memo(SortableRuleItemComponent);

export const RuleList: React.FC<RuleListProps> = ({
  rules,
  onToggle,
  onEdit,
  onDelete,
  onReorder,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id && onReorder) {
        const oldIndex = rules.findIndex((rule) => rule.id === active.id);
        const newIndex = rules.findIndex((rule) => rule.id === over.id);
        const reordered = arrayMove(rules, oldIndex, newIndex);
        onReorder(reordered);
      }
    },
    [rules, onReorder]
  );

  const ruleIds = useMemo(() => rules.map((r) => r.id), [rules]);
  const isDraggable = !!onReorder && rules.length > 1;

  if (rules.length === 0) {
    return (
      <EmptyState>
        <EmptyTitle>No rules created yet</EmptyTitle>
        <EmptyText>Create your first rule to customize your feed</EmptyText>
      </EmptyState>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ruleIds} strategy={verticalListSortingStrategy}>
        <RulesContainer>
          {rules.map((rule) => (
            <SortableRuleItem
              key={rule.id}
              rule={rule}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              isDraggable={isDraggable}
            />
          ))}
        </RulesContainer>
      </SortableContext>
    </DndContext>
  );
};
