/**
 * Progress tracking using Bun's native capabilities
 * No external dependencies!
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

// ANSI control codes
const clearLine = '\x1b[2K';
const cursorLeft = '\x1b[0G';

export class ProgressTracker {
  private currentMessage: string = '';
  private spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;
  private intervalId: Timer | null = null;
  private isActive = false;

  start(message: string): void {
    this.currentMessage = message;
    this.isActive = true;
    this.currentFrame = 0;

    // Start spinner animation
    this.intervalId = setInterval(() => {
      if (this.isActive) {
        const frame = this.spinnerFrames[this.currentFrame];
        process.stdout.write(`${clearLine}${cursorLeft}${colors.cyan}${frame}${colors.reset} ${this.currentMessage}`);
        this.currentFrame = (this.currentFrame + 1) % this.spinnerFrames.length;
      }
    }, 80);
  }

  update(message: string): void {
    this.currentMessage = message;
  }

  updateProgress(current: number, total: number, message?: string): void {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    const progressBar = this.createProgressBar(percentage);
    const text = message 
      ? `${message} ${progressBar} ${current}/${total} (${percentage}%)`
      : `${progressBar} ${current}/${total} (${percentage}%)`;
    
    this.currentMessage = text;
  }

  succeed(message?: string): void {
    this.stop();
    const msg = message || this.currentMessage;
    console.log(`${clearLine}${cursorLeft}${colors.green}✓${colors.reset} ${msg}`);
  }

  fail(message?: string): void {
    this.stop();
    const msg = message || this.currentMessage;
    console.log(`${clearLine}${cursorLeft}${colors.red}✗${colors.reset} ${msg}`);
  }

  warn(message?: string): void {
    this.stop();
    const msg = message || this.currentMessage;
    console.log(`${clearLine}${cursorLeft}${colors.yellow}⚠${colors.reset} ${msg}`);
  }

  info(message?: string): void {
    this.stop();
    const msg = message || this.currentMessage;
    console.log(`${clearLine}${cursorLeft}${colors.blue}ℹ${colors.reset} ${msg}`);
  }

  stop(): void {
    this.isActive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    process.stdout.write(`${clearLine}${cursorLeft}`);
  }

  private createProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return `${colors.cyan}[${'█'.repeat(filled)}${'░'.repeat(empty)}]${colors.reset}`;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
