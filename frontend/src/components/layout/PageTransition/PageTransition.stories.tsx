import type { Meta, StoryObj } from '@storybook/react';
import styled from 'styled-components';
import { PageTransition } from './PageTransition';

const DemoContent = styled.div`
  padding: 24px;
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const DemoCard = styled.div`
  padding: 16px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 8px;
  margin-bottom: 16px;
`;

const DemoTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin-bottom: 16px;
`;

const meta: Meta<typeof PageTransition> = {
  title: 'Layout/PageTransition',
  component: PageTransition,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof PageTransition>;

export const Default: Story = {
  args: {
    children: (
      <DemoContent>
        <DemoTitle>Page Content</DemoTitle>
        <p>This content will animate when the page transitions.</p>
      </DemoContent>
    ),
  },
};

export const WithCards: Story = {
  args: {
    children: (
      <DemoContent>
        <DemoTitle>Dashboard</DemoTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <DemoCard>
            <h3>Card 1</h3>
            <p>Content for card 1</p>
          </DemoCard>
          <DemoCard>
            <h3>Card 2</h3>
            <p>Content for card 2</p>
          </DemoCard>
          <DemoCard>
            <h3>Card 3</h3>
            <p>Content for card 3</p>
          </DemoCard>
          <DemoCard>
            <h3>Card 4</h3>
            <p>Content for card 4</p>
          </DemoCard>
        </div>
      </DemoContent>
    ),
  },
};

export const WithForm: Story = {
  args: {
    children: (
      <DemoContent>
        <DemoTitle>Settings</DemoTitle>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px' }}>Username</label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px' }}>Email</label>
            <input
              type="email"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
            />
          </div>
          <button
            type="button"
            style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Save Changes
          </button>
        </form>
      </DemoContent>
    ),
  },
};

export const WithTable: Story = {
  args: {
    children: (
      <DemoContent>
        <DemoTitle>Data Table</DemoTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>Item {i}</td>
                <td style={{ padding: '12px' }}>Active</td>
                <td style={{ padding: '12px' }}>2024-01-{10 + i}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DemoContent>
    ),
  },
};

export const AnimationDemo: Story = {
  render: () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginBottom: '16px' }}>Animation Configuration</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ padding: '12px', background: '#f3f4f6', borderRadius: '6px' }}>
          <strong>Initial:</strong> opacity: 0, y: 12px
        </div>
        <div style={{ padding: '12px', background: '#f3f4f6', borderRadius: '6px' }}>
          <strong>Animate (in):</strong> opacity: 1, y: 0
        </div>
        <div style={{ padding: '12px', background: '#f3f4f6', borderRadius: '6px' }}>
          <strong>Exit (out):</strong> opacity: 0, y: -12px
        </div>
        <div style={{ padding: '12px', background: '#f3f4f6', borderRadius: '6px' }}>
          <strong>Transition:</strong> tween, easeInOut, 0.2s duration
        </div>
      </div>
      <div style={{ marginTop: '24px' }}>
        <PageTransition>
          <DemoContent>
            <p>This content demonstrates the page transition animation.</p>
          </DemoContent>
        </PageTransition>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'The PageTransition uses Framer Motion with a subtle fade and slide animation.',
      },
    },
  },
};
