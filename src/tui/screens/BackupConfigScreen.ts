/**
 * Backup Configuration Screen - Select folders, formats, and export location
 */

import { 
  BoxRenderable,
  TextRenderable,
  SelectRenderable,
  SelectRenderableEvents,
  InputRenderable,
  InputRenderableEvents,
  type CliRenderer 
} from '@opentui/core';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { theme } from '../utils/theme';
import type { NavigationManager } from '../utils/navigation';
import type { Account, ExportFormat, Folder } from '../../types';
import { getProviderForAccount } from '../../provider-factory';
import { getConfigManager } from '../../utils/config';
import * as fs from 'fs';
import { homedir } from 'os';

enum ConfigStep {
  LOADING_FOLDERS = 'loading_folders',
  SELECT_EXPORT_LOCATION = 'select_export_location',
  SELECT_FORMATS = 'select_formats',
  CONFIRM = 'confirm',
  ERROR = 'error',
}

export class BackupConfigScreen {
  private renderer: CliRenderer;
  private navigation: NavigationManager;
  private container: BoxRenderable;
  private header: Header;
  private footer: Footer;
  private account: Account;
  private folders: Folder[] = [];
  private selectedFolders: Set<string> = new Set();
  private selectedFormats: Set<ExportFormat> = new Set(['mbox', 'eml', 'json']);
  private exportLocation = './email-backups';
  private currentStep: ConfigStep = ConfigStep.LOADING_FOLDERS;
  
  // UI elements
  private contentContainer: BoxRenderable;
  private statusText?: TextRenderable;
  private locationMenu?: SelectRenderable;
  private formatMenu?: SelectRenderable;
  private locationInput?: InputRenderable;
  private confirmMenu?: SelectRenderable;

  constructor(renderer: CliRenderer, navigation: NavigationManager, data?: any) {
    this.renderer = renderer;
    this.navigation = navigation;
    this.account = data?.account;

    if (!this.account) {
      throw new Error('No account provided');
    }

    // Create container
    this.container = new BoxRenderable(renderer, {
      id: 'backup-config-container',
      width: '100%',
      height: '100%',
      position: 'relative',
    });

    // Create header
    this.header = new Header(renderer, {
      title: '⚙️ Configure Backup',
      subtitle: `Account: ${this.account.email}`,
    });
    this.container.add(this.header.getContainer());

    // Create content container
    this.contentContainer = new BoxRenderable(renderer, {
      id: 'content-container',
      width: '100%',
      height: 'auto',
      position: 'relative',
      top: 8,
      left: 0,
    });
    this.container.add(this.contentContainer);

    // Create footer
    this.footer = new Footer(renderer, {
      shortcuts: [
        { key: 'Enter', description: 'Continue' },
        { key: 'Esc', description: 'Back' },
      ],
    });
    this.container.add(this.footer.getContainer());

    // Handle keyboard shortcuts
    this.renderer.keyInput.on('keypress', (key) => {
      if (key.name === 'escape') {
        this.navigation.back();
      }
    });

    // Start loading folders
    this.loadFolders();
  }

  private clearContent() {
    const children = this.contentContainer.getChildren();
    children.forEach(child => {
      this.contentContainer.remove(child.id);
    });
    
    this.statusText = undefined;
    this.locationMenu = undefined;
    this.formatMenu = undefined;
    this.locationInput = undefined;
    this.confirmMenu = undefined;
  }

  private async loadFolders() {
    this.clearContent();
    this.currentStep = ConfigStep.LOADING_FOLDERS;
    
    this.statusText = new TextRenderable(this.renderer, {
      id: 'status',
      content: '⏳ Loading folders from your account...\n\nPlease wait...',
      fg: theme.colors.info,
      position: 'relative',
      left: 10,
      top: 2,
    });
    this.contentContainer.add(this.statusText);

    try {
      const config = getConfigManager();
      const credentials = await config.loadCredentials(this.account.id);
      const provider = getProviderForAccount(this.account, credentials);

      await provider.connect();
      this.folders = await provider.getFolders();
      await provider.disconnect();

      // Select all folders by default
      this.folders.forEach((folder: Folder) => {
        this.selectedFolders.add(folder.path);
      });

      // Move to export location selection
      this.showExportLocationSelection();
    } catch (error) {
      this.showError(`${error}`);
    }
  }

