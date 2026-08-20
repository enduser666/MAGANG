import { ConnectorInterface } from './IConnector';
import { ExcelConnector } from './excel/ExcelConnector';

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private registry: Map<string, ConnectorInterface> = new Map();

  private constructor() {
    // Pre-register available connectors
    this.register('EXCEL', new ExcelConnector());
  }

  public static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  public register(type: string, connector: ConnectorInterface): void {
    this.registry.set(type.toUpperCase(), connector);
  }

  public getConnector(type: string): ConnectorInterface {
    const connector = this.registry.get(type.toUpperCase());
    if (!connector) {
      throw new Error(`No connector registered for source type: ${type}`);
    }
    return connector;
  }
}
