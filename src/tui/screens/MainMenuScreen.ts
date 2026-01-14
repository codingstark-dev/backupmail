/**
 * CYBERPUNK Main Menu - Neon matrix vibes 🔮⚡
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

export interface MainMenuOption {
  name: string;
  description: string;
  icon: string;
  action: 'backup' | 'add-account' | 'list-accounts' | 'migrate' | 'settings' | 'exit';
}

export class MainMenuScreen {
  private renderer: CliRenderer;
  private navigation: NavigationManager;
  private container: BoxRenderable;
  private header: Header;
  private footer: Footer;
  private menu: SelectRenderable;
  private asciiArt: TextRenderable;
  private options: MainMenuOption[];

  constructor(renderer: CliRenderer, navigation: NavigationManager) {
    this.renderer = renderer;
    this.navigation = navigation;

    this.options = [
      {
        name: 'BACKUP EMAILS',
        description: 'Extract data from your account',
        icon: theme.icons.download,
        action: 'backup',
      },
      {
        name: 'ADD ACCOUNT',
        description: 'Connect new mail server',
        icon: theme.icons.add,
        action: 'add-account',
      },
      {
        name: 'LIST ACCOUNTS',
        description: 'View connected servers',
        icon: theme.icons.list,
        action: 'list-accounts',
      },
      {
        name: 'MIGRATE DATA',
        description: 'Transfer between servers',
        icon: theme.icons.sync,
        action: 'migrate',
      },
      {
        name: 'EXIT SYSTEM',
        description: 'Disconnect from mainframe',
        icon: theme.icons.exit,
        action: 'exit',
      },
    ];

    // Create container
    this.container = new BoxRenderable(renderer, {
      id: 'main-menu-container',
      width: '100%',
      height: '100%',
      position: 'relative',
      backgroundColor: theme.colors.background,
    });

    // Create CYBERPUNK header
    this.header = new Header(renderer, {
      title: '◆ MAILBAK v0.2.0 ◆',
      subtitle: 'UNIVERSAL EMAIL BACKUP SYSTEM',
    });
    this.container.add(this.header.getContainer());

    // ASCII ART LOGO
    const logo = `
    ███╗   ███╗ █████╗ ██╗██╗     ██████╗  █████╗ ██╗  ██╗
    ████╗ ████║██╔══██╗██║██║     ██╔══██╗██╔══██╗██║ ██╔╝
    ██╔████╔██║███████║██║██║     ██████╔╝███████║█████╔╝ 
    ██║╚██╔╝██║██╔══██║██║██║     ██╔══██╗██╔══██║██╔═██╗ 
    ██║ ╚═╝ ██║██║  ██║██║███████╗██████╔╝██║  ██║██║  ██╗
    ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
    `;

    this.asciiArt = new TextRenderable(renderer, {
      id: 'ascii-logo',
      content: logo,
      fg: theme.colors.primary,
      position: 'relative',
      left: 5,
      top: 8,
    });
    this.container.add(this.asciiArt);

    // Create NEON MENU
    this.menu = new SelectRenderable(renderer, {
      id: 'main-menu',
      width: 70,
      height: this.options.length + 2,
      options: this.options.map(opt => ({
        name: `${opt.icon} ${theme.ascii.arrowRight} ${opt.name}`,
        description: `${theme.ascii.diamond} ${opt.description}`,
      })),
      position: 'relative',
      left: 10,
      top: 16,
      focusedBackgroundColor: theme.colors.backgroundPanel,
    });
    this.container.add(this.menu);

    // Create CYBERPUNK footer
    this.footer = new Footer(renderer, {
      shortcuts: [
        { key: '↑/↓', description: 'Navigate' },
        { key: 'Enter', description: 'Select' },
        { key: 'q', description: 'Quit' },
      ],
    });
    this.container.add(this.footer.getContainer());

    // Handle menu selection
    this.menu.on(SelectRenderableEvents.ITEM_SELECTED, (index) => {
      this.handleSelection(index);
    });

    // Handle keyboard shortcuts - only 'q' exits, NOT esc!
    renderer.keyInput.on('keypress', (key) => {
      if (key.name === 'q') {
        this.handleExit();
      }
    });

    // Focus the menu
    this.menu.focus();
  }

  private handleSelection(index: number) {
    const option = this.options[index];
    if (!option) return;

    switch (option.action) {
      case 'backup':
        this.navigation.navigate('account-list', { nextScreen: 'backup-config' });
        break;
      case 'add-account':
        this.navigation.navigate('add-account');
        break;
      case 'list-accounts':
        this.navigation.navigate('account-list');
        break;
      case 'migrate':
        this.navigation.navigate('migrate-config');
        break;
      case 'exit':
        this.handleExit();
        break;
    }
  }

  private handleExit() {
    this.destroy();
    process.exit(0);
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
    this.asciiArt.destroy();
    this.menu.destroy();
    this.container.destroy();
  }
}
