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
import {
  Button,
  Card,
  Modal,
  Input,
  Select,
  Badge,
  PageHeader,
  StatCard,
  StatsGrid,
  EmptyState,
} from '@/components/ui';
import { api } from '@/lib/api';

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

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

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
      <PageHeader
        title="Cleanup Rules"
        description="Automatically delete old or low-engagement posts"
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            Create Rule
          </Button>
        }
      />

      <StatsGrid>
        <StatCard
          value={totalDeleted.toLocaleString()}
          label="Total Deleted"
          variant="centered"
        />
        <StatCard
          value={rules?.length ?? 0}
          label="Active Rules"
          variant="centered"
        />
        <StatCard
          value={rules?.filter((r) => r.is_enabled).length ?? 0}
          label="Enabled"
          variant="centered"
        />
      </StatsGrid>

      {isLoading ? (
        <Card padding="lg">
          <EmptyState title="Loading rules..." />
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
                  <Badge variant={rule.is_enabled ? 'success-soft' : 'neutral'} size="sm">
                    {rule.is_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
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
          <EmptyState
            icon={Trash2}
            title="No cleanup rules yet"
            description="Create your first rule to start cleaning."
          />
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

          <Select
            label="Rule Type"
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value)}
            options={[
              { value: 'age', label: 'Age Based' },
              { value: 'engagement', label: 'Engagement Based' },
              { value: 'pattern', label: 'Pattern Match' },
            ]}
            fullWidth
          />

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
