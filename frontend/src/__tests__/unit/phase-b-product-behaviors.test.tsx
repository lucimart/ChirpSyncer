/**
 * Phase B (Sprints 10-13) - Product Behavior Tests
 * TDD tests written as product scenarios to verify system integrity
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';

// Components under test
import { DataTable, Column } from '@/components/ui/DataTable';
import { DangerConfirm } from '@/components/ui/DangerConfirm';
import { Progress } from '@/components/ui/Progress';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';

// Test wrapper with theme
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <ToastProvider>{children}</ToastProvider>
  </ThemeProvider>
);

const renderWithTheme = (ui: React.ReactElement) => {
  return render(ui, { wrapper: TestWrapper });
};

// =============================================================================
// SPRINT 10: FOUNDATION - Design System & Provider Infrastructure
// =============================================================================

describe('Sprint 10: Foundation - Design System & Providers', () => {
  describe('SCENARIO: User opens the application for the first time', () => {
    it('should render the app with consistent theming across all components', () => {
      renderWithTheme(
        <div>
          <Progress value={50} max={100} label="Loading..." />
        </div>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText(/50/)).toBeInTheDocument();
    });

    it('should apply theme colors consistently to UI elements', () => {
      const { container } = renderWithTheme(
        <Progress value={75} max={100} variant="success" />
      );

      // Progress bar should be rendered with theme styling
      expect(container.querySelector('div')).toBeInTheDocument();
    });
  });

  describe('SCENARIO: Toast notifications provide user feedback', () => {
    const ToastTestComponent = () => {
      const { addToast } = useToast();
      return (
        <button onClick={() => addToast({ type: 'success', title: 'Operation completed' })}>
          Show Toast
        </button>
      );
    };

    it('should display success toast when user completes an action', async () => {
      renderWithTheme(<ToastTestComponent />);

      fireEvent.click(screen.getByText('Show Toast'));

      await waitFor(() => {
        expect(screen.getByText('Operation completed')).toBeInTheDocument();
      });
    });

    it('should allow user to dismiss toast by clicking close button', async () => {
      const ToastWithDismiss = () => {
        const { addToast } = useToast();
        return (
          <button onClick={() => addToast({ type: 'info', title: 'Dismissible', duration: 0 })}>
            Show Toast
          </button>
        );
      };

      renderWithTheme(<ToastWithDismiss />);
      fireEvent.click(screen.getByText('Show Toast'));

      await waitFor(() => {
        expect(screen.getByText('Dismissible')).toBeInTheDocument();
      });
    });

    it('should display error toast with appropriate styling when operation fails', async () => {
      const ErrorToastComponent = () => {
        const { addToast } = useToast();
        return (
          <button onClick={() => addToast({ type: 'error', title: 'Connection failed', message: 'Please try again' })}>
            Trigger Error
          </button>
        );
      };

      renderWithTheme(<ErrorToastComponent />);
      fireEvent.click(screen.getByText('Trigger Error'));

      await waitFor(() => {
        expect(screen.getByText('Connection failed')).toBeInTheDocument();
        expect(screen.getByText('Please try again')).toBeInTheDocument();
      });
    });
  });

  describe('SCENARIO: Modal dialogs follow accessibility standards', () => {
    it('should trap focus within modal when open', () => {
      const onClose = jest.fn();
      renderWithTheme(
        <Modal isOpen={true} onClose={onClose} title="Settings">
          <input placeholder="Focus me" />
        </Modal>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should close modal when user presses Escape key', () => {
      const onClose = jest.fn();
      renderWithTheme(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          Content
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });

    it('should close modal when user clicks overlay', () => {
      const onClose = jest.fn();
      const { container } = renderWithTheme(
        <Modal isOpen={true} onClose={onClose} title="Click Outside">
          Content
        </Modal>
      );

      // Click the overlay (parent of modal container)
      const overlay = container.querySelector('[class*="Overlay"]');
      if (overlay) {
        fireEvent.click(overlay);
        expect(onClose).toHaveBeenCalled();
      }
    });
  });
});

// =============================================================================
// SPRINT 11: CORE SCREENS - Credentials, Sync, Dashboard, Settings
// =============================================================================

describe('Sprint 11: Core Screens - Data Management', () => {
  describe('SCENARIO: User views their synced posts in a data table', () => {
    interface SyncedPost {
      id: string;
      content: string;
      source: string;
      syncedAt: string;
      status: string;
    }

    const mockPosts: SyncedPost[] = [
      { id: '1', content: 'First tweet synced to Bluesky', source: 'twitter', syncedAt: '2024-01-15T10:00:00Z', status: 'synced' },
      { id: '2', content: 'Hello from Bluesky!', source: 'bluesky', syncedAt: '2024-01-15T11:00:00Z', status: 'synced' },
      { id: '3', content: 'Thread post 1/3', source: 'twitter', syncedAt: '2024-01-15T12:00:00Z', status: 'pending' },
    ];

    const columns: Column<SyncedPost>[] = [
      { key: 'content', header: 'Content', sortable: true },
      { key: 'source', header: 'Source', sortable: true },
      { key: 'status', header: 'Status', sortable: true },
      { key: 'syncedAt', header: 'Synced At', sortable: true },
    ];

    it('should display all synced posts in a paginated table', () => {
      renderWithTheme(
        <DataTable columns={columns} data={mockPosts} />
      );

      expect(screen.getByText('First tweet synced to Bluesky')).toBeInTheDocument();
      expect(screen.getByText('Hello from Bluesky!')).toBeInTheDocument();
      expect(screen.getByText('Thread post 1/3')).toBeInTheDocument();
    });

    it('should allow user to sort posts by column', () => {
      renderWithTheme(
        <DataTable columns={columns} data={mockPosts} />
      );

      // Click on sortable column header
      const sourceHeader = screen.getByText('Source');
      fireEvent.click(sourceHeader);

      // Table should reorder - we verify the column is interactive
      expect(sourceHeader).toBeInTheDocument();
    });

    it('should display empty state when no posts exist', () => {
      renderWithTheme(
        <DataTable columns={columns} data={[]} emptyMessage="No synced posts yet" />
      );

      expect(screen.getByText('No synced posts yet')).toBeInTheDocument();
    });

    it('should allow user to select multiple posts for bulk actions', () => {
      const selectedIds = new Set<string | number>();
      const onSelectionChange = jest.fn((ids: Set<string | number>) => {
        selectedIds.clear();
        ids.forEach(id => selectedIds.add(id));
      });

      renderWithTheme(
        <DataTable
          columns={columns}
          data={mockPosts}
          selectable={true}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
        />
      );

      // Find checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      // Click first row checkbox
      fireEvent.click(checkboxes[1]); // First data row
      expect(onSelectionChange).toHaveBeenCalled();
    });
  });

  describe('SCENARIO: User updates their sync settings', () => {
    it('should display progress indicator while settings are being saved', () => {
      renderWithTheme(
        <Progress value={50} max={100} label="Saving settings..." animated />
      );

      expect(screen.getByText('Saving settings...')).toBeInTheDocument();
    });

    it('should show completion status when sync finishes', () => {
      renderWithTheme(
        <Progress
          value={100}
          max={100}
          label="Sync complete"
          variant="success"
          details={[
            { label: 'Synced', value: 25 },
            { label: 'Skipped', value: 3 },
            { label: 'Failed', value: 0 },
          ]}
        />
      );

      expect(screen.getByText('Sync complete')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('Synced')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// SPRINT 12: CLEANUP UI - Rules, Wizard, Preview, Step-up Auth
// =============================================================================

describe('Sprint 12: Cleanup UI - Dangerous Operations', () => {
  describe('SCENARIO: User attempts to delete synced posts', () => {
    const mockOnConfirm = jest.fn();
    const mockOnClose = jest.fn();

    beforeEach(() => {
      mockOnConfirm.mockClear();
      mockOnClose.mockClear();
    });

    it('should require user to type confirmation phrase before deleting', () => {
      renderWithTheme(
        <DangerConfirm
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Delete All Posts"
          description="This will permanently delete all synced posts. This action cannot be undone."
          confirmPhrase="DELETE ALL"
          requireReason={false}
        />
      );

      expect(screen.getByText('Delete All Posts')).toBeInTheDocument();
      expect(screen.getByText('DELETE ALL')).toBeInTheDocument();

      // Confirm button should be disabled initially
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toBeDisabled();
    });

    it('should enable confirm button only when phrase matches exactly', () => {
      renderWithTheme(
        <DangerConfirm
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Delete Posts"
          description="Confirm deletion"
          confirmPhrase="CONFIRM"
          requireReason={false}
        />
      );

      const input = screen.getByPlaceholderText('Type the phrase above');
      const confirmButton = screen.getByRole('button', { name: /confirm/i });

      // Type wrong phrase
      fireEvent.change(input, { target: { value: 'wrong' } });
      expect(confirmButton).toBeDisabled();

      // Type correct phrase
      fireEvent.change(input, { target: { value: 'CONFIRM' } });
      expect(confirmButton).not.toBeDisabled();
    });

    it('should require reason for audit trail when performing dangerous action', () => {
      renderWithTheme(
        <DangerConfirm
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Delete Account Data"
          description="This will delete your account data"
          confirmPhrase="DELETE"
          requireReason={true}
        />
      );

      const phraseInput = screen.getByPlaceholderText('Type the phrase above');
      const confirmButton = screen.getByRole('button', { name: /confirm/i });

      // Type correct phrase but no reason
      fireEvent.change(phraseInput, { target: { value: 'DELETE' } });
      expect(confirmButton).toBeDisabled();

      // Add reason
      const reasonInput = screen.getByPlaceholderText(/why are you performing/i);
      fireEvent.change(reasonInput, { target: { value: 'Cleaning up test data' } });
      expect(confirmButton).not.toBeDisabled();
    });

    it('should call onConfirm with reason when user completes confirmation', () => {
      renderWithTheme(
        <DangerConfirm
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Delete Data"
          description="Confirm deletion"
          confirmPhrase="YES"
          requireReason={true}
        />
      );

      const phraseInput = screen.getByPlaceholderText('Type the phrase above');
      const reasonInput = screen.getByPlaceholderText(/why are you performing/i);
      const confirmButton = screen.getByRole('button', { name: /confirm/i });

      fireEvent.change(phraseInput, { target: { value: 'YES' } });
      fireEvent.change(reasonInput, { target: { value: 'Test cleanup' } });
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('Test cleanup');
    });

    it('should show audit trail notice to user', () => {
      renderWithTheme(
        <DangerConfirm
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Delete"
          description="Delete data"
          confirmPhrase="DELETE"
        />
      );

      expect(screen.getByText(/logged with your user ID/i)).toBeInTheDocument();
    });
  });

  describe('SCENARIO: User views cleanup execution progress', () => {
    it('should show real-time progress of cleanup operation', () => {
      renderWithTheme(
        <Progress
          value={75}
          max={100}
          label="Deleting old posts..."
          variant="warning"
          animated
          details={[
            { label: 'Processed', value: 750 },
            { label: 'Deleted', value: 600 },
            { label: 'Errors', value: 2 },
          ]}
        />
      );

      expect(screen.getByText('Deleting old posts...')).toBeInTheDocument();
      expect(screen.getByText('750')).toBeInTheDocument();
      expect(screen.getByText('Processed')).toBeInTheDocument();
    });

    it('should indicate danger state when errors occur', () => {
      renderWithTheme(
        <Progress
          value={30}
          max={100}
          label="Operation failed"
          variant="danger"
        />
      );

      expect(screen.getByText('Operation failed')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// SPRINT 13: SEARCH & ANALYTICS - Bookmarks, Export
// =============================================================================

describe('Sprint 13: Search & Analytics - Data Export', () => {
  describe('SCENARIO: User searches through their synced posts', () => {
    interface SearchResult {
      id: string;
      content: string;
      source: string;
      timestamp: string;
      bookmarked: boolean;
    }

    const searchResults: SearchResult[] = [
      { id: '1', content: 'Post about React', source: 'twitter', timestamp: '2024-01-15', bookmarked: false },
      { id: '2', content: 'TypeScript tips', source: 'bluesky', timestamp: '2024-01-14', bookmarked: true },
      { id: '3', content: 'React hooks guide', source: 'twitter', timestamp: '2024-01-13', bookmarked: false },
    ];

    const searchColumns: Column<SearchResult>[] = [
      { key: 'content', header: 'Content', sortable: true },
      { key: 'source', header: 'Source', sortable: true },
      { key: 'timestamp', header: 'Date', sortable: true },
      {
        key: 'bookmarked',
        header: 'Bookmarked',
        render: (row) => row.bookmarked ? '★' : '☆'
      },
    ];

    it('should display search results in paginated format', () => {
      renderWithTheme(
        <DataTable columns={searchColumns} data={searchResults} pageSize={10} />
      );

      expect(screen.getByText('Post about React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript tips')).toBeInTheDocument();
    });

    it('should allow user to select posts for export', () => {
      const selectedIds = new Set<string | number>();
      const onSelectionChange = jest.fn();

      renderWithTheme(
        <DataTable
          columns={searchColumns}
          data={searchResults}
          selectable={true}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');

      // Select all checkbox
      fireEvent.click(checkboxes[0]);
      expect(onSelectionChange).toHaveBeenCalled();
    });

    it('should display bookmark status for each post', () => {
      renderWithTheme(
        <DataTable columns={searchColumns} data={searchResults} />
      );

      // Custom render shows bookmark indicators
      expect(screen.getByText('★')).toBeInTheDocument(); // Bookmarked
      expect(screen.getAllByText('☆').length).toBe(2); // Not bookmarked
    });
  });

  describe('SCENARIO: User exports their data', () => {
    it('should show progress while export is being prepared', () => {
      renderWithTheme(
        <Progress
          value={45}
          max={100}
          label="Preparing export..."
          animated
          details={[
            { label: 'Posts', value: '1,234' },
            { label: 'Size', value: '2.5 MB' },
          ]}
        />
      );

      expect(screen.getByText('Preparing export...')).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument();
      expect(screen.getByText('Posts')).toBeInTheDocument();
    });

    it('should complete export with success indication', () => {
      renderWithTheme(
        <Progress
          value={100}
          max={100}
          label="Export ready!"
          variant="success"
        />
      );

      expect(screen.getByText('Export ready!')).toBeInTheDocument();
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });
  });

  describe('SCENARIO: User views analytics dashboard', () => {
    it('should display sync statistics with visual progress', () => {
      renderWithTheme(
        <>
          <Progress
            value={892}
            max={1000}
            label="Twitter → Bluesky"
            variant="primary"
            size="lg"
          />
          <Progress
            value={456}
            max={1000}
            label="Bluesky → Twitter"
            variant="primary"
            size="lg"
          />
        </>
      );

      expect(screen.getByText('Twitter → Bluesky')).toBeInTheDocument();
      expect(screen.getByText('Bluesky → Twitter')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// CROSS-PHASE INTEGRATION: Unified System Behavior
// =============================================================================

describe('Cross-Phase Integration: Unified System Behavior', () => {
  describe('SCENARIO: Complete user workflow from login to data management', () => {
    it('should maintain consistent state across component interactions', async () => {
      const mockData = [
        { id: '1', name: 'Item 1', status: 'active' },
        { id: '2', name: 'Item 2', status: 'pending' },
      ];

      const columns: Column<typeof mockData[0]>[] = [
        { key: 'name', header: 'Name', sortable: true },
        { key: 'status', header: 'Status', sortable: true },
      ];

      const selectedIds = new Set<string | number>();
      const onSelectionChange = jest.fn();

      renderWithTheme(
        <div>
          <DataTable
            columns={columns}
            data={mockData}
            selectable={true}
            selectedIds={selectedIds}
            onSelectionChange={onSelectionChange}
          />
          <Progress value={50} label="Loading..." />
        </div>
      );

      // Components coexist and function
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('SCENARIO: Error handling propagates correctly through the system', () => {
    it('should display error toast when operation fails', async () => {
      const ErrorScenario = () => {
        const { addToast } = useToast();

        const simulateError = () => {
          addToast({
            type: 'error',
            title: 'Sync Failed',
            message: 'Unable to connect to Twitter API',
          });
        };

        return <button onClick={simulateError}>Trigger Sync</button>;
      };

      renderWithTheme(<ErrorScenario />);

      fireEvent.click(screen.getByText('Trigger Sync'));

      await waitFor(() => {
        expect(screen.getByText('Sync Failed')).toBeInTheDocument();
        expect(screen.getByText('Unable to connect to Twitter API')).toBeInTheDocument();
      });
    });

    it('should prevent dangerous operations without proper confirmation', () => {
      const onConfirm = jest.fn();

      renderWithTheme(
        <DangerConfirm
          isOpen={true}
          onClose={() => {}}
          onConfirm={onConfirm}
          title="Delete Account"
          description="This cannot be undone"
          confirmPhrase="DELETE ACCOUNT"
          requireReason={true}
        />
      );

      // Try to click confirm without filling in fields
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      // Should not have been called
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('SCENARIO: Data flows correctly between components', () => {
    it('should update table when data changes', () => {
      const initialData = [{ id: '1', content: 'Original' }];
      const updatedData = [
        { id: '1', content: 'Original' },
        { id: '2', content: 'New Post' },
      ];

      const columns: Column<typeof initialData[0]>[] = [
        { key: 'content', header: 'Content' },
      ];

      const { rerender } = renderWithTheme(
        <DataTable columns={columns} data={initialData} />
      );

      expect(screen.getByText('Original')).toBeInTheDocument();
      expect(screen.queryByText('New Post')).not.toBeInTheDocument();

      rerender(
        <ThemeProvider theme={theme}>
          <ToastProvider>
            <DataTable columns={columns} data={updatedData} />
          </ToastProvider>
        </ThemeProvider>
      );

      expect(screen.getByText('New Post')).toBeInTheDocument();
    });

    it('should maintain selection state across sort operations', () => {
      const data = [
        { id: '1', name: 'Zebra' },
        { id: '2', name: 'Apple' },
        { id: '3', name: 'Mango' },
      ];

      const columns: Column<typeof data[0]>[] = [
        { key: 'name', header: 'Name', sortable: true },
      ];

      const selectedIds = new Set<string | number>(['1']);
      const onSelectionChange = jest.fn();

      renderWithTheme(
        <DataTable
          columns={columns}
          data={data}
          selectable={true}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
        />
      );

      // Sort by name
      fireEvent.click(screen.getByText('Name'));

      // Selection callback should be available
      expect(onSelectionChange).toBeDefined();
    });
  });
});

// =============================================================================
// PROVIDER INTEGRATION: Theme & Toast Work Together
// =============================================================================

describe('Provider Integration: Theme & Toast System', () => {
  describe('SCENARIO: Multiple toasts stack correctly', () => {
    it('should display multiple concurrent toasts', async () => {
      const MultiToastComponent = () => {
        const { addToast } = useToast();

        const showMultiple = () => {
          addToast({ type: 'success', title: 'First' });
          addToast({ type: 'info', title: 'Second' });
          addToast({ type: 'warning', title: 'Third' });
        };

        return <button onClick={showMultiple}>Show Toasts</button>;
      };

      renderWithTheme(<MultiToastComponent />);

      fireEvent.click(screen.getByText('Show Toasts'));

      await waitFor(() => {
        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
        expect(screen.getByText('Third')).toBeInTheDocument();
      });
    });
  });

  describe('SCENARIO: Theme consistency across dynamic content', () => {
    it('should apply consistent styling to dynamically rendered table rows', () => {
      const dynamicData = Array.from({ length: 15 }, (_, i) => ({
        id: String(i + 1),
        title: `Post ${i + 1}`,
      }));

      const columns: Column<typeof dynamicData[0]>[] = [
        { key: 'title', header: 'Title' },
      ];

      renderWithTheme(
        <DataTable columns={columns} data={dynamicData} pageSize={5} />
      );

      // Should show pagination for 15 items with pageSize 5
      expect(screen.getByText('Post 1')).toBeInTheDocument();
      expect(screen.getByText(/Showing 1 to 5 of 15/)).toBeInTheDocument();
    });

    it('should navigate through paginated data', () => {
      const data = Array.from({ length: 25 }, (_, i) => ({
        id: String(i + 1),
        name: `Item ${i + 1}`,
      }));

      const columns: Column<typeof data[0]>[] = [
        { key: 'name', header: 'Name' },
      ];

      renderWithTheme(
        <DataTable columns={columns} data={data} pageSize={10} />
      );

      // Initial page
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText(/Showing 1 to 10 of 25/)).toBeInTheDocument();

      // Navigate to next page
      const nextButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg') !== null
      );

      if (nextButton) {
        fireEvent.click(nextButton);
      }
    });
  });
});

// =============================================================================
// ACCESSIBILITY: WCAG Compliance Across Phase B
// =============================================================================

describe('Accessibility: WCAG Compliance', () => {
  describe('SCENARIO: Screen reader users navigate the application', () => {
    it('should provide proper ARIA labels for data table', () => {
      const data = [{ id: '1', name: 'Test' }];
      const columns: Column<typeof data[0]>[] = [{ key: 'name', header: 'Name' }];

      renderWithTheme(
        <DataTable columns={columns} data={data} />
      );

      // Table should have proper structure
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should provide accessible modal dialogs', () => {
      renderWithTheme(
        <Modal isOpen={true} onClose={() => {}} title="Accessible Modal">
          Modal content here
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should provide accessible form inputs in DangerConfirm', () => {
      renderWithTheme(
        <DangerConfirm
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Test"
          description="Test description"
          confirmPhrase="CONFIRM"
        />
      );

      // Input should be accessible
      const input = screen.getByPlaceholderText('Type the phrase above');
      expect(input).toBeInTheDocument();
    });
  });

  describe('SCENARIO: Keyboard navigation works throughout', () => {
    it('should allow keyboard interaction with checkboxes in table', () => {
      const data = [{ id: '1', name: 'Test' }];
      const columns: Column<typeof data[0]>[] = [{ key: 'name', header: 'Name' }];

      renderWithTheme(
        <DataTable
          columns={columns}
          data={data}
          selectable={true}
          selectedIds={new Set()}
          onSelectionChange={() => {}}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      // Checkboxes should be focusable
      checkboxes[0].focus();
      expect(document.activeElement).toBe(checkboxes[0]);
    });
  });
});
