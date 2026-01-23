import React from 'react';

// Mock Nivo components for Jest
export const ResponsiveBar = ({ data, ...props }: { data: unknown[] }) => (
  <div data-testid="mock-nivo-bar" data-props={JSON.stringify({ data, ...props })}>
    Mock ResponsiveBar
  </div>
);

export const ResponsivePie = ({ data, ...props }: { data: unknown[] }) => (
  <div data-testid="mock-nivo-pie" data-props={JSON.stringify({ data, ...props })}>
    Mock ResponsivePie
  </div>
);

export const ResponsiveLine = ({ data, ...props }: { data: unknown[] }) => (
  <div data-testid="mock-nivo-line" data-props={JSON.stringify({ data, ...props })}>
    Mock ResponsiveLine
  </div>
);

export const ResponsiveHeatMap = ({ data, ...props }: { data: unknown[] }) => (
  <div data-testid="mock-nivo-heatmap" data-props={JSON.stringify({ data, ...props })}>
    Mock ResponsiveHeatMap
  </div>
);
