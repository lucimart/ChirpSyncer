import type { Meta, StoryObj } from '@storybook/react';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import styled from 'styled-components';
import { DetailsList } from './DetailsList';
import { Badge } from '../Badge';

const meta: Meta<typeof DetailsList> = {
  title: 'UI/DetailsList',
  component: DetailsList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DetailsList>;

const Container = styled.div`
  max-width: 400px;
`;

export const Default: Story = {
  render: () => (
    <Container>
      <DetailsList
        items={[
          { label: 'Status', value: 'Active' },
          { label: 'Last Updated', value: 'Jan 20, 2026' },
          { label: 'Total Items', value: '1,234' },
        ]}
      />
    </Container>
  ),
};

export const Compact: Story = {
  render: () => (
    <Container>
      <DetailsList
        variant="compact"
        items={[
          { label: 'Status', value: 'Active' },
          { label: 'Last Updated', value: 'Jan 20, 2026' },
          { label: 'Total Items', value: '1,234' },
        ]}
      />
    </Container>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Container>
      <DetailsList
        items={[
          {
            label: 'Last Sync',
            value: (
              <>
                <Clock size={14} />
                Jan 20, 2026 14:30
              </>
            ),
          },
          {
            label: 'Sync Status',
            value: (
              <>
                <CheckCircle size={14} style={{ color: '#22c55e' }} />
                Enabled
              </>
            ),
          },
        ]}
      />
    </Container>
  ),
};

export const WithBadges: Story = {
  render: () => (
    <Container>
      <DetailsList
        items={[
          {
            label: 'Plan',
            value: <Badge variant="success" size="sm">Pro</Badge>,
          },
          {
            label: 'Status',
            value: <Badge variant="warning" size="sm">Pending</Badge>,
          },
          {
            label: 'Renewal',
            value: 'Feb 15, 2026',
          },
        ]}
      />
    </Container>
  ),
};

export const ConnectionDetails: Story = {
  render: () => (
    <Container>
      <DetailsList
        items={[
          {
            label: 'Last Sync',
            value: (
              <>
                <Clock size={14} />
                Jan 20, 2026 at 2:30 PM
              </>
            ),
          },
          { label: 'Sync Status', value: 'Enabled' },
          { label: 'Posts Synced', value: '1,234' },
          { label: 'Error Rate', value: '0.5%' },
        ]}
      />
    </Container>
  ),
};

export const AccountInfo: Story = {
  render: () => (
    <Container>
      <DetailsList
        items={[
          { label: 'Username', value: '@johndoe' },
          { label: 'Email', value: 'john@example.com' },
          { label: 'Member Since', value: 'December 2025' },
          { label: 'Role', value: 'Administrator' },
        ]}
      />
    </Container>
  ),
};

export const APIDetails: Story = {
  render: () => (
    <Container>
      <DetailsList
        variant="compact"
        items={[
          { label: 'Rate Limit', value: '1000/hour' },
          { label: 'Used', value: '342 requests' },
          { label: 'Remaining', value: '658 requests' },
          { label: 'Resets', value: '45 minutes' },
        ]}
      />
    </Container>
  ),
};
