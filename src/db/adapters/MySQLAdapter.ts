import mysql from 'mysql2/promise';
import type { DbInterface, TableMetadata, ColumnDefinition } from '../index';

export class MySQLAdapter implements DbInterface {
  private pool: mysql.Pool;

  constructor() {
    // Phase 1 — Environment Configuration Validation
    if (!process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_NAME || !process.env.DB_USER) {
      throw new Error('MySQL Configuration is incomplete. Please check DB_HOST, DB_PORT, DB_NAME, DB_USER in your environment.');
    }

    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true // Important to keep dates as strings to match metadata-contract format
    });
    
    // Asynchronously ensure schema is initialized on startup
    this.ensureDatasetRegistry().catch(err => {
      console.error('Failed to initialize sys_datasets schema on startup:', err);
    });
  }

  private validateIdentifier(identifier: string) {
    if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
      throw new Error(`Invalid SQL identifier: ${identifier}`);
    }
  }

  public async ensureDatasetRegistry(connection?: any): Promise<void> {
    const conn = connection || this.pool;
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sys_datasets (
        id VARCHAR(100) PRIMARY KEY,
        dataset_name VARCHAR(255) NOT NULL,
        dataset_mode VARCHAR(50) NOT NULL DEFAULT 'DYNAMIC_FLAT_TABLE',
        table_name VARCHAR(255),
        source_file_name VARCHAR(255),
        sheet_name VARCHAR(255),
        row_count INT DEFAULT 0,
        column_mapping JSON,
        legacy_config JSON,
        is_active TINYINT(1) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'READY',
        version INT NOT NULL DEFAULT 1,
        imported_by VARCHAR(100),
        imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        activated_by VARCHAR(100),
        activated_at DATETIME NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migration mechanism: ensure all necessary columns exist
    const [columns] = await conn.query('SHOW COLUMNS FROM sys_datasets');
    const existingCols = (columns as any[]).map(c => c.Field);

    const checkAndAddColumn = async (colName: string, colDef: string) => {
      if (!existingCols.includes(colName)) {
        await conn.query(`ALTER TABLE sys_datasets ADD COLUMN ${colName} ${colDef}`);
      }
    };

    await checkAndAddColumn('sheet_name', 'VARCHAR(255)');
    await checkAndAddColumn('legacy_config', 'JSON');
    await checkAndAddColumn('activated_by', 'VARCHAR(100)');
    await checkAndAddColumn('activated_at', 'DATETIME NULL');
    await checkAndAddColumn('updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  }

  // --- Core Dynamic Engine Methods ---

  async listTables(): Promise<TableMetadata[]> {
    const [rows] = await this.pool.query('SHOW TABLES');
    const tables: TableMetadata[] = [];
    const dbName = process.env.DB_NAME as string;
    const key = `Tables_in_${dbName}`;

    for (const row of rows as any[]) {
      const tableName = row[key] || row[Object.keys(row)[0]];
      const meta = await this.getTableMetadata(tableName);
      if (meta) {
        tables.push(meta);
      }
    }
    return tables;
  }

  async getTableMetadata(tableName: string): Promise<TableMetadata | null> {
    this.validateIdentifier(tableName);
    try {
      const [columns] = await this.pool.query('SHOW COLUMNS FROM ??', [tableName]);
      
      const parsedColumns: ColumnDefinition[] = (columns as any[]).map(col => {
        const dbType = col.Type.toLowerCase();
        let type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'text' | 'datetime' | 'enum' = 'string';
        let options: string[] | undefined = undefined;

        if (dbType.includes('int') || dbType.includes('decimal') || dbType.includes('float') || dbType.includes('double')) {
          type = dbType === 'tinyint(1)' ? 'boolean' : 'number';
        } else if (dbType.includes('date') && !dbType.includes('datetime')) {
          type = 'date';
        } else if (dbType.includes('datetime') || dbType.includes('timestamp')) {
          type = 'datetime';
        } else if (dbType.includes('text')) {
          type = 'text';
        } else if (dbType.includes('json')) {
          type = 'json';
        } else if (dbType.includes('enum')) {
          type = 'enum';
          const match = dbType.match(/enum\((.*)\)/);
          if (match && match[1]) {
            options = match[1].split(',').map((o: string) => o.replace(/'/g, ''));
          }
        }

        return {
          name: col.Field,
          displayName: col.Field.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          type: type as any,
          isNullable: col.Null === 'YES',
          isPrimaryKey: col.Key === 'PRI',
          isEditable: col.Key !== 'PRI' && col.Extra !== 'auto_increment',
          hidden: false,
          defaultValue: col.Default,
          options
        };
      });

      return {
        name: tableName,
        displayName: tableName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        columns: parsedColumns,
        createdAt: new Date().toISOString(),
        sourceFile: 'MySQL Database',
        creator: 'system',
        rowCount: 0, // In a real scenario, this would be queried via COUNT(*) or information_schema
        qualityScore: 100
      };
    } catch (e) {
      return null;
    }
  }

  async findRecords(tableName: string, params?: any): Promise<{ data: any[]; total: number }> {
    this.validateIdentifier(tableName);
    let query = `SELECT * FROM \`${tableName}\``;
    let countQuery = `SELECT COUNT(*) as total FROM \`${tableName}\``;
    const queryParams: any[] = [];
    const countParams: any[] = [];
    const conditions: string[] = [];

    if (params?.where) {
      for (const [key, value] of Object.entries(params.where)) {
        this.validateIdentifier(key);
        conditions.push(`\`${key}\` = ?`);
        queryParams.push(value);
        countParams.push(value);
      }
    }

    if (params?.search) {
      const meta = await this.getTableMetadata(tableName);
      if (meta) {
        const searchConditions: string[] = [];
        for (const col of meta.columns) {
          if (['string', 'text'].includes(col.type)) {
            searchConditions.push(`\`${col.name}\` LIKE ?`);
            const likeVal = `%${params.search}%`;
            queryParams.push(likeVal);
            countParams.push(likeVal);
          }
        }
        if (searchConditions.length > 0) {
          conditions.push(`(${searchConditions.join(' OR ')})`);
        }
      }
    }

    if (params?._customWhere) {
      conditions.push(params._customWhere.sql);
      if (params._customWhere.values && Array.isArray(params._customWhere.values)) {
        queryParams.push(...params._customWhere.values);
        countParams.push(...params._customWhere.values);
      }
    }

    if (conditions.length > 0) {
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;
      query += whereClause;
      countQuery += whereClause;
    }

    if (params?.sortField) {
      this.validateIdentifier(params.sortField);
      const direction = params.sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      query += ` ORDER BY \`${params.sortField}\` ${direction}`;
    } else {
      query += ` ORDER BY id DESC`; // Default sort
    }

    const limit = params?.limit ? parseInt(params.limit, 10) : 20;
    const page = params?.page ? parseInt(params.page, 10) : 1;
    const offset = (page - 1) * limit;

    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const [countRows] = await this.pool.query(countQuery, countParams);
    const total = (countRows as any[])[0].total;

    const [rows] = await this.pool.query(query, queryParams);
    
    return { data: rows as any[], total };
  }

  async findRecordById(tableName: string, id: number): Promise<any | null> {
    this.validateIdentifier(tableName);
    const [rows] = await this.pool.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [id]);
    return (rows as any[])[0] || null;
  }

  async createRecord(tableName: string, data: any): Promise<any> {
    this.validateIdentifier(tableName);
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    for (const key of keys) this.validateIdentifier(key);

    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.map(k => `\`${k}\``).join(', ');

    const [result] = await this.pool.query(`INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders})`, values);
    const insertId = (result as any).insertId;
    return this.findRecordById(tableName, insertId);
  }

  async updateRecord(tableName: string, id: number, data: any): Promise<any> {
    this.validateIdentifier(tableName);
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    if (keys.length === 0) return this.findRecordById(tableName, id);

    for (const key of keys) this.validateIdentifier(key);

    const updates = keys.map(k => `\`${k}\` = ?`).join(', ');
    values.push(id);

    await this.pool.query(`UPDATE \`${tableName}\` SET ${updates} WHERE id = ?`, values);
    return this.findRecordById(tableName, id);
  }

  async deleteRecord(tableName: string, id: number): Promise<any> {
    this.validateIdentifier(tableName);
    const record = await this.findRecordById(tableName, id);
    if (record) {
      await this.pool.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [id]);
    }
    return record;
  }

  async aggregateDataset(tableName: string, metricColumns: string[], dimensionColumns: string[], params?: any): Promise<any[]> {
    this.validateIdentifier(tableName);
    for (const m of metricColumns) this.validateIdentifier(m);
    for (const d of dimensionColumns) this.validateIdentifier(d);

    const selectMetrics = metricColumns.map(m => `SUM(\`${m}\`) as \`${m}\``).join(', ');
    const selectDims = dimensionColumns.map(d => `\`${d}\``).join(', ');
    const groupDims = dimensionColumns.map(d => `\`${d}\``).join(', ');

    let query = `SELECT ${selectDims}${selectMetrics ? ', ' + selectMetrics : ''} FROM \`${tableName}\``;
    
    if (dimensionColumns.length > 0) {
      query += ` GROUP BY ${groupDims}`;
    }

    const [rows] = await this.pool.query(query);
    return rows as any[];
  }

  async bulkInsertRecords(tableName: string, records: any[]): Promise<void> {
    if (records.length === 0) return;
    this.validateIdentifier(tableName);
    
    const keys = Object.keys(records[0]);
    for (const key of keys) this.validateIdentifier(key);

    const columns = keys.map(k => `\`${k}\``).join(', ');
    const values = records.map(r => keys.map(k => r[k]));

    await this.pool.query(`INSERT INTO \`${tableName}\` (${columns}) VALUES ?`, [values]);
  }

  async createDynamicTable(name: string, displayName: string, sourceFile: string, creator: string, columns: ColumnDefinition[], rows: any[], qualityScore?: number, importMode?: 'overwrite' | 'append'): Promise<any> {
    const safeMode = importMode || 'overwrite';
    this.validateIdentifier(name);

    if (!columns || columns.length === 0) {
      throw new Error('Import database gagal: Tidak ada kolom yang didefinisikan.');
    }

    const mapType = (type: string): string => {
      switch (type.toLowerCase()) {
        case 'text': return 'TEXT';
        case 'integer':
        case 'int': return 'INT';
        case 'number':
        case 'decimal': return 'DECIMAL(18,4)';
        case 'boolean': return 'TINYINT(1)';
        case 'date': return 'DATE';
        case 'datetime': return 'DATETIME';
        case 'string':
        default: return 'VARCHAR(255)';
      }
    };

    const connection = await this.pool.getConnection();
    
    try {
      if (safeMode === 'overwrite') {
        const timestamp = new Date().getTime();
        const stagingTableName = `_staging_${name}_${timestamp}`;
        this.validateIdentifier(stagingTableName);

        let createTableSql = `CREATE TABLE \`${stagingTableName}\` (\n  \`id\` INT AUTO_INCREMENT PRIMARY KEY`;
        for (const col of columns) {
          if (col.name.toLowerCase() === 'id') continue;
          this.validateIdentifier(col.name);
          const sqlType = mapType(col.type);
          createTableSql += `,\n  \`${col.name}\` ${sqlType}`;
        }
        createTableSql += `\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

        try {
          await connection.query(createTableSql);
        } catch (err: any) {
          throw new Error(`Import database gagal: gagal membuat struktur tabel staging.`);
        }

        await connection.beginTransaction();
        try {
          if (rows && rows.length > 0) {
            const colsToInsert = columns.filter(c => c.name.toLowerCase() !== 'id').map(c => c.name);
            const sqlCols = colsToInsert.map(c => `\`${c}\``).join(', ');
            
            const batchSize = 1000;
            for (let i = 0; i < rows.length; i += batchSize) {
              const batch = rows.slice(i, i + batchSize);
              const values: any[] = [];
              const placeholders = batch.map(row => {
                const rowValues = colsToInsert.map(colName => {
                  let val = row[colName];
                  if (val === undefined || val === '') return null;
                  if (typeof val === 'boolean') return val ? 1 : 0;
                  return val;
                });
                values.push(...rowValues);
                return `(${colsToInsert.map(() => '?').join(', ')})`;
              }).join(', ');
              
              const insertSql = `INSERT INTO \`${stagingTableName}\` (${sqlCols}) VALUES ${placeholders}`;
              await connection.query(insertSql, values);
            }
          }
          await connection.commit();
        } catch (err: any) {
          await connection.rollback();
          await connection.query(`DROP TABLE IF EXISTS \`${stagingTableName}\``);
          throw new Error(`Import database gagal: tipe data atau nilai pada kolom tidak sesuai. Data dibatalkan.`);
        }

        const backupTableName = `_backup_${name}_${timestamp}`;
        try {
          const [checkRows] = await connection.query(`SHOW TABLES LIKE ?`, [name]);
          const finalTableExists = (checkRows as any[]).length > 0;

          if (finalTableExists) {
            this.validateIdentifier(backupTableName);
            // Atomic swap rename
            await connection.query(`RENAME TABLE \`${name}\` TO \`${backupTableName}\`, \`${stagingTableName}\` TO \`${name}\``);
            // Drop backup if successful
            await connection.query(`DROP TABLE IF EXISTS \`${backupTableName}\``);
          } else {
            await connection.query(`RENAME TABLE \`${stagingTableName}\` TO \`${name}\``);
          }
          
          const datasetId = `ds_${timestamp}`;
          const columnMapping = JSON.stringify({});
          
          await this.ensureDatasetRegistry(connection);
          
          await connection.query(`
            INSERT INTO sys_datasets (
              id, dataset_name, dataset_mode, table_name, source_file_name, 
              row_count, column_mapping, is_active, status, version, imported_by
            ) VALUES (?, ?, 'DYNAMIC_FLAT_TABLE', ?, ?, ?, ?, 0, 'READY', 1, ?)
          `, [
            datasetId, displayName || name, name, sourceFile, rows.length, columnMapping, creator
          ]);

          // Verifications
          const [verifyRows] = await connection.query(`SHOW TABLES LIKE ?`, [name]);
          if ((verifyRows as any[]).length === 0) {
            throw new Error(`Tabel final ${name} tidak ditemukan setelah rename.`);
          }
          
          const [verifyStagingRows] = await connection.query(`SHOW TABLES LIKE ?`, [stagingTableName]);
          if ((verifyStagingRows as any[]).length > 0) {
            throw new Error(`Tabel staging ${stagingTableName} masih tertinggal setelah rename.`);
          }
          
          const [countRows] = await connection.query(`SELECT COUNT(*) as count FROM \`${name}\``);
          const finalCount = Number((countRows as any[])[0].count);
          if (finalCount !== rows.length) {
            throw new Error(`Jumlah baris tabel final (${finalCount}) tidak sesuai ekspektasi (${rows.length}).`);
          }
          
          const [metaRows] = await connection.query(`SELECT id FROM sys_datasets WHERE id = ?`, [datasetId]);
          if ((metaRows as any[]).length === 0) {
            throw new Error(`Metadata dataset belum tercatat di sys_datasets.`);
          }
          
        } catch (err: any) {
           console.error('Finalization Error Asli:', {
             code: err.code,
             errno: err.errno,
             sqlState: err.sqlState,
             sqlMessage: err.sqlMessage,
             stagingTableName,
             finalTableName: name
           });
           throw new Error(`Import database gagal: gagal memfinalisasi tabel staging ke tabel utama. Detail: ${err.sqlMessage || err.message}`);
        }

      } else {
        // APPEND MODE
        let existingColsRows;
        try {
          const [res] = await connection.query('SHOW COLUMNS FROM ??', [name]);
          existingColsRows = res as any[];
        } catch(e: any) {
          throw new Error(`Import database gagal: tabel target untuk append tidak ditemukan.`);
        }
        
        const existingCols = existingColsRows.map((r: any) => r.Field);
        
        for (const col of columns) {
          if (col.name.toLowerCase() === 'id') continue;
          if (!existingCols.includes(col.name)) {
             this.validateIdentifier(col.name);
             const sqlType = mapType(col.type);
             await connection.query(`ALTER TABLE \`${name}\` ADD COLUMN \`${col.name}\` ${sqlType}`);
          }
        }
        
        await connection.beginTransaction();
        try {
          if (rows && rows.length > 0) {
            const colsToInsert = columns.filter(c => c.name.toLowerCase() !== 'id').map(c => c.name);
            const sqlCols = colsToInsert.map(c => `\`${c}\``).join(', ');
            
            const batchSize = 1000;
            for (let i = 0; i < rows.length; i += batchSize) {
              const batch = rows.slice(i, i + batchSize);
              const values: any[] = [];
              const placeholders = batch.map(row => {
                const rowValues = colsToInsert.map(colName => {
                  let val = row[colName];
                  if (val === undefined || val === '') return null;
                  if (typeof val === 'boolean') return val ? 1 : 0;
                  return val;
                });
                values.push(...rowValues);
                return `(${colsToInsert.map(() => '?').join(', ')})`;
              }).join(', ');
              
              const insertSql = `INSERT INTO \`${name}\` (${sqlCols}) VALUES ${placeholders}`;
              await connection.query(insertSql, values);
            }
          }
          await connection.commit();
          
          await connection.query(`
            UPDATE sys_datasets 
            SET row_count = row_count + ?, updated_at = NOW() 
            WHERE table_name = ? AND dataset_mode = 'DYNAMIC_FLAT_TABLE'
          `, [rows.length, name]);
          
        } catch (err: any) {
          await connection.rollback();
          throw new Error(`Import database gagal: proses penyimpanan data dibatalkan dan data lama tetap utuh.`);
        }
      }

      const meta = await this.getTableMetadata(name);
      if (!meta) {
        throw new Error(`Import database gagal: metadata tabel tidak dapat disinkronkan.`);
      }
      return meta;
    } finally {
      connection.release();
    }
  }

  async deleteDynamicTable(tableName: string): Promise<boolean> {
    this.validateIdentifier(tableName);
    await this.pool.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    return true;
  }

  async getTableAnalytics(tableName: string, _customWhere?: any, datasetMode?: string, columnMapping?: any): Promise<any> {
    const meta = await this.getTableMetadata(tableName);
    if (!meta) throw new Error(`Table ${tableName} not found`);

    if (datasetMode === 'DYNAMIC_FLAT_TABLE' && columnMapping) {
      const resolveCol = (mappingField: any) => {
         if (!mappingField) return null;
         if (typeof mappingField === 'string') return mappingField;
         if (typeof mappingField === 'object' && mappingField.column) return mappingField.column;
         return null;
      };

      const groupStatus = (rawStatus: string): 'tuntas' | 'dalamProses' => {
         if (!rawStatus) return 'dalamProses';
         const norm = String(rawStatus).trim().toLowerCase();
         if (['sesuai', 'tptd', 'diusulkan sesuai', 'diusulkan tptd'].includes(norm)) return 'tuntas';
         return 'dalamProses';
      };

      let whereClause = '';
      const queryParams: any[] = [];
      
      if (_customWhere) {
        whereClause = ` WHERE ${_customWhere.sql}`;
        if (_customWhere.values) {
          queryParams.push(..._customWhere.values);
        }
      }

      // 1. Raw Rows
      const [rTot] = await this.pool.query(`SELECT COUNT(*) as total FROM \`${tableName}\` ${whereClause}`, queryParams);
      const rawRows = Number((rTot as any[])[0].total || 0);

      // 2. Distinct LHP
      let totalLhp = 0;
      const lhpCol = resolveCol(columnMapping.lhp);
      if (lhpCol) {
         const [r] = await this.pool.query(`SELECT COUNT(DISTINCT \`${lhpCol}\`) as total FROM \`${tableName}\` ${whereClause}`, queryParams);
         totalLhp = Number((r as any[])[0].total || 0);
      }

      // 3. Distinct Finding (THE SINGLE SOURCE OF TRUTH)
      let totalFindings = 0;
      const fCol = resolveCol(columnMapping.finding);
      if (fCol) {
         const [r] = await this.pool.query(`SELECT COUNT(DISTINCT \`${fCol}\`) as total FROM \`${tableName}\` ${whereClause}`, queryParams);
         totalFindings = Number((r as any[])[0].total || 0);
      }

      // 4. Distinct Recommendation
      let totalRekomendasi = 0;
      const rCol = resolveCol(columnMapping.recommendation);
      if (rCol) {
         const [r] = await this.pool.query(`SELECT COUNT(DISTINCT \`${rCol}\`) as total FROM \`${tableName}\` ${whereClause}`, queryParams);
         totalRekomendasi = Number((r as any[])[0].total || 0);
      }

      // 5. Total Rekomendasi Nilai
      let totalRekomendasiNilai: number | null = null;
      const valCol = resolveCol(columnMapping.recommendation_value);
      if (valCol) {
         try {
             const [rVal] = await this.pool.query(`SELECT SUM(CAST(\`${valCol}\` AS DECIMAL(20,2))) as totalVal FROM \`${tableName}\` ${whereClause}`, queryParams);
             totalRekomendasiNilai = Number((rVal as any[])[0].totalVal || 0);
         } catch(e) { totalRekomendasiNilai = null; }
      }

      // 6. Dynamic Pie Chart Status (Status Rekomendasi)
      let dynamicStatuses: any[] = [];
      let statusDistribution: any = {};
      let statusSummary = { tuntas: 0, dalamProses: 0, total: 0 };
      
      const sCol = resolveCol(columnMapping.status);
      const entityCol = rCol || fCol; // Group by recommendation if available, else finding
      
      if (sCol && entityCol) {
         const countQuery = `
           SELECT final_status, COUNT(*) as count FROM (
             SELECT \`${entityCol}\`, MAX(\`${sCol}\`) as final_status
             FROM \`${tableName}\` ${whereClause}
             GROUP BY \`${entityCol}\`
           ) t GROUP BY final_status
         `;
         const [stRows] = await this.pool.query(countQuery, queryParams);
         dynamicStatuses = (stRows as any[]).map(r => ({
           name: r.final_status || 'Unknown',
           value: Number(r.count)
         }));
         
         dynamicStatuses.forEach(s => {
             statusDistribution[s.name] = s.value;
             const group = groupStatus(s.name);
             if (group === 'tuntas') {
               statusSummary.tuntas += s.value;
             } else {
               statusSummary.dalamProses += s.value;
             }
             statusSummary.total += s.value;
         });
      }

      // 7. Trend Temuan (MAX period per finding)
      let trendData: any[] = [];
      let trendTotal = 0;
      const pCol = resolveCol(columnMapping.period);
      if (pCol && fCol) {
         const trendQuery = `
           SELECT final_period as period_name, COUNT(*) as Temuan
           FROM (
              SELECT \`${fCol}\`, MAX(\`${pCol}\`) as final_period
              FROM \`${tableName}\` ${whereClause}
              GROUP BY \`${fCol}\`
           ) t
           GROUP BY final_period
           ORDER BY final_period ASC LIMIT 20
         `;
         try {
            const [trendRows] = await this.pool.query(trendQuery, queryParams);
            trendData = (trendRows as any[]).filter(r => r.period_name).map(r => {
               trendTotal += Number(r.Temuan || 0);
               return {
                  name: String(r.period_name).substring(0, 15),
                  Temuan: Number(r.Temuan || 0)
               };
            });
         } catch(e) {
            console.error('Failed to generate trendData:', e);
         }
      }

      // 8. Bar Chart Verification & Jenis Data
      let barTotal = 0;
      let distinctJenis = 0;
      let jenisData: any[] = [];

      const typeCol = resolveCol(columnMapping.finding_type) || resolveCol(columnMapping.jenis_pemeriksaan);
      
      if (typeCol && entityCol) {
         // If we have status column, we can do stacked bar
         if (sCol) {
             const typeQuery = `
               SELECT final_type, final_status, COUNT(*) as count
               FROM (
                 SELECT \`${entityCol}\`, MAX(\`${typeCol}\`) as final_type, MAX(\`${sCol}\`) as final_status
                 FROM \`${tableName}\` ${whereClause}
                 GROUP BY \`${entityCol}\`
               ) t
               GROUP BY final_type, final_status
             `;
             try {
                const [typeRows] = await this.pool.query(typeQuery, queryParams);
                const grouped: Record<string, any> = {};
                (typeRows as any[]).forEach(r => {
                   const t = r.final_type || 'Unknown';
                   const rawS = r.final_status || 'Unknown';
                   
                   // Khusus untuk Bar Chart Jenis Pemeriksaan, kita menggunakan logika strict
                   // Tuntas hanya mencakup Sesuai dan TPTD (sesuai referensi UI Kinerja/PDTT 194)
                   const normS = String(rawS).trim().toLowerCase();
                   const isStrictTuntas = ['sesuai', 'tptd'].includes(normS);
                   const gStatus = isStrictTuntas ? 'tuntas' : 'dalamProses';
                   
                   if (!grouped[t]) grouped[t] = { jenis: t, tuntas: 0, dalamProses: 0, total: 0 };
                   
                   if (gStatus === 'tuntas') {
                      grouped[t].tuntas += Number(r.count);
                   } else {
                      grouped[t].dalamProses += Number(r.count);
                   }
                   
                   grouped[t].total += Number(r.count);
                   barTotal += Number(r.count);
                });
                distinctJenis = Object.keys(grouped).length;
                jenisData = Object.values(grouped).sort((a, b) => b.total - a.total);
             } catch(e) { console.error('Failed typeQuery stacked:', e); }
         } else {
             // Fallback if no status column
             const typeQuery = `
               SELECT final_type, COUNT(*) as count
               FROM (
                  SELECT \`${entityCol}\`, MAX(\`${typeCol}\`) as final_type
                  FROM \`${tableName}\` ${whereClause}
                  GROUP BY \`${entityCol}\`
               ) t
               GROUP BY final_type
             `;
             try {
                const [typeRows] = await this.pool.query(typeQuery, queryParams);
                distinctJenis = (typeRows as any[]).length;
                (typeRows as any[]).forEach(r => {
                    barTotal += Number(r.count);
                    jenisData.push({ jenis: r.final_type || 'Unknown', total: Number(r.count), dalamProses: Number(r.count), tuntas: 0 });
                });
             } catch(e) { console.error('Failed typeQuery flat:', e); }
         }
      }

      // Unit in Charge dynamic fetch
      let unitFindingsData: any[] = [];
      const uCol = resolveCol(columnMapping.unit) || resolveCol(columnMapping.unit_access_control);
      
      if (uCol) {
         if (sCol) {
             const unitQuery = `
               SELECT final_unit, COUNT(DISTINCT rekomendasi_id) as count,
               SUM(CASE WHEN final_status IN ('Sesuai', 'TPTD', 'Diusulkan Sesuai', 'Diusulkan TPTD') THEN 1 ELSE 0 END) as tuntas,
               SUM(CASE WHEN final_status = 'Dalam Proses' THEN 1 ELSE 0 END) as dalamProses,
               SUM(CASE WHEN final_status IN ('Belum Tindaklanjut', 'Belum Tindak Lanjut') THEN 1 ELSE 0 END) as belum
               FROM (
                 SELECT \`${rCol}\` as rekomendasi_id, MAX(\`${uCol}\`) as final_unit, MAX(\`${sCol}\`) as final_status
                 FROM \`${tableName}\` ${whereClause}
                 GROUP BY \`${rCol}\`
               ) t GROUP BY final_unit ORDER BY final_unit ASC
             `;
             try {
                 const [uRows] = await this.pool.query(unitQuery, queryParams);
                 unitFindingsData = (uRows as any[]).map(r => ({
                     name: r.final_unit || 'Unknown',
                     Rekomendasi: Number(r.count),
                     tuntas: Number(r.tuntas || 0),
                     dalamProses: Number(r.dalamProses || 0),
                     belum: Number(r.belum || 0)
                 }));
             } catch(e) { console.error('Failed unitQuery with status:', e); }
         } else {
             const unitQuery = `
               SELECT \`${uCol}\` as final_unit, COUNT(DISTINCT \`${rCol}\`) as count
               FROM \`${tableName}\` ${whereClause}
               GROUP BY \`${uCol}\`
               ORDER BY final_unit ASC
             `;
             try {
                 const [uRows] = await this.pool.query(unitQuery, queryParams);
                 unitFindingsData = (uRows as any[]).map(r => ({
                     name: r.final_unit || 'Unknown',
                     Rekomendasi: Number(r.count)
                 }));
             } catch(e) { console.error('Failed unitQuery:', e); }
         }
      }

      return {
        totalRecords: totalRekomendasi,
        totalLhp: totalLhp > 0 ? totalLhp : null,
        totalFindings: totalFindings,
        totalRekomendasi: totalRekomendasi,
        totalRekomendasiNilai: totalRekomendasiNilai,
        highRiskCount: 0,
        repeatedCount: 0,
        statusDistribution: statusDistribution,
        statusSummary: statusSummary,
        dynamicStatuses: dynamicStatuses,
        jenisData: jenisData,
        unitFindingsData: unitFindingsData,
        trendData: trendData.length > 0 ? trendData : null,
        topUnits: [],
        diagnosticLogs: {
           rawRows: rawRows,
           distinctFinding: totalFindings,
           distinctRekomendasi: totalRekomendasi,
           distinctLhp: totalLhp,
           distinctJenis: distinctJenis,
           pieTotal: statusSummary.total,
           trendTotal: trendTotal,
           barTotal: barTotal
        }
      };
    }

    // LEGACY LOGIC
    const hasStatus = meta.columns.some(c => c.name.toLowerCase() === 'status');
    const { total } = await this.findRecords(tableName, { limit: 1, _customWhere });
    
    let statusDistribution: any = {};
    let dynamicStatuses: any[] = [];
    
    if (hasStatus) {
      let query = `SELECT \`status\`, COUNT(*) as count FROM \`${tableName}\``;
      
      const queryParams: any[] = [];
      if (_customWhere) {
        query += ` WHERE ${_customWhere.sql}`;
        if (_customWhere.values) {
          queryParams.push(..._customWhere.values);
        }
      }
      query += ` GROUP BY \`status\``;
      
      const [rows] = await this.pool.query(query, queryParams);
      dynamicStatuses = (rows as any[]).map(r => ({
          name: r.status || 'Unknown',
          value: Number(r.count)
      }));
      dynamicStatuses.forEach(s => {
          statusDistribution[s.name] = s.value;
      });
    }

    return {
      totalRecords: total,
      highRiskCount: 0,
      repeatedCount: 0,
      statusDistribution: statusDistribution,
      statusSummary: { tuntas: 0, dalamProses: 0, total: 0 },
      dynamicStatuses: dynamicStatuses,
      jenisData: [],
      unitFindingsData: [],
      topUnits: []
    };
  }

  async executeRawUnsafe(sql: string, params?: any[]): Promise<any> {
    const [rows] = await this.pool.query(sql, params);
    return rows;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.pool.query('SELECT 1');
      return { success: true, message: 'Connected to MySQL successfully.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  async initializeSchema(): Promise<{ success: boolean; message: string }> {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS sys_datasets (
          id VARCHAR(100) PRIMARY KEY,
          dataset_name VARCHAR(255) NOT NULL,
          dataset_mode VARCHAR(50) NOT NULL DEFAULT 'DYNAMIC_FLAT_TABLE',
          table_name VARCHAR(255) NULL,
          legacy_config JSON NULL,
          column_mapping JSON NULL,
          is_active TINYINT(1) DEFAULT 0,
          status VARCHAR(50) DEFAULT 'READY',
          version INT DEFAULT 1,
          imported_by VARCHAR(100),
          imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          activated_by VARCHAR(100),
          activated_at DATETIME,
          updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;
      await this.pool.query(createTableQuery);

      const [rows] = await this.pool.query('SELECT COUNT(*) as count FROM sys_datasets WHERE dataset_mode = "LEGACY_RELATIONAL"') as any[];
      if (rows[0].count === 0) {
        const legacyConfig = JSON.stringify({
          tables: {
            lhp: "lhp",
            temuan: "temuan",
            rekomendasi: "rekomendasi",
            temuan_pengawasan: "temuan_pengawasan"
          }
        });
        await this.pool.query(`
          INSERT INTO sys_datasets (id, dataset_name, dataset_mode, legacy_config, is_active, status, imported_by) 
          VALUES ('ds_legacy_default', 'Legacy Default Dataset', 'LEGACY_RELATIONAL', ?, 1, 'ACTIVE', 'system')
        `, [legacyConfig]);
      }
      return { success: true, message: 'Schema initialization successful including sys_datasets.' };
    } catch (err: any) {
      console.error('Failed to initialize schema:', err);
      return { success: false, message: err.message };
    }
  }

  // --- Unimplemented System Registries (Proxy to Sandbox) ---
  private get sandboxClient() {
    const { getDbClient } = require('../index');
    return getDbClient('sandbox', null, true);
  }

  get importHistory() { return this.sandboxClient.importHistory; }
  get auditLogs() { return this.sandboxClient.auditLogs; }

  get users() {
    const self = this;
    return {
      async findByUsername(username: string) {
        try {
          // Attempt to query sys_users table natively in MySQL
          const [rows] = await self.pool.query(
            `SELECT u.*, un.kode_unit 
             FROM sys_users u 
             LEFT JOIN sys_units un ON u.unit_id = un.id 
             WHERE LOWER(u.username) = LOWER(?) LIMIT 1`,
            [username.trim()]
          );
          const users = rows as any[];
          if (users.length > 0) {
            const row = users[0];
            return {
              id: row.id,
              username: row.username,
              passwordHash: row.password_hash,
              role: row.role,
              unitId: row.unit_id,
              unitKode: row.kode_unit,
              accessScope: row.access_scope,
              isActive: row.is_active
            };
          }
          return null;
        } catch (e: any) {
          // Fallback to Sandbox if sys_users does not exist yet
          if (e.code === 'ER_NO_SUCH_TABLE') {
            return self.sandboxClient.users.findByUsername(username);
          }
          throw e;
        }
      },
      async create(data: any) {
        return self.sandboxClient.users.create(data);
      },
      async findMany() {
        return self.sandboxClient.users.findMany();
      },
      async updateProfile(userId: any, profileData: any) {
        return self.sandboxClient.users.updateProfile(userId, profileData);
      },
      async findById(id: any) {
        return self.sandboxClient.users.findById(id);
      },
      async updatePassword(userId: any, newPasswordHash: any) {
        return self.sandboxClient.users.updatePassword(userId, newPasswordHash);
      },
      async deleteUser(userId: any) {
        return self.sandboxClient.users.deleteUser ? self.sandboxClient.users.deleteUser(userId) : self.sandboxClient.users.delete(userId);
      }
    };
  }

  get dashboardWidgets() { return this.sandboxClient.dashboardWidgets; }
  get accessRequests() { return this.sandboxClient.accessRequests; }
  get pipelineJobs() { return this.sandboxClient.pipelineJobs; }
  get presenceLocks() { return this.sandboxClient.presenceLocks; }
  get approvals() { return this.sandboxClient.approvals; }
  get activityFeed() { return this.sandboxClient.activityFeed; }
  get notifications() { return this.sandboxClient.notifications; }
  get workspaces() { return this.sandboxClient.workspaces; }
  get datasets() { 
    const self = this;
    return {
      async findMany(workspaceId?: string) {
        try {
          const tables = await self.listTables();
          return tables.map(t => ({
            id: `ds_${t.name}`,
            displayName: t.displayName || t.name,
            physicalTable: t.name,
            category: 'MySQL Source',
            workspaceId: 'default',
            rowCount: t.rowCount || 0,
            qualityScore: t.qualityScore || 100,
            createdAt: t.createdAt
          }));
        } catch (e) {
          console.error('[MySQLAdapter] Failed to dynamically discover datasets from tables:', e);
          return [];
        }
      },
      async findById(id: string) {
        const all = await this.findMany();
        return all.find(d => d.id === id) || null;
      },
      async findByPhysicalTable(physicalTable: string) {
        const all = await this.findMany();
        return all.find(d => d.physicalTable === physicalTable) || null;
      },
      create: self.sandboxClient.datasets.create,
      updateRowCount: self.sandboxClient.datasets.updateRowCount,
      delete: self.sandboxClient.datasets.delete,
      clearAll: self.sandboxClient.datasets.clearAll
    };
  }
  get relationships() { return this.sandboxClient.relationships; }
  get views() { return this.sandboxClient.views; }
  get permissions() { return this.sandboxClient.permissions; }
}