  private showExportLocationSelection() {
    this.clearContent();
    this.currentStep = ConfigStep.SELECT_EXPORT_LOCATION;
    
    const instructionText = new TextRenderable(this.renderer, {
      id: 'instruction',
      content: `✅ Found ${this.folders.length} folders with emails\n\nWhere do you want to save the backup?`,
      fg: theme.colors.success,
      position: 'relative',
      left: 10,
      top: 0,
    });
    this.contentContainer.add(instructionText);

    this.locationMenu = new SelectRenderable(this.renderer, {
      id: 'location-menu',
      width: 70,
      height: 6,
      options: [
        { name: '💾 Local - Current Directory', description: './email-backups/ (default)' },
        { name: '🏠 Local - Home Directory', description: `${homedir()}/email-backups/` },
        { name: '📁 Local - Custom Path', description: 'Enter custom directory path' },
        { name: '☁️  Cloud - Not Implemented', description: 'Coming soon: Google Drive, Dropbox' },
      ],
      position: 'relative',
      left: 10,
      top: 4,
      focusedBackgroundColor: theme.colors.backgroundLight,
    });
    this.contentContainer.add(this.locationMenu);

    this.locationMenu.on(SelectRenderableEvents.ITEM_SELECTED, (index) => {
      switch (index) {
        case 0:
          this.exportLocation = './email-backups';
          this.showFormatSelection();
          break;
        case 1:
          this.exportLocation = `${homedir()}/email-backups`;
          this.showFormatSelection();
          break;
        case 2:
          this.showCustomPathInput();
          break;
        case 3:
          this.showCloudNotImplemented();
          break;
      }
    });

    this.locationMenu.focus();
  }

  private showCustomPathInput() {
    this.clearContent();
    
    const instructionText = new TextRenderable(this.renderer, {
      id: 'instruction',
      content: 'Enter custom backup path:\n\n(Press Enter when done)',
      fg: theme.colors.text,
      position: 'relative',
      left: 10,
      top: 0,
    });
    this.contentContainer.add(instructionText);

    this.locationInput = new InputRenderable(this.renderer, {
      id: 'location-input',
      width: 60,
      placeholder: '/path/to/backup/directory',
      position: 'relative',
      left: 10,
      top: 4,
      focusedBackgroundColor: theme.colors.backgroundLight,
    });
    this.contentContainer.add(this.locationInput);

    // Set default value
    this.locationInput.value = './email-backups';

    this.locationInput.on(InputRenderableEvents.CHANGE, (value: string) => {
      this.exportLocation = value || './email-backups';
      this.showFormatSelection();
    });

    this.locationInput.focus();
  }

  private showCloudNotImplemented() {
    this.clearContent();
    
    const messageText = new TextRenderable(this.renderer, {
      id: 'message',
      content: '☁️  Cloud Storage Coming Soon!\n\nPlanned features:\n• Google Drive integration\n• Dropbox sync\n• AWS S3 backup\n• OneDrive support\n\nFor now, please use local backup.\n\nPress Esc to go back.',
      fg: theme.colors.warning,
      position: 'relative',
      left: 10,
      top: 2,
    });
    this.contentContainer.add(messageText);
  }

