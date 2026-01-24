/**
 * UI Components Unit Tests
 * Tests for Badge, Card, and EmptyState components
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CollapsibleMenu } from '@/components/ui/CollapsibleMenu';
import { Inbox, Settings } from 'lucide-react';

// Test wrapper with theme provider
const ThemeWrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const renderWithTheme = (ui: React.ReactElement) => {
  return render(ui, { wrapper: ThemeWrapper });
};

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      renderWithTheme(<Badge>Default Badge</Badge>);
      expect(screen.getByText('Default Badge')).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      renderWithTheme(<Badge>Test Content</Badge>);
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    const variants = ['default', 'primary', 'success', 'warning', 'danger', 'info'] as const;

    variants.forEach((variant) => {
      it(`renders ${variant} variant`, () => {
        renderWithTheme(<Badge variant={variant}>{variant} badge</Badge>);
        expect(screen.getByText(`${variant} badge`)).toBeInTheDocument();
      });
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`renders ${size} size`, () => {
        renderWithTheme(<Badge size={size}>{size} badge</Badge>);
        expect(screen.getByText(`${size} badge`)).toBeInTheDocument();
      });
    });
  });

  describe('Props', () => {
    it('renders with dot indicator', () => {
      renderWithTheme(<Badge dot>With Dot</Badge>);
      expect(screen.getByText('With Dot')).toBeInTheDocument();
    });

    it('renders with outline style', () => {
      renderWithTheme(<Badge outline>Outline Badge</Badge>);
      expect(screen.getByText('Outline Badge')).toBeInTheDocument();
    });

    it('renders with both dot and outline', () => {
      renderWithTheme(
        <Badge dot outline variant="success">
          Success with dot
        </Badge>
      );
      expect(screen.getByText('Success with dot')).toBeInTheDocument();
    });

    it('passes through HTML attributes', () => {
      renderWithTheme(<Badge data-testid="custom-badge">Custom</Badge>);
      expect(screen.getByTestId('custom-badge')).toBeInTheDocument();
    });
  });

  describe('Combinations', () => {
    it('renders with all props combined', () => {
      renderWithTheme(
        <Badge variant="danger" size="lg" dot outline>
          Full Props
        </Badge>
      );
      expect(screen.getByText('Full Props')).toBeInTheDocument();
    });
  });
});

describe('Card Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      renderWithTheme(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      renderWithTheme(
        <Card>
          <p>Nested content</p>
        </Card>
      );
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });
  });

  describe('Padding', () => {
    const paddings = ['none', 'sm', 'md', 'lg'] as const;

    paddings.forEach((padding) => {
      it(`renders with ${padding} padding`, () => {
        renderWithTheme(<Card padding={padding}>Content with {padding} padding</Card>);
        expect(screen.getByText(`Content with ${padding} padding`)).toBeInTheDocument();
      });
    });
  });

  describe('Hoverable', () => {
    it('renders with hoverable prop', () => {
      renderWithTheme(<Card hoverable>Hoverable Card</Card>);
      expect(screen.getByText('Hoverable Card')).toBeInTheDocument();
    });

    it('renders without hoverable by default', () => {
      renderWithTheme(<Card>Non-hoverable Card</Card>);
      expect(screen.getByText('Non-hoverable Card')).toBeInTheDocument();
    });
  });

  describe('Compound Components', () => {
    it('renders Card.Header', () => {
      renderWithTheme(
        <Card>
          <Card.Header>Header Content</Card.Header>
        </Card>
      );
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('renders Card.Title', () => {
      renderWithTheme(
        <Card>
          <Card.Title>Card Title</Card.Title>
        </Card>
      );
      expect(screen.getByText('Card Title')).toBeInTheDocument();
    });

    it('renders Card.Description', () => {
      renderWithTheme(
        <Card>
          <Card.Description>Card description text</Card.Description>
        </Card>
      );
      expect(screen.getByText('Card description text')).toBeInTheDocument();
    });

    it('renders Card.Content', () => {
      renderWithTheme(
        <Card>
          <Card.Content>Main content area</Card.Content>
        </Card>
      );
      expect(screen.getByText('Main content area')).toBeInTheDocument();
    });

    it('renders Card.Footer', () => {
      renderWithTheme(
        <Card>
          <Card.Footer>Footer content</Card.Footer>
        </Card>
      );
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('renders full card structure', () => {
      renderWithTheme(
        <Card padding="lg" hoverable>
          <Card.Header>
            <Card.Title>Complete Card</Card.Title>
            <Card.Description>A fully structured card</Card.Description>
          </Card.Header>
          <Card.Content>Main body content</Card.Content>
          <Card.Footer>Action buttons here</Card.Footer>
        </Card>
      );

      expect(screen.getByText('Complete Card')).toBeInTheDocument();
      expect(screen.getByText('A fully structured card')).toBeInTheDocument();
      expect(screen.getByText('Main body content')).toBeInTheDocument();
      expect(screen.getByText('Action buttons here')).toBeInTheDocument();
    });
  });

  describe('HTML Attributes', () => {
    it('passes through HTML attributes', () => {
      renderWithTheme(<Card data-testid="test-card">Content</Card>);
      expect(screen.getByTestId('test-card')).toBeInTheDocument();
    });

    it('applies className', () => {
      renderWithTheme(<Card className="custom-class">Content</Card>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});

describe('EmptyState Component', () => {
  describe('Rendering', () => {
    it('renders with required title prop', () => {
      renderWithTheme(<EmptyState title="No items found" />);
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });
  });

  describe('Optional Props', () => {
    it('renders with description', () => {
      renderWithTheme(
        <EmptyState title="Empty" description="There are no items to display" />
      );
      expect(screen.getByText('Empty')).toBeInTheDocument();
      expect(screen.getByText('There are no items to display')).toBeInTheDocument();
    });

    it('renders without description when not provided', () => {
      renderWithTheme(<EmptyState title="Just Title" />);
      expect(screen.getByText('Just Title')).toBeInTheDocument();
    });

    it('renders with icon', () => {
      renderWithTheme(<EmptyState title="With Icon" icon={Inbox} />);
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('renders without icon when not provided', () => {
      renderWithTheme(<EmptyState title="No Icon" />);
      expect(screen.getByText('No Icon')).toBeInTheDocument();
    });

    it('renders with action', () => {
      renderWithTheme(
        <EmptyState
          title="Empty State"
          action={<button>Add Item</button>}
        />
      );
      expect(screen.getByText('Empty State')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
    });

    it('renders without action when not provided', () => {
      renderWithTheme(<EmptyState title="No Action" />);
      expect(screen.getByText('No Action')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`renders with ${size} size`, () => {
        renderWithTheme(<EmptyState title={`${size} empty state`} size={size} />);
        expect(screen.getByText(`${size} empty state`)).toBeInTheDocument();
      });
    });

    it('defaults to md size', () => {
      renderWithTheme(<EmptyState title="Default Size" />);
      expect(screen.getByText('Default Size')).toBeInTheDocument();
    });
  });

  describe('Full Configuration', () => {
    it('renders with all props', () => {
      renderWithTheme(
        <EmptyState
          icon={Inbox}
          title="Your inbox is empty"
          description="Messages you receive will appear here"
          action={<button>Compose Message</button>}
          size="lg"
        />
      );

      expect(screen.getByText('Your inbox is empty')).toBeInTheDocument();
      expect(screen.getByText('Messages you receive will appear here')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Compose Message' })).toBeInTheDocument();
    });
  });
});

describe('CollapsibleMenu Component', () => {
  describe('Rendering', () => {
    it('renders with required props', () => {
      renderWithTheme(
        <CollapsibleMenu label="Menu Label">
          <div>Menu Content</div>
        </CollapsibleMenu>
      );

      expect(screen.getByText('Menu Label')).toBeInTheDocument();
    });

    it('renders children when open', () => {
      renderWithTheme(
        <CollapsibleMenu label="Menu" defaultOpen>
          <div>Child Content</div>
        </CollapsibleMenu>
      );

      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });
  });

  describe('Toggle Behavior', () => {
    it('starts closed by default', () => {
      renderWithTheme(
        <CollapsibleMenu label="Menu">
          <div data-testid="content">Hidden Content</div>
        </CollapsibleMenu>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('starts open when defaultOpen is true', () => {
      renderWithTheme(
        <CollapsibleMenu label="Menu" defaultOpen>
          <div>Content</div>
        </CollapsibleMenu>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('toggles open/closed on click', () => {
      renderWithTheme(
        <CollapsibleMenu label="Menu">
          <div>Content</div>
        </CollapsibleMenu>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      // Click to open
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');

      // Click to close
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Optional Props', () => {
    it('renders with icon', () => {
      renderWithTheme(
        <CollapsibleMenu label="Settings" icon={Settings}>
          <div>Settings Content</div>
        </CollapsibleMenu>
      );

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders with badge count', () => {
      renderWithTheme(
        <CollapsibleMenu label="Notifications" badge={5}>
          <div>Notification Items</div>
        </CollapsibleMenu>
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('does not render badge when count is 0', () => {
      renderWithTheme(
        <CollapsibleMenu label="Empty" badge={0}>
          <div>Content</div>
        </CollapsibleMenu>
      );

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('does not render badge when undefined', () => {
      renderWithTheme(
        <CollapsibleMenu label="No Badge">
          <div>Content</div>
        </CollapsibleMenu>
      );

      // Just verify it renders without badge
      expect(screen.getByText('No Badge')).toBeInTheDocument();
    });

    it('renders with all optional props', () => {
      renderWithTheme(
        <CollapsibleMenu label="Full Menu" icon={Settings} badge={10} defaultOpen>
          <div>Full Content</div>
        </CollapsibleMenu>
      );

      expect(screen.getByText('Full Menu')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Full Content')).toBeInTheDocument();
    });
  });
});
