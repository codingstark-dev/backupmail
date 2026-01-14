/**
 * Account List Screen - Choose an account
 */

import { 
  SelectRenderable, 
  SelectRenderableEvents,
  BoxRenderable,
  TextRenderable,
  type CliRenderer 
} from '@opentui/core';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { theme } from '../utils/theme';
import type { NavigationManager } from '../utils/navigation';
import { getConfigManager } from '../../utils/config';
import type { Account } from '../../types';

export class AccountListScreen {
  private renderer: CliRenderer;
  private navigation: NavigationManager;
  private container: BoxRenderable;
  private header: Header;
  private footer: Footer;
  private menu?: SelectRenderable;
  private noAccountsText?: TextRenderable;
  private accounts: Account[] = [];
  private nextScreen?: string;

  constructor(renderer: CliRenderer, navigation: NavigationManager, data?: any) {
    this.renderer = renderer;
    this.navigation = navigation;
    this.nextScreen = data?.nextScreen;

    // Create container
    this.container = new BoxRenderable(renderer, {
      id: 'account-list-container',
      width: '100%',
      height: '100%',
      position: 'relative',
    });

    // Create header
    this.header = new Header(renderer, {
      title: 'Select Email Account',
      subtitle: 'Choose an account to continue',
    });
    this.container.add(this.header.getContainer());

    // Create footer
    this.footer = new Footer(renderer, {
      shortcuts: [
        { key: '↑/↓', description: 'Navigate' },
        { key: 'Enter', description: 'Select' },
        { key: 'Esc', description: 'Back' },
      ],
    });
    this.container.add(this.footer.getContainer());

    // Load accounts and setup
    this.loadAccounts();
  }

  private async loadAccounts() {
    try {
      const config = getConfigManager();
      this.accounts = await config.getAccounts();

      if (this.accounts.length === 0) {
        this.showNoAccounts();
      } else {
        this.showAccountList();
      }
    } catch (error) {
      this.showError(`Failed to load accounts: ${error}`);
    }
  }

  private showAccountList() {
    this.menu = new SelectRenderable(this.renderer, {
      id: 'account-list',
      width: 70,
      height: Math.min(this.accounts.length + 2, 15),
      options: this.accounts.map(acc => ({
        name: `${acc.type === 'gmail' ? theme.icons.email : '✉️'}  ${acc.email}`,
        description: `${acc.type.toUpperCase()} - Added ${new Date(acc.createdAt).toLocaleDateString()}`,
      })),
      position: 'relative',
      left: 10,
      top: 8,
      focusedBackgroundColor: theme.colors.backgroundLight,
    });
    this.container.add(this.menu);

    // Handle menu selection
    this.menu.on(SelectRenderableEvents.ITEM_SELECTED, (index) => {
      this.handleSelection(index);
    });

    // Handle keyboard shortcuts
    this.renderer.keyInput.on('keypress', (key) => {
      if (key.name === 'escape') {
        this.navigation.back();
      }
    });

    this.menu.focus();
  }

  private showNoAccounts() {
    this.noAccountsText = new TextRenderable(this.renderer, {
      id: 'no-accounts',
      content: 'No email accounts configured.\n\nPress Enter to add an account, or Esc to go back.',
      fg: theme.colors.warning,
      position: 'relative',
      left: 10,
      top: 10,
    });
    this.container.add(this.noAccountsText);

    this.renderer.keyInput.on('keypress', (key) => {
      if (key.name === 'return' || key.name === 'enter') {
        this.navigation.navigate('add-account');
      } else if (key.name === 'escape') {
        this.navigation.back();
      }
    });
  }

  private showError(message: string) {
    const errorText = new TextRenderable(this.renderer, {
      id: 'error',
      content: `Error: ${message}\n\nPress Esc to go back.`,
      fg: theme.colors.error,
      position: 'relative',
      left: 10,
      top: 10,
    });
    this.container.add(errorText);

    this.renderer.keyInput.on('keypress', (key) => {
      if (key.name === 'escape') {
        this.navigation.back();
      }
    });
  }

  private handleSelection(index: number) {
    const account = this.accounts[index];
    if (!account) return;

    if (this.nextScreen === 'backup-config') {
      this.navigation.navigate('backup-config', { account });
    } else {
      // Show account details or go to main menu
      this.navigation.back();
    }
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
    if (this.menu) this.menu.destroy();
    if (this.noAccountsText) this.noAccountsText.destroy();
    this.container.destroy();
  }
}
