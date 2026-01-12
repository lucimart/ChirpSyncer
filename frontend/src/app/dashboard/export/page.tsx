'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import styled from 'styled-components';
import {
  Download,
  FileJson,
  FileText,
  Table,
  Calendar,
  Filter,
  CheckCircle,
  Loader,
  Archive,
} from 'lucide-react';
import { Button, Card, Input, Progress } from '@/components/ui';

const PageHeader = styled.div`
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

const ExportGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const ExportCard = styled(Card)<{ $selected: boolean }>`
  cursor: pointer;
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.primary[500] : 'transparent'};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ $selected, theme }) =>
      $selected ? theme.colors.primary[500] : theme.colors.border.default};
  }
`;

const ExportCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const ExportIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background-color: ${({ $color }) => `${$color}15`};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CheckIcon = styled.div<{ $visible: boolean }>`
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  color: ${({ theme }) => theme.colors.success[600]};
`;

const ExportTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const ExportDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const OptionsCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`;

const OptionGroup = styled.div``;

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const Select = styled.select`
  width: 100%;
  height: 40px;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.fontSizes.base};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.background.primary};
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
`;

const ExportButton = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ExportStatus = styled(Card)`
  margin-top: ${({ theme }) => theme.spacing[6]};
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const StatusIcon = styled.div<{ $status: 'pending' | 'running' | 'complete' }>`
  color: ${({ $status, theme }) =>
    $status === 'complete'
      ? theme.colors.success[600]
      : $status === 'running'
        ? theme.colors.primary[600]
        : theme.colors.text.tertiary};
`;

const StatusTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const DownloadLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.primary[600]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-decoration: none;
  margin-top: ${({ theme }) => theme.spacing[4]};

  &:hover {
    text-decoration: underline;
  }
`;

const EstimateInfo = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

type ExportFormat = 'json' | 'csv' | 'txt';

interface ExportState {
  status: 'idle' | 'running' | 'complete';
  progress: number;
  total: number;
  filename?: string;
}

const EXPORT_FORMATS = [
  {
    id: 'json' as const,
    name: 'JSON',
    description: 'Machine-readable format, includes all metadata',
    icon: FileJson,
    color: '#f59e0b',
  },
  {
    id: 'csv' as const,
    name: 'CSV',
    description: 'Spreadsheet compatible, easy to analyze',
    icon: Table,
    color: '#22c55e',
  },
  {
    id: 'txt' as const,
    name: 'Plain Text',
    description: 'Simple text file, human readable',
    icon: FileText,
    color: '#3b82f6',
  },
];

export default function ExportPage() {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [dateRange, setDateRange] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [includeMedia, setIncludeMedia] = useState(true);
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [exportState, setExportState] = useState<ExportState>({
    status: 'idle',
    progress: 0,
    total: 0,
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      // Simulate export process
      const total = 1250;
      setExportState({ status: 'running', progress: 0, total });

      for (let i = 0; i <= total; i += 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setExportState((prev) => ({ ...prev, progress: i }));
      }

      const filename = `chirpsyncer-export-${new Date().toISOString().split('T')[0]}.${format}`;
      setExportState({
        status: 'complete',
        progress: total,
        total,
        filename,
      });

      return { filename };
    },
  });

  const estimatedSize =
    format === 'json' ? '~15 MB' : format === 'csv' ? '~8 MB' : '~5 MB';

  return (
    <div>
      <PageHeader>
        <PageTitle>Export Data</PageTitle>
        <PageDescription>
          Download your data in various formats for backup or analysis
        </PageDescription>
      </PageHeader>

      <SectionTitle>Export Format</SectionTitle>
      <ExportGrid>
        {EXPORT_FORMATS.map((fmt) => (
          <ExportCard
            key={fmt.id}
            $selected={format === fmt.id}
            onClick={() => setFormat(fmt.id)}
            padding="md"
          >
            <ExportCardHeader>
              <ExportIcon $color={fmt.color}>
                <fmt.icon size={24} />
              </ExportIcon>
              <CheckIcon $visible={format === fmt.id}>
                <CheckCircle size={20} />
              </CheckIcon>
            </ExportCardHeader>
            <ExportTitle>{fmt.name}</ExportTitle>
            <ExportDescription>{fmt.description}</ExportDescription>
          </ExportCard>
        ))}
      </ExportGrid>

      <SectionTitle>Export Options</SectionTitle>
      <OptionsCard padding="lg">
        <OptionsGrid>
          <OptionGroup>
            <Label>Date Range</Label>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="year">Last Year</option>
              <option value="6months">Last 6 Months</option>
              <option value="3months">Last 3 Months</option>
              <option value="month">Last Month</option>
              <option value="week">Last Week</option>
            </Select>
          </OptionGroup>

          <OptionGroup>
            <Label>Platform</Label>
            <Select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="all">All Platforms</option>
              <option value="twitter">Twitter Only</option>
              <option value="bluesky">Bluesky Only</option>
            </Select>
          </OptionGroup>

          <OptionGroup>
            <Label>Include</Label>
            <CheckboxGroup>
              <CheckboxLabel>
                <Checkbox
                  type="checkbox"
                  checked={includeMedia}
                  onChange={(e) => setIncludeMedia(e.target.checked)}
                />
                Media URLs
              </CheckboxLabel>
              <CheckboxLabel>
                <Checkbox
                  type="checkbox"
                  checked={includeMetrics}
                  onChange={(e) => setIncludeMetrics(e.target.checked)}
                />
                Engagement Metrics
              </CheckboxLabel>
              <CheckboxLabel>
                <Checkbox
                  type="checkbox"
                  checked={includeDeleted}
                  onChange={(e) => setIncludeDeleted(e.target.checked)}
                />
                Deleted Posts History
              </CheckboxLabel>
            </CheckboxGroup>
          </OptionGroup>
        </OptionsGrid>

        <EstimateInfo>
          Estimated export size: {estimatedSize} • ~1,250 posts
        </EstimateInfo>
      </OptionsCard>

      <ExportButton>
        <Button
          onClick={() => exportMutation.mutate()}
          disabled={exportState.status === 'running'}
          isLoading={exportState.status === 'running'}
        >
          <Archive size={18} />
          Start Export
        </Button>
      </ExportButton>

      {exportState.status !== 'idle' && (
        <ExportStatus padding="lg">
          <StatusHeader>
            <StatusIcon $status={exportState.status}>
              {exportState.status === 'complete' ? (
                <CheckCircle size={24} />
              ) : (
                <Loader size={24} className="animate-spin" />
              )}
            </StatusIcon>
            <StatusTitle>
              {exportState.status === 'complete'
                ? 'Export Complete'
                : 'Exporting...'}
            </StatusTitle>
          </StatusHeader>

          <Progress
            value={exportState.progress}
            max={exportState.total}
            label="Progress"
            variant={exportState.status === 'complete' ? 'success' : 'primary'}
            animated={exportState.status === 'running'}
          />

          {exportState.status === 'complete' && exportState.filename && (
            <DownloadLink href="#" download={exportState.filename}>
              <Download size={16} />
              Download {exportState.filename}
            </DownloadLink>
          )}
        </ExportStatus>
      )}
    </div>
  );
}
