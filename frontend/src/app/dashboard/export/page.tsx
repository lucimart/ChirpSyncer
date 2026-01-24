'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import styled from 'styled-components';
import {
  Download,
  FileJson,
  FileText,
  Table,
  CheckCircle,
  Loader,
  Archive,
} from 'lucide-react';
import {
  Button,
  Card,
  Progress,
  PageHeader,
  SectionTitle,
  Label,
  Stack,
  Grid,
  SelectableCard,
  IconBadge,
  Typography,
  SmallText,
  Select,
  Checkbox,
} from '@/components/ui';
import { api } from '@/lib/api';

const CheckIcon = styled.span<{ $visible: boolean }>`
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  color: ${({ theme }) => theme.colors.success[600]};
  transition: opacity ${({ theme }) => theme.transitions.fast};
`;

const StatusIcon = styled.span<{ $status: 'pending' | 'running' | 'complete' }>`
  color: ${({ $status, theme }) =>
    $status === 'complete'
      ? theme.colors.success[600]
      : $status === 'running'
        ? theme.colors.primary[600]
        : theme.colors.text.tertiary};
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
      setExportState({ status: 'running', progress: 0, total: 100 });

      const response = await api.exportData({
        format,
        date_range: dateRange,
        platform,
        include_media: includeMedia,
        include_metrics: includeMetrics,
        include_deleted: includeDeleted,
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const filename = `chirpsyncer-export-${new Date().toISOString().split('T')[0]}.${format}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportState({
        status: 'complete',
        progress: 100,
        total: 100,
        filename,
      });

      return { filename };
    },
  });

  const estimatedSize =
    format === 'json' ? '~15 MB' : format === 'csv' ? '~8 MB' : '~5 MB';

  return (
    <div>
      <PageHeader
        title="Export Data"
        description="Download your data in various formats for backup or analysis"
      />

      <SectionTitle>Export Format</SectionTitle>
      <Grid minWidth="300px" gap={4} style={{ marginBottom: '24px' }}>
        {EXPORT_FORMATS.map((fmt) => (
          <SelectableCard
            key={fmt.id}
            selected={format === fmt.id}
            onClick={() => setFormat(fmt.id)}
            padding="md"
          >
            <Stack direction="row" justify="between" align="start" style={{ marginBottom: '12px' }}>
              <IconBadge size="lg" color={fmt.color}>
                <fmt.icon size={24} />
              </IconBadge>
              <CheckIcon $visible={format === fmt.id}>
                <CheckCircle size={20} />
              </CheckIcon>
            </Stack>
            <div style={{ marginBottom: '4px' }}>
              <Typography variant="h3">{fmt.name}</Typography>
            </div>
            <SmallText>{fmt.description}</SmallText>
          </SelectableCard>
        ))}
      </Grid>

      <SectionTitle>Export Options</SectionTitle>
      <Card padding="lg" style={{ marginBottom: '24px' }}>
        <Grid minWidth="200px" gap={4}>
          <div>
            <Label spacing="md">Date Range</Label>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'year', label: 'Last Year' },
                { value: '6months', label: 'Last 6 Months' },
                { value: '3months', label: 'Last 3 Months' },
                { value: 'month', label: 'Last Month' },
                { value: 'week', label: 'Last Week' },
              ]}
              fullWidth
            />
          </div>

          <div>
            <Label spacing="md">Platform</Label>
            <Select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              options={[
                { value: 'all', label: 'All Platforms' },
                { value: 'twitter', label: 'Twitter Only' },
                { value: 'bluesky', label: 'Bluesky Only' },
              ]}
              fullWidth
            />
          </div>

          <div>
            <Label spacing="md">Include</Label>
            <Stack gap={2}>
              <Checkbox
                label="Media URLs"
                checked={includeMedia}
                onChange={(e) => setIncludeMedia(e.target.checked)}
              />
              <Checkbox
                label="Engagement Metrics"
                checked={includeMetrics}
                onChange={(e) => setIncludeMetrics(e.target.checked)}
              />
              <Checkbox
                label="Deleted Posts History"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
              />
            </Stack>
          </div>
        </Grid>

        <div style={{ marginTop: '8px' }}>
          <SmallText>Estimated export size: {estimatedSize} • ~1,250 posts</SmallText>
        </div>
      </Card>

      <Stack direction="row" justify="end" gap={3}>
        <Button
          onClick={() => exportMutation.mutate()}
          disabled={exportState.status === 'running'}
          isLoading={exportState.status === 'running'}
        >
          <Archive size={18} />
          Start Export
        </Button>
      </Stack>

      {exportState.status !== 'idle' && (
        <Card padding="lg" style={{ marginTop: '24px' }}>
          <Stack direction="row" gap={3} align="center" style={{ marginBottom: '16px' }}>
            <StatusIcon $status={exportState.status}>
              {exportState.status === 'complete' ? (
                <CheckCircle size={24} />
              ) : (
                <Loader size={24} className="animate-spin" />
              )}
            </StatusIcon>
            <Typography variant="h3">
              {exportState.status === 'complete'
                ? 'Export Complete'
                : 'Exporting...'}
            </Typography>
          </Stack>

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
        </Card>
      )}
    </div>
  );
}
