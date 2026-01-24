import type { Meta, StoryObj } from '@storybook/react';
import { TimingHeatmap, TimingHeatmapData, HeatmapCell } from './TimingHeatmap';

const meta: Meta<typeof TimingHeatmap> = {
  title: 'Components/Scheduler/TimingHeatmap',
  component: TimingHeatmap,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    loading: { control: 'boolean' },
    compact: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof TimingHeatmap>;

// Generate mock data
const generateMockCells = (): HeatmapCell[] => {
  const cells: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Simulate realistic engagement patterns
      let baseScore = 30;

      // Higher engagement during work hours
      if (hour >= 9 && hour <= 17) baseScore += 20;

      // Peak times: lunch (12-1pm) and evening (6-8pm)
      if ((hour >= 12 && hour <= 13) || (hour >= 18 && hour <= 20)) baseScore += 30;

      // Lower engagement on weekends
      if (day === 0 || day === 6) baseScore -= 10;

      // Add some randomness
      const score = Math.max(0, Math.min(100, baseScore + Math.floor(Math.random() * 20 - 10)));

      cells.push({
        day,
        hour,
        score,
        postCount: Math.floor(Math.random() * 20) + 1,
        avgEngagement: Math.floor(Math.random() * 500) + 50,
      });
    }
  }
  return cells;
};

const mockData: TimingHeatmapData = {
  cells: generateMockCells(),
  bestSlots: [
    { day: 2, hour: 12, score: 92, label: 'Tuesday 12 PM' },
    { day: 4, hour: 18, score: 88, label: 'Thursday 6 PM' },
    { day: 1, hour: 19, score: 85, label: 'Monday 7 PM' },
  ],
  dataQuality: 'high',
  basedOnPosts: 247,
};

const lowDataMock: TimingHeatmapData = {
  cells: generateMockCells().map(c => ({ ...c, score: Math.floor(c.score * 0.6) })),
  bestSlots: [
    { day: 3, hour: 14, score: 65, label: 'Wednesday 2 PM' },
  ],
  dataQuality: 'low',
  basedOnPosts: 12,
};

const mediumDataMock: TimingHeatmapData = {
  cells: generateMockCells().map(c => ({ ...c, score: Math.floor(c.score * 0.8) })),
  bestSlots: [
    { day: 2, hour: 12, score: 78, label: 'Tuesday 12 PM' },
    { day: 4, hour: 18, score: 72, label: 'Thursday 6 PM' },
  ],
  dataQuality: 'medium',
  basedOnPosts: 58,
};

export const Default: Story = {
  args: {
    data: mockData,
    onCellSelect: (cell) => console.log('Selected cell:', cell),
  },
};

export const Loading: Story = {
  args: {
    data: null,
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    data: null,
    loading: false,
  },
};

export const Compact: Story = {
  args: {
    data: mockData,
    compact: true,
    onCellSelect: (cell) => console.log('Selected cell:', cell),
  },
};

export const WithSelection: Story = {
  args: {
    data: mockData,
    selectedDay: 2,
    selectedHour: 12,
    onCellSelect: (cell) => console.log('Selected cell:', cell),
  },
};

export const LowConfidence: Story = {
  args: {
    data: lowDataMock,
    onCellSelect: (cell) => console.log('Selected cell:', cell),
  },
};

export const MediumConfidence: Story = {
  args: {
    data: mediumDataMock,
    onCellSelect: (cell) => console.log('Selected cell:', cell),
  },
};

export const HighConfidence: Story = {
  args: {
    data: mockData,
    onCellSelect: (cell) => console.log('Selected cell:', cell),
  },
};
