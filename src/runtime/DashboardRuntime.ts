import { QueryEngine } from './QueryEngine';
import { DatasetRuntime } from './DatasetRuntime';
import { DashboardMetadata, WidgetConfig, WidgetType, ColumnMetadata } from '../lib/metadata-contract';

export interface WidgetPayload {
  config: WidgetConfig;
  data: number | string | Array<Record<string, unknown>> | Record<string, unknown>;
}

export class DashboardRuntime {
  private queryEngine: QueryEngine;
  private datasetRuntime: DatasetRuntime;

  constructor(dbType = 'sandbox', dbConfig: string | null = null) {
    this.queryEngine = new QueryEngine(dbType, dbConfig);
    this.datasetRuntime = new DatasetRuntime(dbType, dbConfig);
  }

  public async getDashboard(
    workspaceId: string,
    dashboardId: string,
    userContext: { username: string; role: string; satkerCode?: string }
  ): Promise<{ dashboard: DashboardMetadata; widgets: WidgetPayload[] }> {
    // In MVP, we mock fetching dashboard metadata. 
    // If it's a dataset slug, we generate a dashboard for it.
    let dashboardMeta: DashboardMetadata = {
      id: dashboardId,
      workspaceId,
      datasetId: dashboardId,
      title: `Dashboard for ${dashboardId}`,
      widgets: []
    };

    if (dashboardMeta.widgets.length === 0 && dashboardMeta.datasetId) {
      dashboardMeta.widgets = await this.generateDefaultWidgets(dashboardMeta.datasetId, dashboardId);
    }

    const payloads: WidgetPayload[] = [];

    for (const widget of dashboardMeta.widgets) {
      if (!widget.datasetId && dashboardMeta.datasetId) {
        widget.datasetId = dashboardMeta.datasetId;
      }
      const payload = await this.resolveWidgetData(widget, userContext);
      if (payload) {
        payloads.push(payload);
      }
    }

    return {
      dashboard: dashboardMeta,
      widgets: payloads
    };
  }

  private async generateDefaultWidgets(datasetId: string, dashboardId: string): Promise<WidgetConfig[]> {
    const ds = await this.datasetRuntime.resolveDataset(datasetId);
    if (!ds) return [];

    const widgets: WidgetConfig[] = [];
    
    // KPI: Total Records
    widgets.push({
      id: `auto-kpi-${datasetId}`,
      dashboardId,
      type: 'kpi',
      title: 'Total Records',
      datasetId,
      aggregate: { operation: 'count' }
    });

    const numCols = ds.columns.filter((c: ColumnMetadata) => c.type === 'number');
    const catCols = ds.columns.filter((c: ColumnMetadata) => c.type === 'string' && c.options && c.options.length > 0 || c.name === 'status' || c.name.includes('kategori'));
    
    // Add Bar chart for categorical data if any
    if (catCols.length > 0) {
      widgets.push({
        id: `auto-bar-${datasetId}`,
        dashboardId,
        type: 'bar',
        title: `Distribution by ${catCols[0].displayName}`,
        datasetId,
        aggregate: { operation: 'count' },
        chart: {
          xAxis: catCols[0].name,
          yAxis: numCols.length > 0 ? numCols[0].name : undefined
        }
      });
    }

    // Add Pie chart for another categorical data
    if (catCols.length > 1) {
      widgets.push({
        id: `auto-pie-${datasetId}`,
        dashboardId,
        type: 'pie',
        title: `Share by ${catCols[1].displayName}`,
        datasetId,
        aggregate: { operation: 'count' },
        chart: {
          xAxis: catCols[1].name
        }
      });
    }

    // Table preview
    widgets.push({
      id: `auto-table-${datasetId}`,
      dashboardId,
      type: 'table',
      title: 'Data Preview',
      datasetId,
      table: {
        limit: 10,
        columns: ds.columns.slice(0, 5).map((c: ColumnMetadata) => c.name)
      }
    });

    return widgets;
  }

  private async resolveWidgetData(
    widget: WidgetConfig,
    userContext: { username: string; role: string; satkerCode?: string }
  ): Promise<WidgetPayload | null> {
    try {
      if (!widget.datasetId) {
        return { config: widget, data: [] };
      }

      if (widget.type === 'table') {
        const res = await this.queryEngine.query(widget.datasetId, { limit: widget.table?.limit || 10 }, userContext);
        return { config: widget, data: res.data };
      }

      if (widget.type === 'kpi' || widget.type === 'statistic') {
        if (widget.aggregate?.operation === 'count') {
          // If just counting total rows
          const res = await this.queryEngine.query(widget.datasetId, { limit: 1 }, userContext);
          return { config: widget, data: res.total };
        } else {
          // Aggregate a specific field
          if (!widget.aggregate?.field) return { config: widget, data: 0 };
          const res = await this.queryEngine.aggregate(widget.datasetId, [widget.aggregate.field], [], userContext);
          return { config: widget, data: res[0]?.[widget.aggregate.field] || 0 };
        }
      }

      if (['bar', 'line', 'pie'].includes(widget.type)) {
        if (!widget.chart?.xAxis) return { config: widget, data: [] };
        const metricCol = widget.chart.yAxis ? [widget.chart.yAxis] : [];
        const dimensionCol = [widget.chart.xAxis];
        
        if (metricCol.length > 0) {
           const agg = await this.queryEngine.aggregate(widget.datasetId, metricCol, dimensionCol, userContext);
           return { config: widget, data: agg };
        } else {
           // We just count by dimension
           // Since aggregate method requires a metric, we might need to rely on DB COUNT(*) behavior inside aggregateDataset
           // In DbInterface implementation, COUNT(*) is aliased as "_count".
           const agg = await this.queryEngine.aggregate(widget.datasetId, [], dimensionCol, userContext);
           return { config: widget, data: agg };
        }
      }

      return { config: widget, data: [] };
    } catch (e: any) {
      console.error(`Widget Error [${widget.id}]:`, e.message);
      return { config: widget, data: { error: e.message } };
    }
  }
}
