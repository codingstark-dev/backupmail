/**
 * Backup Summary Screen - Show results after backup completion
 */

import { 
  BoxRenderable,
  TextRenderable,
  SelectRenderable,
  SelectRenderableEvents,
  type CliRenderer 
} from '@opentui/core';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { theme } from '../utils/theme';
import type { NavigationManager } from '../utils/navigation';

export class BackupSummaryScreen {
  private renderer: CliRenderer;
  private navigation: NavigationManager;
  private container: BoxRenderable;
  private header: Header;
  private footer: Footer;
  private summaryText: TextRenderable;
  private menu: SelectRenderable;
  private summary: any;
  private backupDir: string;

  constructor(renderer: CliRenderer, navigation: NavigationManager, data?: any) {
    this.renderer = renderer;
    this.navigation = navigation;
    this.summary = data?.summary;
    this.backupDir = data?.backupDir;

    // Create container
    this.container = new BoxRenderable(renderer, {
      id: 'backup-summary-container',
      width: '100%',
      height: '100%',
      position: 'relative',
    });

    // Create header
    this.header = new Header(renderer, {
      title: `${theme.icons.success} Backup Complete!`,
      subtitle: `Backed up ${this.summary.totalMessages} messages from ${this.summary.totalFolders} folders`,
    });
    this.container.add(this.header.getContainer());

    // Create summary text
    const summaryContent = this.formatSummary();
    this.summaryText = new TextRenderable(renderer, {
      id: 'summary',
      content: summaryContent,
      fg: theme.colors.text,
      position: 'relative',
      left: 10,
      top: 8,
    });
    this.container.add(this.summaryText);

    // Create menu for actions
    this.menu = new SelectRenderable(renderer, {
      id: 'summary-menu',
      width: 50,
      height: 5,
      options: [
        { name: 'View Backup Location', description: 'Open backup folder' },
        { name: 'New Backup', description: 'Start another backup' },
        { name: 'Main Menu', description: 'Return to main menu' },
      ],
      position: 'relative',
      left: 10,
      top: 20,
      focusedBackgroundColor: theme.colors.backgroundLight,
    });
    this.container.add(this.menu);

    // Create footer
    this.footer = new Footer(renderer, {
      shortcuts: [
        { key: '↑/↓', description: 'Navigate' },
        { key: 'Enter', description: 'Select' },
        { key: 'q', description: 'Main Menu' },
      ],
    });
    this.container.add(this.footer.getContainer());

    // Handle menu selection
    this.menu.on(SelectRenderableEvents.ITEM_SELECTED, (index) => {
      this.handleSelection(index);
    });

    // Handle keyboard shortcuts
    this.renderer.keyInput.on('keypress', (key) => {
      if (key.name === 'q') {
        this.navigation.reset('main-menu');
      }
    });

    this.menu.focus();
  }

  private formatSummary(): string {
    let text = `\nDuration: ${this.summary.duration}\n`;
    text += `Location: ${this.backupDir}\n\n`;
    text += `Folders:\n`;

    for (const folder of this.summary.folders) {
      text += `  ${theme.icons.folder} ${folder.folder} - ${folder.messages} messages\n`;
    }

    return text;
  }

  private handleSelection(index: number) {
    switch (index) {
      case 0: // View Backup Location
        console.log(`Backup saved to: ${this.backupDir}`);
        break;
      case 1: // New Backup
        this.navigation.reset('main-menu');
        this.navigation.navigate('account-list', { nextScreen: 'backup-config' });
        break;
      case 2: // Main Menu
        this.navigation.reset('main-menu');
        break;
    }
  }

  show() {
    this.renderer.root.add(this.container);
    this.menu.focus();
  }

  hide() {
    this.renderer.root.remove(this.container.id);
  }

  destroy() {
    this.header.destroy();
    this.footer.destroy();
    this.summaryText.destroy();
    this.menu.destroy();
    this.container.destroy();
  }
}
