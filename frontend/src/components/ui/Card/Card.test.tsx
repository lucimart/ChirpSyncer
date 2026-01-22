import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { Card } from './Card';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Card', () => {
  it('renders children', () => {
    renderWithTheme(
      <Card>
        <div>Card content</div>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('supports header and footer sections', () => {
    renderWithTheme(
      <Card>
        <Card.Header>
          <Card.Title>Title</Card.Title>
          <Card.Description>Description</Card.Description>
        </Card.Header>
        <Card.Content>
          <div>Body</div>
        </Card.Content>
        <Card.Footer>
          <div>Footer</div>
        </Card.Footer>
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
