import type { Meta, StoryObj } from '@storybook/react';
import { TimingRecommendation } from './TimingRecommendation';

const meta: Meta<typeof TimingRecommendation> = {
  title: 'Components/Scheduler/TimingRecommendation',
  component: TimingRecommendation,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TimingRecommendation>;

const mockBestSlots = [
  { day: 2, hour: 12, score: 92, label: 'Tuesday 12:00 PM' },
  { day: 4, hour: 18, score: 88, label: 'Thursday 6:00 PM' },
  { day: 1, hour: 19, score: 85, label: 'Monday 7:00 PM' },
  { day: 3, hour: 14, score: 78, label: 'Wednesday 2:00 PM' },
  { day: 5, hour: 10, score: 72, label: 'Friday 10:00 AM' },
];

export const Default: Story = {
  args: {
    bestSlots: mockBestSlots,
    onSlotSelect: (slot) => console.log('Selected slot:', slot),
  },
};

export const HighScores: Story = {
  args: {
    bestSlots: [
      { day: 2, hour: 12, score: 95, label: 'Tuesday 12:00 PM' },
      { day: 4, hour: 18, score: 92, label: 'Thursday 6:00 PM' },
      { day: 1, hour: 19, score: 88, label: 'Monday 7:00 PM' },
    ],
    onSlotSelect: (slot) => console.log('Selected slot:', slot),
  },
};

export const MixedScores: Story = {
  args: {
    bestSlots: [
      { day: 2, hour: 12, score: 85, label: 'Tuesday 12:00 PM' },
      { day: 4, hour: 18, score: 65, label: 'Thursday 6:00 PM' },
      { day: 1, hour: 19, score: 45, label: 'Monday 7:00 PM' },
    ],
    onSlotSelect: (slot) => console.log('Selected slot:', slot),
  },
};

export const LowScores: Story = {
  args: {
    bestSlots: [
      { day: 2, hour: 12, score: 55, label: 'Tuesday 12:00 PM' },
      { day: 4, hour: 18, score: 48, label: 'Thursday 6:00 PM' },
      { day: 1, hour: 19, score: 42, label: 'Monday 7:00 PM' },
    ],
    onSlotSelect: (slot) => console.log('Selected slot:', slot),
  },
};

export const SingleSlot: Story = {
  args: {
    bestSlots: [
      { day: 2, hour: 12, score: 90, label: 'Tuesday 12:00 PM' },
    ],
    onSlotSelect: (slot) => console.log('Selected slot:', slot),
  },
};

export const Empty: Story = {
  args: {
    bestSlots: [],
    onSlotSelect: (slot) => console.log('Selected slot:', slot),
  },
};

export const ManySlots: Story = {
  args: {
    bestSlots: [
      { day: 2, hour: 12, score: 95, label: 'Tuesday 12:00 PM' },
      { day: 4, hour: 18, score: 92, label: 'Thursday 6:00 PM' },
      { day: 1, hour: 19, score: 88, label: 'Monday 7:00 PM' },
      { day: 3, hour: 14, score: 85, label: 'Wednesday 2:00 PM' },
      { day: 5, hour: 10, score: 82, label: 'Friday 10:00 AM' },
      { day: 0, hour: 11, score: 78, label: 'Sunday 11:00 AM' },
      { day: 6, hour: 16, score: 75, label: 'Saturday 4:00 PM' },
    ],
    onSlotSelect: (slot) => console.log('Selected slot:', slot),
  },
};
