import type { Meta, StoryObj } from '@storybook/react';
import { SidebarLayout } from './SidebarLayout';

const meta: Meta<typeof SidebarLayout> = {
  title: 'UI/SidebarLayout',
  component: SidebarLayout,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    sidebarWidth: 320,
    gap: 6,
    sidebarPosition: 'right',
    stackBelow: 1024,
  },
  argTypes: {
    gap: {
      control: { type: 'select' },
      options: [4, 6, 8],
    },
    sidebarPosition: {
      control: { type: 'radio' },
      options: ['left', 'right'],
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SidebarLayout>;

const MainContent = () => (
  <div style={{ padding: '24px', background: '#f3f4f6', minHeight: '400px', borderRadius: '8px' }}>
    <h2 style={{ margin: '0 0 16px 0' }}>Main Content</h2>
    <p>
      This is the main content area. It takes up the remaining space after the sidebar width is
      allocated.
    </p>
    <p>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
      labore et dolore magna aliqua.
    </p>
  </div>
);

const SidebarContent = () => (
  <div style={{ padding: '24px', background: '#e5e7eb', borderRadius: '8px' }}>
    <h3 style={{ margin: '0 0 16px 0' }}>Sidebar</h3>
    <nav>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        <li style={{ padding: '8px 0', borderBottom: '1px solid #d1d5db' }}>Dashboard</li>
        <li style={{ padding: '8px 0', borderBottom: '1px solid #d1d5db' }}>Analytics</li>
        <li style={{ padding: '8px 0', borderBottom: '1px solid #d1d5db' }}>Settings</li>
        <li style={{ padding: '8px 0' }}>Help</li>
      </ul>
    </nav>
  </div>
);

export const Default: Story = {
  args: {
    children: <MainContent />,
    sidebar: <SidebarContent />,
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
};

export const SidebarLeft: Story = {
  args: {
    children: <MainContent />,
    sidebar: <SidebarContent />,
    sidebarPosition: 'left',
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
};

export const NarrowSidebar: Story = {
  args: {
    children: <MainContent />,
    sidebar: <SidebarContent />,
    sidebarWidth: 240,
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
};

export const WideSidebar: Story = {
  args: {
    children: <MainContent />,
    sidebar: <SidebarContent />,
    sidebarWidth: 400,
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
};

export const LargerGap: Story = {
  args: {
    children: <MainContent />,
    sidebar: <SidebarContent />,
    gap: 8,
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
};

export const DashboardExample: Story = {
  args: {
    sidebarPosition: 'left',
    sidebarWidth: 280,
    children: (
      <div style={{ padding: '24px' }}>
        <h1 style={{ margin: '0 0 24px 0' }}>Dashboard</h1>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ padding: '16px', background: '#dbeafe', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Total Posts</h4>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>1,234</p>
          </div>
          <div style={{ padding: '16px', background: '#dcfce7', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Synced</h4>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>987</p>
          </div>
          <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Pending</h4>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>247</p>
          </div>
        </div>
        <div style={{ background: '#f3f4f6', padding: '24px', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Recent Activity</h3>
          <p>Activity feed would go here...</p>
        </div>
      </div>
    ),
    sidebar: (
      <div style={{ padding: '16px' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '1.25rem' }}>ChirpSyncer</h2>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li
              style={{
                padding: '12px 16px',
                background: '#3b82f6',
                color: 'white',
                borderRadius: '6px',
                marginBottom: '4px',
              }}
            >
              Dashboard
            </li>
            <li style={{ padding: '12px 16px', marginBottom: '4px' }}>Analytics</li>
            <li style={{ padding: '12px 16px', marginBottom: '4px' }}>Scheduler</li>
            <li style={{ padding: '12px 16px', marginBottom: '4px' }}>Settings</li>
          </ul>
        </nav>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ background: '#fff', minHeight: '600px' }}>
        <Story />
      </div>
    ),
  ],
};
