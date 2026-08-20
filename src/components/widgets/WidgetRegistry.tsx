import React from 'react';
import { WidgetType } from '@/lib/metadata-contract';
import { KPICard, BaseWidgetProps } from './KPICard';
import { BarChartWidget } from './BarChartWidget';
import { PieChartWidget } from './PieChartWidget';
import { LineChartWidget } from './LineChartWidget';
import { TableWidget } from './TableWidget';

export const WIDGET_REGISTRY: Record<WidgetType, React.ComponentType<BaseWidgetProps>> = {
  kpi: KPICard,
  bar: BarChartWidget,
  pie: PieChartWidget,
  line: LineChartWidget,
  table: TableWidget,
  statistic: KPICard, // Fallback for statistic to KPICard
  markdown: () => <div className="p-4 bg-slate-100 rounded text-slate-500">Markdown Widget Not Implemented in MVP</div>,
  richtext: () => <div className="p-4 bg-slate-100 rounded text-slate-500">RichText Widget Not Implemented in MVP</div>
};
