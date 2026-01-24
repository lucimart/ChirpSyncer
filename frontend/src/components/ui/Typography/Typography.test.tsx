import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { Typography, SectionTitle, PageTitle, Text, SmallText, Caption } from './Typography';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('Typography', () => {
  it('renders children', () => {
    renderWithTheme(<Typography>Hello World</Typography>);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('uses default p tag for body variant', () => {
    renderWithTheme(<Typography variant="body">Body text</Typography>);
    const element = screen.getByText('Body text');
    expect(element.tagName).toBe('P');
  });

  it('uses h1 tag for h1 variant', () => {
    renderWithTheme(<Typography variant="h1">Heading</Typography>);
    const element = screen.getByText('Heading');
    expect(element.tagName).toBe('H1');
  });

  it('uses h2 tag for h2 variant', () => {
    renderWithTheme(<Typography variant="h2">Subheading</Typography>);
    const element = screen.getByText('Subheading');
    expect(element.tagName).toBe('H2');
  });

  it('allows custom element via as prop', () => {
    renderWithTheme(
      <Typography variant="h2" as="div">
        Custom element
      </Typography>
    );
    const element = screen.getByText('Custom element');
    expect(element.tagName).toBe('DIV');
  });

  it('applies className', () => {
    renderWithTheme(<Typography className="custom-class">Styled</Typography>);
    const element = screen.getByText('Styled');
    expect(element).toHaveClass('custom-class');
  });

  it('has test id', () => {
    renderWithTheme(<Typography>Test</Typography>);
    expect(screen.getByTestId('typography')).toBeInTheDocument();
  });
});

describe('SectionTitle', () => {
  it('renders as h2', () => {
    renderWithTheme(<SectionTitle>Section</SectionTitle>);
    const element = screen.getByText('Section');
    expect(element.tagName).toBe('H2');
  });

  it('has margin bottom', () => {
    renderWithTheme(<SectionTitle>Section</SectionTitle>);
    const element = screen.getByText('Section');
    expect(element).toHaveStyle({ marginBottom: theme.spacing[4] });
  });
});

describe('PageTitle', () => {
  it('renders as h1', () => {
    renderWithTheme(<PageTitle>Page</PageTitle>);
    const element = screen.getByText('Page');
    expect(element.tagName).toBe('H1');
  });
});

describe('Text', () => {
  it('renders as p', () => {
    renderWithTheme(<Text>Paragraph</Text>);
    const element = screen.getByText('Paragraph');
    expect(element.tagName).toBe('P');
  });
});

describe('SmallText', () => {
  it('renders as p', () => {
    renderWithTheme(<SmallText>Small</SmallText>);
    const element = screen.getByText('Small');
    expect(element.tagName).toBe('P');
  });
});

describe('Caption', () => {
  it('renders as span', () => {
    renderWithTheme(<Caption>Meta info</Caption>);
    const element = screen.getByText('Meta info');
    expect(element.tagName).toBe('SPAN');
  });
});
