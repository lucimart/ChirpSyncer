import { render, screen } from '@testing-library/react';
import { ScoreExplainer } from './ScoreExplainer';

describe('ScoreExplainer', () => {
  const createMockPost = (overrides = {}) => ({
    id: 'post-1',
    content: 'Test post content',
    author: '@testuser',
    timestamp: '1 hour ago',
    score: 100,
    appliedRules: [],
    ...overrides,
  });

  it('renders the component', () => {
    render(<ScoreExplainer post={createMockPost()} />);
    expect(screen.getByTestId('score-explainer')).toBeInTheDocument();
  });

  it('displays the total score', () => {
    render(<ScoreExplainer post={createMockPost({ score: 150 })} />);
    expect(screen.getByText(/total score.*150/i)).toBeInTheDocument();
  });

  it('displays base score', () => {
    render(<ScoreExplainer post={createMockPost()} />);
    expect(screen.getByText('Base Score')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('shows "No rules applied" when no rules', () => {
    render(<ScoreExplainer post={createMockPost()} />);
    expect(screen.getByText(/no rules applied/i)).toBeInTheDocument();
  });

  it('displays applied rules with contributions', () => {
    const post = createMockPost({
      score: 130,
      appliedRules: [
        {
          ruleId: 'rule-1',
          ruleName: 'Boost Rule',
          contribution: 30,
        },
      ],
    });

    render(<ScoreExplainer post={post} />);
    expect(screen.getByText('Boost Rule')).toBeInTheDocument();
    expect(screen.getByText('+30')).toBeInTheDocument();
  });

  it('displays negative contributions correctly', () => {
    const post = createMockPost({
      score: 70,
      appliedRules: [
        {
          ruleId: 'rule-1',
          ruleName: 'Demote Rule',
          contribution: -30,
        },
      ],
    });

    render(<ScoreExplainer post={post} />);
    expect(screen.getByText('Demote Rule')).toBeInTheDocument();
    expect(screen.getByText('-30')).toBeInTheDocument();
  });

  it('displays multiple rules', () => {
    const post = createMockPost({
      score: 140,
      appliedRules: [
        { ruleId: 'rule-1', ruleName: 'Boost A', contribution: 25 },
        { ruleId: 'rule-2', ruleName: 'Boost B', contribution: 15 },
      ],
    });

    render(<ScoreExplainer post={post} />);
    expect(screen.getByText('Boost A')).toBeInTheDocument();
    expect(screen.getByText('Boost B')).toBeInTheDocument();
  });

  it('renders progress bar', () => {
    render(<ScoreExplainer post={createMockPost({ score: 150 })} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays matched conditions when provided', () => {
    const post = createMockPost({
      score: 130,
      appliedRules: [
        {
          ruleId: 'rule-1',
          ruleName: 'Content Rule',
          contribution: 30,
          matchedConditions: [
            { field: 'content', operator: 'contains', value: 'tech' },
          ],
        },
      ],
    });

    render(<ScoreExplainer post={post} />);
    expect(screen.getByText(/matched conditions/i)).toBeInTheDocument();
    expect(screen.getByText(/content.*contains.*"tech"/i)).toBeInTheDocument();
  });

  it('shows percentage for each rule contribution', () => {
    const post = createMockPost({
      score: 150,
      appliedRules: [
        { ruleId: 'rule-1', ruleName: 'Rule', contribution: 50 },
      ],
    });

    render(<ScoreExplainer post={post} />);
    // 50/150 = 33.3%
    expect(screen.getByText(/33\.3%/)).toBeInTheDocument();
  });

  it('renders positive segments for boost rules', () => {
    const post = createMockPost({
      score: 130,
      appliedRules: [
        { ruleId: 'rule-1', ruleName: 'Boost', contribution: 30 },
      ],
    });

    render(<ScoreExplainer post={post} />);
    expect(screen.getByTestId('positive-segment-0')).toBeInTheDocument();
  });

  it('renders negative segments for demote rules', () => {
    const post = createMockPost({
      score: 70,
      appliedRules: [
        { ruleId: 'rule-1', ruleName: 'Demote', contribution: -30 },
      ],
    });

    render(<ScoreExplainer post={post} />);
    expect(screen.getByTestId('negative-segment-0')).toBeInTheDocument();
  });

  it('renders both positive and negative segments', () => {
    const post = createMockPost({
      score: 110,
      appliedRules: [
        { ruleId: 'rule-1', ruleName: 'Boost', contribution: 30 },
        { ruleId: 'rule-2', ruleName: 'Demote', contribution: -20 },
      ],
    });

    render(<ScoreExplainer post={post} />);
    expect(screen.getByTestId('positive-segment-0')).toBeInTheDocument();
    expect(screen.getByTestId('negative-segment-0')).toBeInTheDocument();
  });
});
