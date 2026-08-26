import dotenv from 'dotenv';
import path from 'path';

// Auto-detect if executed via a test runner or scripts
const isTestEnv = process.env.NODE_ENV === 'test' || 
                  (process.argv && process.argv.some(arg => arg.includes('test') || arg.includes('run_tests')));

if (isTestEnv && !process.env.NODE_ENV) {
  (process.env as any).NODE_ENV = 'test';
}

// Fallback for non-Next.js environments (like tsx test runs or DB scripts)
const isNextJs = typeof process.env.NEXT_PHASE !== 'undefined' || typeof process.env.NEXT_RUNTIME !== 'undefined';
if (!isNextJs) {
  try {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  } catch (e) {
    // Fail silently
  }
}

interface Config {
  /**
   * Node environment state ('development' | 'production' | 'test')
   * Required: Yes
   * Default: 'development'
   */
  readonly nodeEnv: 'development' | 'production' | 'test';

  /**
   * Database URL for database server connections
   * Required: Yes
   */
  readonly databaseUrl: string;

  /**
   * Secret key used for signing and verifying JWT tokens
   * Required: Yes
   */
  readonly jwtSecret: string;

  /**
   * Default AI service provider ('gemini' | 'openai')
   * Required: No
   * Default: 'gemini'
   */
  readonly aiProvider: string;

  /**
   * API Key for OpenAI service integration
   * Required: No
   */
  readonly openaiApiKey?: string;

  /**
   * API Key for Google Gemini service integration
   * Required: No
   */
  readonly geminiApiKey?: string;

  /**
   * Port number the application server listens on
   * Required: No
   * Default: 3000
   */
  readonly port: number;

  /**
   * Severity level filter for application logs
   * Required: No
   * Default: 'info'
   */
  readonly logLevel: string;

  /** Helper getters checking environment state */
  readonly isDevelopment: boolean;
  readonly isProduction: boolean;
  readonly isTest: boolean;
}

const rawConfig = {
  get nodeEnv(): 'development' | 'production' | 'test' {
    return (process.env.NODE_ENV as any) || 'development';
  },
  get databaseUrl(): string {
    return process.env.DATABASE_URL || '';
  },
  get jwtSecret(): string {
    return process.env.JWT_SECRET || '';
  },
  get aiProvider(): string {
    return process.env.AI_PROVIDER || 'gemini';
  },
  get openaiApiKey(): string | undefined {
    return process.env.OPENAI_API_KEY;
  },
  get geminiApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY;
  },
  get port(): number {
    return process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  },
  get logLevel(): string {
    return process.env.LOG_LEVEL || 'info';
  },
  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  },
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  },
  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }
};

let validated = false;

function validateConfig() {
  // Do NOT validate or throw errors during Next.js static build phase
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || process.env.IS_BUILDING === 'true';
  if (isBuildPhase) return;

  // We also don't enforce validation in test environment to maintain compatibility with test suites
  const env = process.env.NODE_ENV || 'development';
  if (env === 'test') {
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }
}

export function ensureConfigValidated() {
  if (validated) return;
  validateConfig();
  validated = true;
}

Object.freeze(rawConfig);

export const config = rawConfig as unknown as Config;
