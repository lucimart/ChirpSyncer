import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { PlatformNode } from './PlatformNode';
import type { Platform } from '../types';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockTwitterPlatform: Platform = {
  id: 'twitter-1',
  name: 'twitter',
  connected: true,
  lastSync: new Date().toISOString(),
  postsCount: 150,
};

const mockBlueskyPlatform: Platform = {
  id: 'bluesky-1',
  name: 'bluesky',
  connected: true,
  lastSync: new Date().toISOString(),
  postsCount: 75,
};

const disconnectedPlatform: Platform = {
  id: 'twitter-2',
  name: 'twitter',
  connected: false,
};

describe('PlatformNode', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the platform node', () => {
    renderWithTheme(
      <PlatformNode
        platform={mockTwitterPlatform}
        onClick={mockOnClick}
        isHovered={false}
        isSelected={false}
      />
    );
    expect(screen.getByTestId('platform-node-twitter-1')).toBeInTheDocument();
  });

  it('displays the platform name', () => {
    renderWithTheme(
      <PlatformNode
        platform={mockTwitterPlatform}
        onClick={mockOnClick}
        isHovered={false}
        isSelected={false}
      />
    );
    expect(screen.getByText('twitter')).toBeInTheDocument();
  });

  it('displays posts count when available', () => {
    renderWithTheme(
      <PlatformNode
        platform={mockTwitterPlatform}
        onClick={mockOnClick}
        isHovered={false}
        isSelected={false}
      />
    );
    expect(screen.getByText('150 posts')).toBeInTheDocument();
  });

  it('displays last sync time when available', () => {
    renderWithTheme(
      <PlatformNode
        platform={mockTwitterPlatform}
        onClick={mockOnClick}
        isHovered={false}
        isSelected={false}
      />
    );
    expect(screen.getByTestId('last-sync-time')).toBeInTheDocument();
  });

  it('hides last sync time when not available', () => {
    const platformWithoutSync: Platform = {
      id: 'platform-1',
      name: 'twitter',
      connected: true,
    };
    renderWithTheme(
      <PlatformNode
        platform={platformWithoutSync}
        onClick={mockOnClick}
        isHovered={false}
        isSelected={false}
      />
    );
    expect(screen.queryByTestId('last-sync-time')).not.toBeInTheDocument();
  });

  it('renders platform icon', () => {
    renderWithTheme(
      <PlatformNode
        platform={mockTwitterPlatform}
        onClick={mockOnClick}
        isHovered={false}
        isSelected={false}
      />
    );
    expect(screen.getByTestId('platform-icon')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <PlatformNode
        platform={mockTwitterPlatform}
        onClick={mockOnClick}
        isHovered={false}
        isSelected={false}
      />
    );

    await user.click(screen.getByTestId('platform-node-twitter-1'));
    expect(mockOnClick).toHaveBeenCalledWith(mockTwitterPlatform);
  });

  it('applies hovered state', () => {
    renderWithTheme(
      <PlatformNode
        platform={mockTwitterPlatform}
        onClick={mockOnClick}
        isHovered={true}
        isSelected={false}
      />
    );
    expect(screen.getByTestId('platform-node-twitter-1')).toHaveAttribute('data-hovered', 'true');
  });

  it('applies selected state', () => {
    renderWithTheme(
      <PlatformNode
        platform={mockTwitterPlatform}
        onClick={mockOnClick}
        isHovered={false}
        isSelected={true}
      />
    );
    expect(screen.getByTestId('platform-node-twitter-1')).toHaveAttribute('data-selected', 'true');
  });

  it('indicates disconnected state', () => {
    renderWithTheme(
      <PlatformNode
        platform={disconnectedPlatform}
        onClick={mockOnClick}
        isHovered={false}
        isSelected={false}
      />
    );
    expect(screen.getByTestId('platform-node-twitter-2')).toHaveAttribute('data-connected', 'false');
  });

  it('renders bluesky platform correctly', () => {
    renderWithTheme(
      <PlatformNode
        platform={mockBlueskyPlatform}
        onClick={mockOnClick}
        isHovered={false}
        isSelected={false}
      />
    );
    expect(screen.getByText('bluesky')).toBeInTheDocument();
    expect(screen.getByText('75 posts')).toBeInTheDocument();
  });

  it('handles unknown platform gracefully', () => {
    const unknownPlatform: Platform = {
      id: 'unknown-1',
      name: 'mastodon',
      connected: true,
    };
    renderWithTheme(
      <PlatformNode
        platform={unknownPlatform}
        onClick={mockOnClick}
        isHovered={false}
        isSelected={false}
      />
    );
    expect(screen.getByText('mastodon')).toBeInTheDocument();
  });
});
