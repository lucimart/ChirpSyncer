import type { Meta, StoryObj } from '@storybook/react';
import styled from 'styled-components';
import { Typography, SectionTitle, PageTitle, Text, SmallText, Caption } from './Typography';

const meta: Meta<typeof Typography> = {
  title: 'UI/Typography',
  component: Typography,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'body', 'body-sm', 'caption', 'label'],
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary', 'success', 'danger', 'warning'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Typography>;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const Default: Story = {
  args: {
    children: 'The quick brown fox jumps over the lazy dog',
    variant: 'body',
    color: 'primary',
  },
};

export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Typography variant="h1">Heading 1 - Page titles</Typography>
      <Typography variant="h2">Heading 2 - Section titles</Typography>
      <Typography variant="h3">Heading 3 - Subsection titles</Typography>
      <Typography variant="h4">Heading 4 - Card titles</Typography>
      <Typography variant="body">Body - Regular paragraph text</Typography>
      <Typography variant="body-sm">Body Small - Secondary text and descriptions</Typography>
      <Typography variant="caption">Caption - Timestamps, metadata</Typography>
      <Typography variant="label">Label - Form labels, buttons</Typography>
    </Stack>
  ),
};

export const AllColors: Story = {
  render: () => (
    <Stack>
      <Typography color="primary">Primary - Main text color</Typography>
      <Typography color="secondary">Secondary - Supporting text</Typography>
      <Typography color="tertiary">Tertiary - Muted text</Typography>
      <Typography color="success">Success - Positive feedback</Typography>
      <Typography color="danger">Danger - Error messages</Typography>
      <Typography color="warning">Warning - Caution notices</Typography>
    </Stack>
  ),
};

export const ConvenienceComponents: Story = {
  render: () => (
    <Stack>
      <PageTitle>PageTitle Component</PageTitle>
      <SectionTitle>SectionTitle Component</SectionTitle>
      <Text>Text Component - Regular body text</Text>
      <SmallText>SmallText Component - Secondary descriptions</SmallText>
      <Caption>Caption Component - Metadata and timestamps</Caption>
    </Stack>
  ),
};

export const CustomElement: Story = {
  render: () => (
    <Stack>
      <Typography variant="h2" as="span">
        H2 styled as span element
      </Typography>
      <Typography variant="body" as="div">
        Body styled as div element
      </Typography>
      <Typography variant="label" as="label">
        Label styled as label element
      </Typography>
    </Stack>
  ),
};

export const PageExample: Story = {
  render: () => (
    <Stack>
      <PageTitle>Dashboard Settings</PageTitle>
      <SmallText>Configure your account and preferences</SmallText>
      <div style={{ marginTop: 24 }}>
        <SectionTitle>Account Information</SectionTitle>
        <Text>Update your personal details and email preferences.</Text>
      </div>
      <div style={{ marginTop: 24 }}>
        <SectionTitle>Notifications</SectionTitle>
        <Text>Choose how you want to be notified about activity.</Text>
        <Caption>Last updated: January 22, 2026</Caption>
      </div>
    </Stack>
  ),
};
