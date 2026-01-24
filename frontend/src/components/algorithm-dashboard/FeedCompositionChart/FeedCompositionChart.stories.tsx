import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  FeedCompositionChart,
  type FeedComposition,
} from './FeedCompositionChart';

const meta: Meta<typeof FeedCompositionChart> = {
  title: 'Algorithm/FeedCompositionChart',
  component: FeedCompositionChart,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Donut chart visualization showing the composition of feed posts by category: boosted, demoted, filtered, and unaffected.',
      },
    },
  },
  argTypes: {
    data: {
      description: 'Feed composition data with percentage for each category',
    },
    composition: {
      description: 'Alias for data prop (for compatibility)',
    },
    showLegend: {
      control: 'boolean',
      description: 'Whether to show the legend below the chart',
    },
    showPercentages: {
      control: 'boolean',
      description: 'Whether to show percentage values in the legend',
    },
    onSegmentHover: {
      action: 'segmentHovered',
      description: 'Callback when a segment is hovered',
    },
    onSegmentClick: {
      action: 'segmentClicked',
      description: 'Callback when a segment is clicked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof FeedCompositionChart>;

const balancedComposition: FeedComposition = {
  boosted: 30,
  demoted: 20,
  filtered: 10,
  unaffected: 40,
};

export const Default: Story = {
  args: {
    data: balancedComposition,
    showLegend: true,
    showPercentages: true,
  },
};

export const WithoutLegend: Story = {
  args: {
    data: balancedComposition,
    showLegend: false,
  },
};

export const WithoutPercentages: Story = {
  args: {
    data: balancedComposition,
    showLegend: true,
    showPercentages: false,
  },
};

export const MostlyBoosted: Story = {
  args: {
    data: {
      boosted: 60,
      demoted: 10,
      filtered: 5,
      unaffected: 25,
    },
    showLegend: true,
    showPercentages: true,
  },
};

export const MostlyUnaffected: Story = {
  args: {
    data: {
      boosted: 5,
      demoted: 5,
      filtered: 5,
      unaffected: 85,
    },
    showLegend: true,
    showPercentages: true,
  },
};

export const HighFiltering: Story = {
  args: {
    data: {
      boosted: 10,
      demoted: 5,
      filtered: 60,
      unaffected: 25,
    },
    showLegend: true,
    showPercentages: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart showing high filtering activity (60% of posts filtered).',
      },
    },
  },
};

export const OnlyTwoCategories: Story = {
  args: {
    data: {
      boosted: 40,
      demoted: 0,
      filtered: 0,
      unaffected: 60,
    },
    showLegend: true,
    showPercentages: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with only boosted and unaffected posts (no demoted or filtered).',
      },
    },
  },
};

export const SingleCategory: Story = {
  args: {
    data: {
      boosted: 100,
      demoted: 0,
      filtered: 0,
      unaffected: 0,
    },
    showLegend: true,
    showPercentages: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with all posts in a single category (100% boosted).',
      },
    },
  },
};

export const SmallValues: Story = {
  args: {
    data: {
      boosted: 2,
      demoted: 1,
      filtered: 1,
      unaffected: 96,
    },
    showLegend: true,
    showPercentages: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with very small values showing minimal algorithm intervention.',
      },
    },
  },
};

export const EqualDistribution: Story = {
  args: {
    data: {
      boosted: 25,
      demoted: 25,
      filtered: 25,
      unaffected: 25,
    },
    showLegend: true,
    showPercentages: true,
  },
};

export const Empty: Story = {
  args: {
    data: {
      boosted: 0,
      demoted: 0,
      filtered: 0,
      unaffected: 0,
    },
    showLegend: true,
    showPercentages: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with all zero values (empty state).',
      },
    },
  },
};

function InteractiveDemo() {
  const [hoveredSegment, setHoveredSegment] = useState<keyof FeedComposition | null>(
    null
  );
  const [clickedSegment, setClickedSegment] = useState<keyof FeedComposition | null>(
    null
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <FeedCompositionChart
        data={balancedComposition}
        showLegend
        showPercentages
        onSegmentHover={setHoveredSegment}
        onSegmentClick={(segment) => setClickedSegment(segment)}
      />
      <div style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
        <p>Hovered: {hoveredSegment ?? 'none'}</p>
        <p>Last clicked: {clickedSegment ?? 'none'}</p>
      </div>
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive example showing hover and click event handling.',
      },
    },
  },
};
