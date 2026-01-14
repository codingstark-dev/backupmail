/**
 * Main TUI Application - Manages screens and navigation
 */

import { createCliRenderer, type CliRenderer } from '@opentui/core';
import { NavigationManager, type ScreenState } from './utils/navigation';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { AccountListScreen } from './screens/AccountListScreen';
import { AddAccountScreen } from './screens/AddAccountScreen';
import { BackupConfigScreen } from './screens/BackupConfigScreen';
import { BackupProgressScreen } from './screens/BackupProgressScreen';
import { BackupSummaryScreen } from './screens/BackupSummaryScreen';

export class MailbakTuiApp {
  private renderer!: CliRenderer;
  private navigation!: NavigationManager;
  private currentScreen: any = null;

  async init() {
    // Create renderer
    this.renderer = await createCliRenderer({
      consoleOptions: {
        startInDebugMode: false,
      },
    });

    // Create navigation manager
    this.navigation = new NavigationManager(this.renderer);
    this.navigation.setNavigationCallback((screen) => {
      this.showScreen(screen);
    });

    // Start rendering loop
    this.renderer.start();

    // Navigate to main menu
    this.navigation.navigate('main-menu');
  }

  private showScreen(screenState: ScreenState) {
    // Hide and destroy current screen
    if (this.currentScreen) {
      this.currentScreen.hide();
      this.currentScreen.destroy();
      this.currentScreen = null;
    }

    // Create and show new screen
    switch (screenState.type) {
      case 'main-menu':
        this.currentScreen = new MainMenuScreen(this.renderer, this.navigation);
        break;
      
      case 'account-list':
        this.currentScreen = new AccountListScreen(this.renderer, this.navigation, screenState.data);
        break;
      
      case 'add-account':
        this.currentScreen = new AddAccountScreen(this.renderer, this.navigation);
        break;
      
      case 'backup-config':
        this.currentScreen = new BackupConfigScreen(this.renderer, this.navigation, screenState.data);
        break;
      
      case 'backup-progress':
        this.currentScreen = new BackupProgressScreen(this.renderer, this.navigation, screenState.data);
        break;
      
      case 'backup-summary':
        this.currentScreen = new BackupSummaryScreen(this.renderer, this.navigation, screenState.data);
        break;
      
      default:
        console.error(`Unknown screen type: ${screenState.type}`);
        this.navigation.navigate('main-menu');
        return;
    }

    this.currentScreen.show();
  }

  async run() {
    await this.init();
  }

  destroy() {
    if (this.currentScreen) {
      this.currentScreen.destroy();
    }
    // Renderer cleanup would go here
  }
}
