import type { ReportDocument, ReportElement, TableElementData, TextElementData, ChartElementData, ImageElementData } from "@/types/report";
import { logger } from "@/lib/logger";

export function generateElementId(type: string): string {
  return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createTableElement(position: number): ReportElement {
  return {
    id: generateElementId('table'),
    type: 'table',
    position,
    config: {
      width: 'full',
    },
    data: {
      rows: 5,
      cols: 5,
      cells: {},
      title: 'New Table',
    } as TableElementData,
  };
}

export function createTextElement(position: number): ReportElement {
  return {
    id: generateElementId('text'),
    type: 'text',
    position,
    config: {
      width: 'full',
    },
    data: {
      content: '<p>Start typing...</p>',
    } as TextElementData,
  };
}

export function createChartElement(position: number): ReportElement {
  return {
    id: generateElementId('chart'),
    type: 'chart',
    position,
    config: {
      width: 'full',
      height: 400,
    },
    data: {
      chartType: 'bar',
      xAxis: '',
      yAxis: [],
      title: 'New Chart',
    } as ChartElementData,
  };
}

export function createImageElement(position: number): ReportElement {
  return {
    id: generateElementId('image'),
    type: 'image',
    position,
    config: {
      width: 'full',
    },
    data: {
      url: '',
      alt: '',
      caption: '',
    } as ImageElementData,
  };
}

export function exportReportToJSON(report: ReportDocument): string {
  return JSON.stringify(report, null, 2);
}

export function importReportFromJSON(json: string): ReportDocument | null {
  try {
    return JSON.parse(json) as ReportDocument;
  } catch (error) {
    logger.error('Failed to parse report JSON:', error);
    return null;
  }
}
