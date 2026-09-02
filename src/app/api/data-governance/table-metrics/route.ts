import { NextRequest } from 'next/server';
import { getDbClient } from '@/db';
import { withAuth } from '@/backend/lib/auth';

export const GET = withAuth(async (request, user) => { 
  try {
    const searchParams = new URL(request.url).searchParams;
    const tableName = searchParams.get('table');

    if (!tableName) {
      return Response.json({ success: false, message: 'Table name is required' }, { status: 400 });
    }

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const isSandbox = dbType === 'sandbox' && process.env.DB_DRIVER !== 'mysql';

    if (isSandbox) {
      // Mock return for sandbox mode
      return Response.json({
        success: true,
        data: {
          metrics: {
            totalRecords: 1200,
            validRecords: 1150,
            duplicates: 30,
            missingValues: 20,
            healthScore: 96
          },
          metadata: [
            { name: 'id', type: 'INT', isNullable: 'NO', key: 'PRI' },
            { name: 'nama_tabel_mock', type: 'VARCHAR', isNullable: 'YES', key: '' }
          ],
          lineage: {
            upstream: [],
            downstream: []
          }
        }
      });
    }

    // 1. Fetch Metadata (Columns)
    const columnsRes = await db.executeRawUnsafe(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_COMMENT 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = ?
      ORDER BY ORDINAL_POSITION
    `, [tableName]);

    if (!columnsRes || columnsRes.length === 0) {
      return Response.json({ success: false, message: 'Table not found or no columns' }, { status: 404 });
    }

    // 2. Metrics
    let totalRecords = 0;
    let missingValues = 0;
    let duplicates = 0;

    try {
      // Total records
      const totalRes = await db.executeRawUnsafe(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      totalRecords = Number(totalRes[0]?.count || 0);

      if (totalRecords > 0) {
        // Find columns to check for nulls and duplicates (heuristic: skip PK and timestamps, pick up to 5)
        const skipPatterns = ['id', 'created', 'updated', 'deleted'];
        const candidateColumns = columnsRes
          .map((c: any) => c.COLUMN_NAME)
          .filter((c: string) => !skipPatterns.some(p => c.toLowerCase().includes(p)))
          .slice(0, 5);

        // If no candidate columns, just use whatever isn't a PK
        const targetColumns = candidateColumns.length > 0 
          ? candidateColumns 
          : columnsRes.filter((c: any) => c.COLUMN_KEY !== 'PRI').map((c: any) => c.COLUMN_NAME).slice(0, 5);

        if (targetColumns.length > 0) {
          // Check Nulls
          const nullSelects = targetColumns.map((c: string) => `SUM(CASE WHEN \`${c}\` IS NULL THEN 1 ELSE 0 END) as \`null_${c}\``).join(', ');
          const nullRes = await db.executeRawUnsafe(`SELECT ${nullSelects} FROM \`${tableName}\``);
          if (nullRes && nullRes[0]) {
            Object.values(nullRes[0]).forEach((val: any) => {
              missingValues += Number(val || 0);
            });
          }

          // Check Duplicates
          const groupCols = targetColumns.map((c: string) => `\`${c}\``).join(', ');
          const dupRes = await db.executeRawUnsafe(`
            SELECT SUM(dup_count - 1) as total_duplicates
            FROM (
              SELECT COUNT(*) as dup_count
              FROM \`${tableName}\`
              GROUP BY ${groupCols}
              HAVING COUNT(*) > 1
            ) as sub
          `);
          duplicates = Number(dupRes[0]?.total_duplicates || 0);
        }
      }
    } catch (e: any) {
      console.error('Error calculating metrics:', e.message);
      // fallback metrics if query fails
    }

    const maxMissingPossible = totalRecords * columnsRes.length;
    const errorCount = missingValues; // Simplification
    let healthScore = 100;
    if (totalRecords > 0 && maxMissingPossible > 0) {
      healthScore = Number((((maxMissingPossible - errorCount) / maxMissingPossible) * 100).toFixed(1));
    }
    const validRecords = Math.max(0, totalRecords - duplicates);

    // 3. Lineage (Foreign Keys)
    let upstream = [];
    let downstream = [];
    try {
      // Tables this table depends on (Upstream)
      const upstreamRes = await db.executeRawUnsafe(`
        SELECT REFERENCED_TABLE_NAME as referenced_table, COLUMN_NAME as column_name
        FROM information_schema.key_column_usage
        WHERE table_schema = DATABASE() AND table_name = ? AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [tableName]);
      upstream = upstreamRes.map((r: any) => ({ table: r.referenced_table, column: r.column_name }));

      // Tables that depend on this table (Downstream)
      const downstreamRes = await db.executeRawUnsafe(`
        SELECT TABLE_NAME as referencing_table, COLUMN_NAME as column_name
        FROM information_schema.key_column_usage
        WHERE table_schema = DATABASE() AND REFERENCED_TABLE_NAME = ?
      `, [tableName]);
      downstream = downstreamRes.map((r: any) => ({ table: r.referencing_table, column: r.column_name }));
    } catch (e) {
      console.error('Error fetching lineage:', e);
    }

    return Response.json({
      success: true,
      data: {
        metrics: {
          totalRecords,
          validRecords,
          duplicates,
          missingValues,
          healthScore
        },
        metadata: columnsRes.map((c: any) => ({
          name: c.COLUMN_NAME,
          type: c.DATA_TYPE,
          isNullable: c.IS_NULLABLE,
          key: c.COLUMN_KEY,
          comment: c.COLUMN_COMMENT
        })),
        lineage: {
          upstream,
          downstream
        }
      }
    });

  } catch (error: any) {
    return Response.json(
      { success: false, message: error.message || 'Failed to fetch table metrics.' },
      { status: 500 }
    );
  }
});
