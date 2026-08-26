import Papa from 'papaparse';

export interface CsvRow {
  Season: string;
  EpisodeTitle: string;
  About: string;
  Ratings: string;
  Votes: string;
  Viewership: string;
  Duration: string;
  Date: string;
  GuestStars: string;
  Director: string;
  Writers: string;
  [key: string]: string;
}

export interface ParseResult {
  headers: string[];
  rows: CsvRow[];
  validation: {
    isValid: boolean;
    missingColumns: string[];
    presentColumns: string[];
  };
  statistics: {
    totalRecords: number;
    duplicateRecords: number;
    missingValuesCount: number;
    missingValuesByColumn: Record<string, number>;
    completenessPercentage: number;
  };
}

const REQUIRED_COLUMNS = [
  'Season',
  'EpisodeTitle',
  'About',
  'Ratings',
  'Votes',
  'Viewership',
  'Duration',
  'Date',
  'Director',
  'Writers'
];

export function parseCsvFile(fileText: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(fileText, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const headers = results.meta.fields || [];
        
        // Clean headers (remove leading/trailing spaces and empty column name)
        const cleanedHeaders = headers.map(h => h.trim()).filter(h => h !== '');

        // Map raw row fields
        const rows = (results.data as any[]).map((row) => {
          const cleanedRow: any = {};
          Object.keys(row).forEach((key) => {
            const trimmedKey = key.trim();
            if (trimmedKey !== '') {
              cleanedRow[trimmedKey] = row[key] ? String(row[key]).trim() : '';
            }
          });
          return cleanedRow as CsvRow;
        });

        // Validate columns
        const missingColumns = REQUIRED_COLUMNS.filter(
          (col) => !cleanedHeaders.some(h => h.toLowerCase() === col.toLowerCase())
        );
        const isValid = missingColumns.length === 0;

        // Statistics
        let duplicateRecords = 0;
        let missingValuesCount = 0;
        const missingValuesByColumn: Record<string, number> = {};
        
        // Initialize column missing counters
        REQUIRED_COLUMNS.forEach(col => {
          missingValuesByColumn[col] = 0;
        });

        const seenKeys = new Set<string>();

        rows.forEach((row) => {
          // 1. Detect duplicates based on Season + EpisodeTitle
          const seasonVal = row['Season'] || '';
          const titleVal = row['EpisodeTitle'] || '';
          const dupKey = `${seasonVal.trim()}_${titleVal.trim().toLowerCase()}`;
          if (dupKey && seenKeys.has(dupKey)) {
            duplicateRecords++;
          } else {
            seenKeys.add(dupKey);
          }

          // 2. Detect missing values across required columns
          REQUIRED_COLUMNS.forEach((col) => {
            // Find key in row (case insensitive)
            const rowKey = Object.keys(row).find(k => k.toLowerCase() === col.toLowerCase()) || col;
            const val = row[rowKey];
            if (val === undefined || val === null || val === '') {
              missingValuesCount++;
              missingValuesByColumn[col] = (missingValuesByColumn[col] || 0) + 1;
            }
          });
        });

        // Calculate completeness
        const totalExpectedCells = rows.length * REQUIRED_COLUMNS.length;
        const actualDataCells = totalExpectedCells - missingValuesCount;
        const completenessPercentage = totalExpectedCells > 0 
          ? Math.round((actualDataCells / totalExpectedCells) * 100) 
          : 100;

        resolve({
          headers: cleanedHeaders,
          rows,
          validation: {
            isValid,
            missingColumns,
            presentColumns: cleanedHeaders,
          },
          statistics: {
            totalRecords: rows.length,
            duplicateRecords,
            missingValuesCount,
            missingValuesByColumn,
            completenessPercentage,
          },
        });
      },
      error: (err: any) => {
        reject(err);
      }
    });
  });
}

// Convert frontend CSV model to Database model
export function sanitizeAndFormatRow(row: CsvRow): any {
  // Find key case-insensitively helper
  const getVal = (colName: string): string => {
    const key = Object.keys(row).find(k => k.toLowerCase() === colName.toLowerCase()) || colName;
    return row[key] || '';
  };

  const rawDate = getVal('Date');
  let releaseDate: Date | null = null;
  if (rawDate) {
    const parsed = Date.parse(rawDate);
    if (!isNaN(parsed)) {
      releaseDate = new Date(parsed);
    }
  }

  return {
    season: parseInt(getVal('Season') || '0', 10),
    title: getVal('EpisodeTitle') || 'Untitled',
    summary: getVal('About') || '',
    rating: parseFloat(getVal('Ratings') || '0'),
    votes: parseInt(getVal('Votes') || '0', 10),
    viewership: parseFloat(getVal('Viewership') || '0'),
    duration: parseInt(getVal('Duration') || '0', 10),
    releaseDate: releaseDate,
    guestStars: getVal('GuestStars') || null,
    director: getVal('Director') || 'Unknown',
    writers: getVal('Writers') || 'Unknown',
  };
}
