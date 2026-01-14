/**
 * Backup Progress Screen - Live backup progress with animations
 */

import { 
  BoxRenderable,
  TextRenderable,
  type CliRenderer 
} from '@opentui/core';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ProgressBar } from '../components/ProgressBar';
import { theme } from '../utils/theme';
import type { NavigationManager } from '../utils/navigation';
import type { Account, ExportFormat } from '../../types';
import { getProviderForAccount } from '../../provider-factory';
import { getConfigManager } from '../../utils/config';
import { MboxExporter } from '../../exporters/mbox';
import { EmlExporter, JsonExporter } from '../../exporters/eml';
import * as fs from 'fs';

export interface BackupStats {
  totalMessages: number;
  processedMessages: number;
  currentFolder: string;
  startTime: number;
  backupSize: number;
  folderStats: Map<string, { messages: number; size: number }>;
}

export class BackupProgressScreen {
  private renderer: CliRenderer;
  private navigation: NavigationManager;
  private container: BoxRenderable;
  private header: Header;
  private footer: Footer;
  private overallProgress: ProgressBar;
  private folderProgress: ProgressBar;
  private statusText: TextRenderable;
  private statsText: TextRenderable;
  
  private account: Account;
  private folders: string[];
  private formats: ExportFormat[];
  private outputDir: string;
  private stats: BackupStats;
  private cancelled = false;

  constructor(renderer: CliRenderer, navigation: NavigationManager, data?: any) {
    this.renderer = renderer;
    this.navigation = navigation;
    this.account = data?.account;
    this.folders = data?.folders || [];
    this.formats = data?.formats || ['mbox'];
    this.outputDir = data?.outputDir || './email-backups';

    this.stats = {
      totalMessages: 0,
      processedMessages: 0,
      currentFolder: '',
      startTime: Date.now(),
      backupSize: 0,
      folderStats: new Map(),
    };

    // Create container
    this.container = new BoxRenderable(renderer, {
      id: 'backup-progress-container',
      width: '100%',
      height: '100%',
      position: 'relative',
    });

    // Create header
    this.header = new Header(renderer, {
      title: 'Backup in Progress',
      subtitle: `Account: ${this.account.email}`,
    });
    this.container.add(this.header.getContainer());

    // Overall progress bar
    this.overallProgress = new ProgressBar(renderer, {
      label: 'Overall Progress',
      current: 0,
      total: 100,
      width: 50,
    });
    const overallContainer = this.overallProgress.getContainer();
    overallContainer.top = 8;
    overallContainer.left = 10;
    this.container.add(overallContainer);

    // Folder progress bar
    this.folderProgress = new ProgressBar(renderer, {
      label: 'Current Folder',
      current: 0,
      total: 100,
      width: 50,
    });
    const folderContainer = this.folderProgress.getContainer();
    folderContainer.top = 13;
    folderContainer.left = 10;
    this.container.add(folderContainer);

    // Status text
    this.statusText = new TextRenderable(renderer, {
      id: 'status',
      content: 'Initializing backup...',
      fg: theme.colors.info,
      position: 'relative',
      left: 10,
      top: 18,
    });
    this.container.add(this.statusText);

    // Stats text
    this.statsText = new TextRenderable(renderer, {
      id: 'stats',
      content: '',
      fg: theme.colors.textDim,
      position: 'relative',
      left: 10,
      top: 22,
    });
    this.container.add(this.statsText);

    // Create footer
    this.footer = new Footer(renderer, {
      shortcuts: [
        { key: 'Ctrl+C', description: 'Cancel' },
      ],
    });
    this.container.add(this.footer.getContainer());

    // Handle keyboard shortcuts
    this.renderer.keyInput.on('keypress', (key) => {
      if (key.ctrl && key.name === 'c') {
        this.cancelled = true;
        this.statusText.content = 'Cancelling backup...';
        this.statusText.fg = theme.colors.warning;
      }
    });

    // Start backup automatically
    this.startBackup();
  }

