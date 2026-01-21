'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import {
  Plus,
  Trash2,
  Play,
  Pause,
  Calendar,
  MessageSquare,
  ThumbsUp,
  Eye,
} from 'lucide-react';
import { Button, Card, Modal, Input } from '@/components/ui';
import { api } from '@/lib/api';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const PageDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const StatCard = styled(Card)`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.danger[600]};
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const RulesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const RuleCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const RuleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const RuleInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const RuleIcon = styled.div<{ $type: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $type, theme }) =>
    $type === 'age'
      ? theme.colors.warning[100]
      : $type === 'engagement'
        ? theme.colors.success[100]
        : theme.colors.primary[100]};
  color: ${({ $type, theme }) =>
    $type === 'age'
      ? theme.colors.warning[600]
      : $type === 'engagement'
        ? theme.colors.success[600]
        : theme.colors.primary[600]};
`;

const RuleDetails = styled.div``;

const RuleName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const RuleType = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: capitalize;
`;

const RuleActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const RuleStats = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const RuleStat = styled.div``;

const RuleStatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const RuleStatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const StatusBadge = styled.span<{ $enabled: boolean }>`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  background-color: ${({ $enabled, theme }) =>
    $enabled ? theme.colors.success[100] : theme.colors.neutral[200]};
  color: ${({ $enabled, theme }) =>
    $enabled ? theme.colors.success[700] : theme.colors.neutral[600]};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const Select = styled.select`
  width: 100%;
  height: 40px;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.fontSizes.base};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const FieldGroup = styled.div``;

interface CleanupRule {
  id: number;
  name: string;
  rule_type: 'age' | 'engagement' | 'pattern';
  is_enabled: boolean;
  total_deleted: number;
  last_run: string | null;
  config: Record<string, unknown>;
}

export default function CleanupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('age');
  const [ageDays, setAgeDays] = useState('90');
  const [minLikes, setMinLikes] = useState('5');

  const { data: rules, isLoading } = useQuery<CleanupRule[]>({
    queryKey: ['cleanup-rules'],
    queryFn: async () => {
      const response = await api.getCleanupRules();
      if (response.success && response.data) {
        return response.data as CleanupRule[];
      }
      return [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const config =
        ruleType === 'age'
          ? { max_age_days: parseInt(ageDays, 10) }
          : ruleType === 'engagement'
            ? { min_likes: parseInt(minLikes, 10) }
            : {};
      return api.createCleanupRule({
        name: ruleName,
        type: ruleType,
        config,
        enabled: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanup-rules'] });
      setIsModalOpen(false);
      setRuleName('');
      setRuleType('age');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId: number) => api.deleteCleanupRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanup-rules'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (payload: { ruleId: number; enabled: boolean }) =>
      api.updateCleanupRule(payload.ruleId, { enabled: payload.enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanup-rules'] });
    },
  });

  const totalDeleted = rules?.reduce((sum, r) => sum + r.total_deleted, 0) ?? 0;

  const getRuleIcon = (type: string) => {
    switch (type) {
      case 'age':
        return <Calendar size={20} />;
      case 'engagement':
        return <ThumbsUp size={20} />;
      default:
        return <MessageSquare size={20} />;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div>
      <PageHeader>
        <div>
          <PageTitle>Cleanup Rules</PageTitle>
          <PageDescription>
            Automatically delete old or low-engagement posts
          </PageDescription>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Create Rule
        </Button>
      </PageHeader>

      <StatsRow>
        <StatCard padding="md">
          <StatValue>{totalDeleted.toLocaleString()}</StatValue>
          <StatLabel>Total Deleted</StatLabel>
        </StatCard>
        <StatCard padding="md">
          <StatValue>{rules?.length ?? 0}</StatValue>
          <StatLabel>Active Rules</StatLabel>
        </StatCard>
        <StatCard padding="md">
          <StatValue>{rules?.filter((r) => r.is_enabled).length ?? 0}</StatValue>
          <StatLabel>Enabled</StatLabel>
        </StatCard>
      </StatsRow>

      {isLoading ? (
        <Card padding="lg">
          <EmptyState>Loading rules...</EmptyState>
        </Card>
      ) : rules && rules.length > 0 ? (
        <RulesList>
          {rules.map((rule) => (
            <RuleCard key={rule.id} padding="md">
              <RuleHeader>
                <RuleInfo>
                  <RuleIcon $type={rule.rule_type}>
                    {getRuleIcon(rule.rule_type)}
                  </RuleIcon>
                  <RuleDetails>
                    <RuleName>{rule.name}</RuleName>
                    <RuleType>{rule.rule_type} based</RuleType>
                  </RuleDetails>
                </RuleInfo>
                <RuleActions>
                  <StatusBadge $enabled={rule.is_enabled}>
                    {rule.is_enabled ? 'Enabled' : 'Disabled'}
                  </StatusBadge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/dashboard/cleanup/${rule.id}`)}
                  >
                    <Eye size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toggleMutation.mutate({
                        ruleId: rule.id,
                        enabled: !rule.is_enabled,
                      })
                    }
                  >
                    {rule.is_enabled ? <Pause size={16} /> : <Play size={16} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(rule.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </RuleActions>
              </RuleHeader>
              <RuleStats>
                <RuleStat>
                  <RuleStatValue>{rule.total_deleted}</RuleStatValue>
                  <RuleStatLabel>Deleted</RuleStatLabel>
                </RuleStat>
                <RuleStat>
                  <RuleStatValue>{formatDate(rule.last_run)}</RuleStatValue>
                  <RuleStatLabel>Last Run</RuleStatLabel>
                </RuleStat>
              </RuleStats>
            </RuleCard>
          ))}
        </RulesList>
      ) : (
        <Card padding="lg">
          <EmptyState>
            No cleanup rules yet. Create your first rule to start cleaning.
          </EmptyState>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Cleanup Rule"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Create Rule</Button>
          </>
        }
      >
        <Form onSubmit={handleSubmit}>
          <Input
            label="Rule Name"
            type="text"
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            placeholder="e.g., Delete old tweets"
            required
            fullWidth
          />

          <FieldGroup>
            <Label>Rule Type</Label>
            <Select value={ruleType} onChange={(e) => setRuleType(e.target.value)}>
              <option value="age">Age Based</option>
              <option value="engagement">Engagement Based</option>
              <option value="pattern">Pattern Match</option>
            </Select>
          </FieldGroup>

          {ruleType === 'age' && (
            <Input
              label="Delete tweets older than (days)"
              type="number"
              value={ageDays}
              onChange={(e) => setAgeDays(e.target.value)}
              min="1"
              fullWidth
            />
          )}

          {ruleType === 'engagement' && (
            <Input
              label="Minimum likes to keep"
              type="number"
              value={minLikes}
              onChange={(e) => setMinLikes(e.target.value)}
              min="0"
              fullWidth
            />
          )}
        </Form>
      </Modal>
    </div>
  );
}
