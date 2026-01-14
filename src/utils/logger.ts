/**
 * Logger utility using Bun's native capabilities
 * No external dependencies!
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

class Logger {
  private level: LogLevel = LogLevel.INFO;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`${colors.gray}[DEBUG] ${message}${colors.reset}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`${colors.blue}[INFO] ${message}${colors.reset}`, ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`${colors.green}✓ ${message}${colors.reset}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`${colors.yellow}[WARN] ${message}${colors.reset}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`${colors.red}✗ ${message}${colors.reset}`, ...args);
    }
  }

  raw(message: string, ...args: any[]): void {
    console.log(message, ...args);
  }
}

export const logger = new Logger();
