import { getDbClient } from '../db';

export class NavigationService {
  private db: any;

  constructor(dbType = 'sandbox', dbConfig: string | null = null) {
    this.db = getDbClient(dbType, dbConfig);
  }

  public async getNavigation(): Promise<{ workspaces: any[] }> {
    let workspaces = await this.db.workspaces.findMany();
    
    // Seed default fallback workspace if none exist in registry
    if (workspaces.length === 0) {
      workspaces = [{ id: 'default', name: 'Executive Workspace' }];
    }
    
    const allDatasets = await this.db.datasets.findMany();

    const result = workspaces.map((ws: any) => {
      const wsDatasets = allDatasets.filter((ds: any) => ds.workspaceId === ws.id);
      return {
        id: ws.id,
        name: ws.name,
        icon: 'Briefcase',
        datasets: wsDatasets.map((ds: any) => ({
          id: ds.id,
          displayName: ds.displayName,
          category: ds.category,
          rowCount: ds.rowCount || 0
         }))
      };
    });

    return { workspaces: result };
  }
}