  private showFormatSelection() {
    this.clearContent();
    this.currentStep = ConfigStep.SELECT_FORMATS;
    
    const instructionText = new TextRenderable(this.renderer, {
      id: 'instruction',
      content: `Backup Location: ${this.exportLocation}\n\nSelect backup formats (all recommended):`,
      fg: theme.colors.text,
      position: 'relative',
      left: 10,
      top: 0,
    });
    this.contentContainer.add(instructionText);

    this.formatMenu = new SelectRenderable(this.renderer, {
      id: 'format-menu',
      width: 70,
      height: 5,
      options: [
        { name: '✅ All Formats (Recommended)', description: 'MBOX + EML + JSON' },
        { name: '📦 MBOX Only', description: 'Standard Unix mailbox format' },
        { name: '📧 EML Only', description: 'Individual email files' },
        { name: '📊 JSON Only', description: 'Metadata for analysis' },
      ],
      position: 'relative',
      left: 10,
      top: 4,
      focusedBackgroundColor: theme.colors.backgroundLight,
    });
    this.contentContainer.add(this.formatMenu);

    this.formatMenu.on(SelectRenderableEvents.ITEM_SELECTED, (index) => {
      this.selectedFormats.clear();
      switch (index) {
        case 0:
          this.selectedFormats.add('mbox');
          this.selectedFormats.add('eml');
          this.selectedFormats.add('json');
          break;
        case 1:
          this.selectedFormats.add('mbox');
          break;
        case 2:
          this.selectedFormats.add('eml');
          break;
        case 3:
          this.selectedFormats.add('json');
          break;
      }
      this.showConfirmation();
    });

    this.formatMenu.focus();
  }

  private showConfirmation() {
    this.clearContent();
    this.currentStep = ConfigStep.CONFIRM;
    
    const totalMessages = this.folders.reduce((sum, f) => sum + (f.messageCount || 0), 0);
    const formatsStr = Array.from(this.selectedFormats).join(', ').toUpperCase();
    
    const summaryText = new TextRenderable(this.renderer, {
      id: 'summary',
      content: `📋 Backup Summary:\n\n✉️  Account: ${this.account.email}\n📁 Folders: ${this.folders.length} (${this.selectedFolders.size} selected)\n📊 Formats: ${formatsStr}\n💾 Location: ${this.exportLocation}\n\nReady to start backup?`,
      fg: theme.colors.text,
      position: 'relative',
      left: 10,
      top: 0,
    });
    this.contentContainer.add(summaryText);

    this.confirmMenu = new SelectRenderable(this.renderer, {
      id: 'confirm-menu',
      width: 60,
      height: 4,
      options: [
        { name: '✅ Start Backup', description: 'Begin backing up your emails' },
        { name: '⚙️  Change Settings', description: 'Go back and adjust settings' },
        { name: '❌ Cancel', description: 'Return to main menu' },
      ],
      position: 'relative',
      left: 10,
      top: 12,
      focusedBackgroundColor: theme.colors.backgroundLight,
    });
    this.contentContainer.add(this.confirmMenu);

    this.confirmMenu.on(SelectRenderableEvents.ITEM_SELECTED, (index) => {
      switch (index) {
        case 0:
          this.startBackup();
          break;
        case 1:
          this.showExportLocationSelection();
          break;
        case 2:
          this.navigation.back();
          break;
      }
    });

    this.confirmMenu.focus();
  }

  private startBackup() {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.exportLocation)) {
      fs.mkdirSync(this.exportLocation, { recursive: true });
    }

    this.navigation.navigate('backup-progress', {
      account: this.account,
      folders: Array.from(this.selectedFolders),
      formats: Array.from(this.selectedFormats),
      outputDir: this.exportLocation,
    });
  }

  private showError(message: string) {
    this.clearContent();
    this.currentStep = ConfigStep.ERROR;
    
    this.statusText = new TextRenderable(this.renderer, {
      id: 'status',
      content: `❌ Error loading folders!\n\n${message}\n\nPress Esc to go back or Enter to retry.`,
      fg: theme.colors.error,
      position: 'relative',
      left: 10,
      top: 2,
    });
    this.contentContainer.add(this.statusText);

    const retryHandler = (key: any) => {
      if (key.name === 'return' || key.name === 'enter') {
        this.renderer.keyInput.off('keypress', retryHandler);
        this.loadFolders();
      }
    };
    this.renderer.keyInput.on('keypress', retryHandler);
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
    if (this.statusText) this.statusText.destroy();
    if (this.locationMenu) this.locationMenu.destroy();
    if (this.formatMenu) this.formatMenu.destroy();
    if (this.locationInput) this.locationInput.destroy();
    if (this.confirmMenu) this.confirmMenu.destroy();
    this.contentContainer.destroy();
    this.container.destroy();
  }
}
