'use client';

import { memo, type FC } from 'react';
import { SmallText } from '@/components/ui';
import { StatsWidget } from '../StatsWidget';
import { ChartWidget } from '../ChartWidget';
import { NivoChartWidget } from '../NivoChartWidget';
import { ListWidget } from '../ListWidget';
import type { WidgetConfig, WidgetDataMap, ListItem } from '../types';

interface WidgetRendererProps {
  config: WidgetConfig;
  onItemClick?: (item: ListItem) => void;
  onViewAll?: () => void;
}

const DefaultContent: FC<{ type: string }> = ({ type }) => (
  <SmallText style={{ color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
    No data configured for {type} widget
  </SmallText>
);

const StatsRenderer: FC<{ data?: WidgetDataMap['stats']; title: string }> = memo(
  ({ data, title }) => {
    if (!data?.items?.length) {
      return <DefaultContent type="stats" />;
    }
    return (
      <StatsWidget
        stats={data.items}
        title={title}
        compact={data.compact}
        layout={data.layout}
      />
    );
  }
);
StatsRenderer.displayName = 'StatsRenderer';

const ChartRenderer: FC<{ data?: WidgetDataMap['chart']; title: string }> = memo(
  ({ data, title }) => {
    if (!data?.data?.length) {
      return <DefaultContent type="chart" />;
    }

    // Use Nivo for enhanced animations and tooltips when enabled
    if (data.useNivo) {
      return (
        <NivoChartWidget
          data={data.data}
          title={title}
          chartType={data.type ?? 'bar'}
          showLegend={data.showLegend}
          height={data.height}
        />
      );
    }

    return (
      <ChartWidget
        data={data.data}
        title={title}
        chartType={data.type ?? 'bar'}
        showLegend={data.showLegend}
      />
    );
  }
);
ChartRenderer.displayName = 'ChartRenderer';

interface ListRendererProps {
  data?: WidgetDataMap['list'];
  title: string;
  onItemClick?: (item: ListItem) => void;
  onViewAll?: () => void;
}

const ListRenderer: FC<ListRendererProps> = memo(
  ({ data, title, onItemClick, onViewAll }) => {
    if (!data?.items?.length) {
      return <DefaultContent type="list" />;
    }

    const handleItemClick = onItemClick ?? (() => {});

    return (
      <ListWidget
        items={data.items}
        title={title}
        onItemClick={handleItemClick}
        maxItems={data.maxItems}
        onViewAll={onViewAll}
      />
    );
  }
);
ListRenderer.displayName = 'ListRenderer';

export const WidgetRenderer: FC<WidgetRendererProps> = memo(
  ({ config, onItemClick, onViewAll }) => {
    switch (config.type) {
      case 'stats':
        return (
          <StatsRenderer
            data={config.data as WidgetDataMap['stats']}
            title={config.title}
          />
        );

      case 'chart':
        return (
          <ChartRenderer
            data={config.data as WidgetDataMap['chart']}
            title={config.title}
          />
        );

      case 'list':
        return (
          <ListRenderer
            data={config.data as WidgetDataMap['list']}
            title={config.title}
            onItemClick={onItemClick}
            onViewAll={onViewAll}
          />
        );

      case 'custom':
        return <DefaultContent type="custom" />;

      default:
        return <DefaultContent type="unknown" />;
    }
  }
);

WidgetRenderer.displayName = 'WidgetRenderer';

export default WidgetRenderer;