  private async startBackup() {
    try {
      const config = getConfigManager();
      const credentials = await config.loadCredentials(this.account.id);
      const provider = getProviderForAccount(this.account, credentials);

      await provider.connect();

      // Create output directory with timestamp
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const backupDir = `${this.outputDir}/${timestamp}`;
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      this.statusText.content = `Backup location: ${backupDir}`;

      let totalProcessed = 0;
      let folderIndex = 0;

      for (const folderPath of this.folders) {
        if (this.cancelled) break;

        folderIndex++;
        this.stats.currentFolder = folderPath;
        this.folderProgress.update(0, 100, `Processing: ${folderPath}`);

        // Get messages
        const messages = await provider.getMessages(folderPath, 0);
        const messageCount = messages.length;

        if (messageCount === 0) continue;

        // Export messages
        for (const format of this.formats) {
          if (this.cancelled) break;

          if (format === 'mbox') {
            const mboxExporter = new MboxExporter();
            const mboxPath = `${backupDir}/${folderPath.replace(/[\/\\]/g, '_')}.mbox`;
            await mboxExporter.export(messages, mboxPath);
            const size = fs.statSync(mboxPath).size;
            this.stats.backupSize += size;
          }

          if (format === 'eml') {
            const emlExporter = new EmlExporter();
            const emlDir = `${backupDir}/eml/${folderPath}`;
            if (!fs.existsSync(emlDir)) {
              fs.mkdirSync(emlDir, { recursive: true });
            }
            await emlExporter.export(messages, emlDir);
          }

          if (format === 'json') {
            const jsonExporter = new JsonExporter();
            const jsonPath = `${backupDir}/${folderPath.replace(/[\/\\]/g, '_')}.json`;
            await jsonExporter.export(messages, jsonPath);
            const size = fs.statSync(jsonPath).size;
            this.stats.backupSize += size;
          }
        }

        this.stats.folderStats.set(folderPath, { messages: messageCount, size: 0 });
        totalProcessed += messageCount;
        this.stats.processedMessages = totalProcessed;

        // Update progress
        const overallPercent = ((folderIndex / this.folders.length) * 100);
        this.overallProgress.update(folderIndex, this.folders.length);
        this.folderProgress.update(100, 100, `Completed: ${folderPath}`);
        
        this.updateStats();
      }

      await provider.disconnect();

      if (!this.cancelled) {
        // Create summary
        const summary = {
          timestamp: new Date().toISOString(),
          account: this.account.email,
          totalFolders: this.folders.length,
          totalMessages: totalProcessed,
          folders: Array.from(this.stats.folderStats.entries()).map(([folder, stats]) => ({
            folder,
            ...stats
          })),
          duration: ((Date.now() - this.stats.startTime) / 1000).toFixed(2) + 's',
        };

        const summaryPath = `${backupDir}/BACKUP_SUMMARY.json`;
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

        // Navigate to summary screen
        this.navigation.replace('backup-summary', {
          summary,
          backupDir,
        });
      }
    } catch (error) {
      this.statusText.content = `Error: ${error}`;
      this.statusText.fg = theme.colors.error;
    }
  }

  private updateStats() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const speed = this.stats.processedMessages / elapsed;
    const sizeInMB = (this.stats.backupSize / (1024 * 1024)).toFixed(2);

    this.statsText.content = `Processed: ${this.stats.processedMessages} messages\nBackup Size: ${sizeInMB} MB\nSpeed: ${speed.toFixed(1)} msgs/sec\nElapsed: ${elapsed.toFixed(0)}s`;
  }

  show() {
    this.renderer.root.add(this.container);
  }

  hide() {
    this.renderer.root.remove(this.container.id);
  }

  destroy() {
    this.header.destroy();
    this.footer.destroy();
    this.overallProgress.destroy();
    this.folderProgress.destroy();
    this.statusText.destroy();
    this.statsText.destroy();
    this.container.destroy();
  }
}
