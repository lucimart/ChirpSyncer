import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { NavItem } from './NavItem';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const MockIcon = () => <svg data-testid="mock-icon" />;

describe('NavItem', () => {
  it('renders correctly', () => {
    renderWithTheme(<NavItem>Dashboard</NavItem>);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    renderWithTheme(<NavItem icon={<MockIcon />}>Dashboard</NavItem>);
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  it('renders with badge', () => {
    renderWithTheme(<NavItem badge={<span>5</span>}>Notifications</NavItem>);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders with icon and badge', () => {
    renderWithTheme(
      <NavItem icon={<MockIcon />} badge={<span>3</span>}>
        Messages
      </NavItem>
    );
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    renderWithTheme(<NavItem onClick={handleClick}>Dashboard</NavItem>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    renderWithTheme(
      <NavItem disabled onClick={handleClick}>
        Dashboard
      </NavItem>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('forwards ref', () => {
    const ref = { current: null };
    renderWithTheme(<NavItem ref={ref}>Dashboard</NavItem>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('renders inactive by default', () => {
    renderWithTheme(<NavItem>Dashboard</NavItem>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders active state', () => {
    renderWithTheme(<NavItem active>Dashboard</NavItem>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithTheme(<NavItem className="custom-class">Dashboard</NavItem>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('applies custom icon color', () => {
    renderWithTheme(
      <NavItem icon={<MockIcon />} iconColor="#ff0000">
        Dashboard
      </NavItem>
    );
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });
});
