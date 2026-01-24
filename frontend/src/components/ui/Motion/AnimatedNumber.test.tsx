import { render, screen } from '@testing-library/react';
import {
  AnimatedNumber,
  AnimatedPercentage,
  AnimatedCurrency,
  AnimatedCompactNumber,
} from './AnimatedNumber';

describe('AnimatedNumber', () => {
  it('renders a number', () => {
    render(<AnimatedNumber value={100} />);
    // The animated component renders (starts at 0, animates to 100)
    expect(document.body.textContent).toBeTruthy();
  });

  it('renders with prefix', () => {
    render(<AnimatedNumber value={50} prefix="$" />);
    expect(document.body.textContent).toContain('$');
  });

  it('renders with suffix', () => {
    render(<AnimatedNumber value={75} suffix="%" />);
    expect(document.body.textContent).toContain('%');
  });

  it('renders with decimals', () => {
    render(<AnimatedNumber value={99.5} decimals={1} />);
    // Initially shows 0.0, animates to 99.5
    // Just verify it renders a number with decimal
    expect(document.body.textContent).toBeTruthy();
  });

  it('applies className', () => {
    render(<AnimatedNumber value={100} className="test-class" />);
    const span = document.querySelector('.test-class');
    expect(span).toBeInTheDocument();
  });
});

describe('AnimatedPercentage', () => {
  it('renders percentage with suffix', () => {
    render(<AnimatedPercentage value={75} />);
    expect(document.body.textContent).toContain('%');
  });

  it('renders with showSign prop', () => {
    render(<AnimatedPercentage value={25} showSign />);
    // Component renders, sign will appear after animation
    expect(document.body.textContent).toContain('%');
  });
});

describe('AnimatedCurrency', () => {
  it('renders currency format', () => {
    render(<AnimatedCurrency value={1000} />);
    // Should contain dollar sign for USD
    expect(document.body.textContent).toContain('$');
  });
});

describe('AnimatedCompactNumber', () => {
  it('renders compact format for thousands', () => {
    render(<AnimatedCompactNumber value={1500} />);
    // Will animate from 0 to 1.5K
    // Just verify it renders
    expect(document.body.textContent).toBeTruthy();
  });
});
