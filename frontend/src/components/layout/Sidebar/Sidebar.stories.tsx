import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import styled from 'styled-components';
import { Sidebar } from './Sidebar';

// Create a container to show the sidebar in different states
const SidebarContainer = styled.div<{ $width?: string }>`
  width: ${({ $width }) => $width || '256px'};
  height: 600px;
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
`;

const meta: Meta<typeof Sidebar> = {
  title: 'Layout/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'centered',
  },
  args: {
    isOpen: true,
    onClose: fn(),
  },
  argTypes: {
    isOpen: {
      control: { type: 'boolean' },
      description: 'Controls mobile drawer visibility',
    },
  },
  decorators: [
    (Story) => (
      <SidebarContainer>
        <Story />
      </SidebarContainer>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Sidebar>;

export const Default: Story = {
  args: {
    isOpen: false,
  },
};

export const Open: Story = {
  args: {
    isOpen: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'When open on mobile, the sidebar slides in from the left with a close button.',
      },
    },
  },
};

export const WithoutCloseHandler: Story = {
  args: {
    isOpen: true,
    onClose: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: 'Without an onClose handler, the close button is not rendered.',
      },
    },
  },
};

// Static preview component for complex stories
const SidebarPreview = ({ showAdmin = false }: { showAdmin?: boolean }) => (
  <aside
    style={{
      width: '256px',
      height: '100%',
      background: '#fff',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {/* Logo */}
    <div
      style={{
        padding: '20px 16px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#2563eb' }}>ChirpSyncer</span>
    </div>

    {/* Navigation */}
    <nav style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
      {/* Dashboard */}
      <a
        href="#"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          background: '#eff6ff',
          borderRadius: '6px',
          color: '#2563eb',
          textDecoration: 'none',
          marginBottom: '16px',
        }}
      >
        <span>Dashboard</span>
      </a>

      {/* Platforms Group */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: '500', padding: '8px 12px', color: '#374151' }}>
          Platforms
        </div>
        <div style={{ paddingLeft: '12px' }}>
          <a href="#" style={{ display: 'block', padding: '8px 12px', color: '#6b7280', textDecoration: 'none' }}>
            Connectors
          </a>
          <a href="#" style={{ display: 'block', padding: '8px 12px', color: '#6b7280', textDecoration: 'none' }}>
            Credentials
          </a>
        </div>
      </div>

      {/* Content Group */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: '500', padding: '8px 12px', color: '#374151' }}>
          Content
        </div>
        <div style={{ paddingLeft: '12px' }}>
          <a href="#" style={{ display: 'block', padding: '8px 12px', color: '#6b7280', textDecoration: 'none' }}>
            Sync
          </a>
          <a href="#" style={{ display: 'block', padding: '8px 12px', color: '#6b7280', textDecoration: 'none' }}>
            Scheduler
          </a>
        </div>
      </div>

      {/* Settings */}
      <a
        href="#"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          color: '#6b7280',
          textDecoration: 'none',
        }}
      >
        Settings
      </a>

      {/* Admin Section */}
      {showAdmin && (
        <div style={{ marginTop: '16px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              color: '#9ca3af',
              padding: '0 12px',
              marginBottom: '8px',
            }}
          >
            Admin
          </div>
          <a href="#" style={{ display: 'block', padding: '8px 12px', color: '#6b7280', textDecoration: 'none' }}>
            User Management
          </a>
        </div>
      )}
    </nav>

    {/* User Section */}
    <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          T
        </div>
        <span style={{ fontSize: '14px', fontWeight: '500' }}>testuser</span>
      </div>
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          padding: '8px 12px',
          border: 'none',
          borderRadius: '6px',
          background: 'transparent',
          fontSize: '14px',
          color: '#6b7280',
          cursor: 'pointer',
        }}
      >
        Sign Out
      </button>
    </div>
  </aside>
);

export const NavigationStructure: Story = {
  render: () => (
    <SidebarContainer>
      <SidebarPreview />
    </SidebarContainer>
  ),
  parameters: {
    docs: {
      description: {
        story: 'The sidebar contains navigation groups organized by functionality: Platforms, Content, Insights, and Organize.',
      },
    },
  },
};

export const WithAdminSection: Story = {
  render: () => (
    <SidebarContainer>
      <SidebarPreview showAdmin />
    </SidebarContainer>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Admin users see an additional Admin section with user management.',
      },
    },
  },
};

export const CollapsedState: Story = {
  render: () => (
    <SidebarContainer $width="64px">
      <aside
        style={{
          width: '64px',
          height: '100%',
          background: '#fff',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 0',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: '#2563eb',
            marginBottom: '24px',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: i === 1 ? '#eff6ff' : '#f3f4f6',
              }}
            />
          ))}
        </div>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#e5e7eb',
          }}
        />
      </aside>
    </SidebarContainer>
  ),
  parameters: {
    docs: {
      description: {
        story: 'On tablet devices, the sidebar collapses to show only icons. It expands on hover.',
      },
    },
  },
};

export const ResponsiveBehavior: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      <div>
        <p style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Desktop (Full)</p>
        <SidebarContainer $width="256px">
          <SidebarPreview />
        </SidebarContainer>
      </div>
      <div>
        <p style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Tablet (Collapsed)</p>
        <SidebarContainer $width="64px">
          <aside
            style={{
              width: '64px',
              height: '100%',
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px 0',
            }}
          >
            <div style={{ width: '24px', height: '24px', background: '#2563eb', borderRadius: '4px', marginBottom: '24px' }} />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ width: '24px', height: '24px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '8px' }} />
            ))}
          </aside>
        </SidebarContainer>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'The sidebar adapts to different screen sizes: full width on desktop, collapsed on tablet, and drawer on mobile.',
      },
    },
  },
};
