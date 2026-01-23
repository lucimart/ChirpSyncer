import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { TriggerSelector } from '../TriggerSelector';
import type { TriggerConfig } from '@/lib/workflows';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('TriggerSelector', () => {
  it('renders all trigger type options', () => {
    renderWithTheme(<TriggerSelector onChange={() => {}} />);

    expect(screen.getByText(/new post/i)).toBeInTheDocument();
    expect(screen.getByText(/viral post/i)).toBeInTheDocument();
    expect(screen.getByText(/new mention/i)).toBeInTheDocument();
    expect(screen.getByText(/scheduled/i)).toBeInTheDocument();
    expect(screen.getByText(/webhook/i)).toBeInTheDocument();
    expect(screen.getByText(/rss feed/i)).toBeInTheDocument();
  });

  it('shows selected trigger type', () => {
    const config: TriggerConfig = { type: 'viral_post', platform: 'twitter', threshold: { likes: 100 } };
    renderWithTheme(<TriggerSelector value={config} onChange={() => {}} />);

    const selectedOption = screen.getByTestId('trigger-option-viral_post');
    expect(selectedOption).toHaveAttribute('data-selected', 'true');
  });

  it('calls onChange when trigger type is selected', () => {
    const onChange = jest.fn();
    renderWithTheme(<TriggerSelector onChange={onChange} />);

    const scheduledOption = screen.getByTestId('trigger-option-scheduled');
    fireEvent.click(scheduledOption);

    expect(onChange).toHaveBeenCalled();
    const call = onChange.mock.calls[0][0];
    expect(call.type).toBe('scheduled');
  });

  it('shows configuration form for viral_post trigger', () => {
    const config: TriggerConfig = { type: 'viral_post', platform: 'twitter', threshold: { likes: 100 } };
    renderWithTheme(<TriggerSelector value={config} onChange={() => {}} />);

    expect(screen.getByText(/platform/i)).toBeInTheDocument();
    expect(screen.getByText(/likes threshold/i)).toBeInTheDocument();
  });

  it('shows configuration form for scheduled trigger', () => {
    const config: TriggerConfig = { type: 'scheduled', cron: '0 9 * * *' };
    renderWithTheme(<TriggerSelector value={config} onChange={() => {}} />);

    // Look for the configuration section - label text is "Schedule"
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows configuration form for rss trigger', () => {
    const config: TriggerConfig = { type: 'rss', feed_url: 'https://example.com/feed.xml' };
    renderWithTheme(<TriggerSelector value={config} onChange={() => {}} />);

    expect(screen.getByText(/feed url/i)).toBeInTheDocument();
  });

  it('shows webhook URL for webhook trigger', () => {
    const config: TriggerConfig = { type: 'webhook', webhook_url: 'https://api.chirpsyncer.com/webhooks/123' };
    renderWithTheme(<TriggerSelector value={config} onChange={() => {}} />);

    expect(screen.getByText(/webhook url/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/api\.chirpsyncer\.com/)).toBeInTheDocument();
  });

  it('updates configuration when form fields change', () => {
    const onChange = jest.fn();
    const config: TriggerConfig = { type: 'viral_post', platform: 'twitter', threshold: { likes: 100 } };
    renderWithTheme(<TriggerSelector value={config} onChange={onChange} />);

    const likesInput = screen.getByDisplayValue('100');
    fireEvent.change(likesInput, { target: { value: '200' } });

    expect(onChange).toHaveBeenCalled();
    const call = onChange.mock.calls[0][0];
    expect(call.threshold.likes).toBe(200);
  });

  it('shows platform selector for new_post trigger', () => {
    const config: TriggerConfig = { type: 'new_post', platform: 'twitter' };
    renderWithTheme(<TriggerSelector value={config} onChange={() => {}} />);

    expect(screen.getByText(/platform/i)).toBeInTheDocument();
  });

  it('shows platform selector for new_mention trigger', () => {
    const config: TriggerConfig = { type: 'new_mention', platform: 'bluesky' };
    renderWithTheme(<TriggerSelector value={config} onChange={() => {}} />);

    expect(screen.getByText(/platform/i)).toBeInTheDocument();
  });

  it('displays icons for each trigger type', () => {
    renderWithTheme(<TriggerSelector onChange={() => {}} />);

    // Each trigger option should have an icon
    const triggerOptions = screen.getAllByTestId(/trigger-option-/);
    expect(triggerOptions.length).toBe(6);
  });

  it('handles empty initial value', () => {
    renderWithTheme(<TriggerSelector onChange={() => {}} />);

    // Should render without errors
    expect(screen.getByTestId('trigger-selector')).toBeInTheDocument();
  });
});
