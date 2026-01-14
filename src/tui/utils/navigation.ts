/**
 * Navigation utilities for managing screen transitions
 */

import type { CliRenderer } from '@opentui/core';

export type ScreenType = 
  | 'main-menu'
  | 'account-list'
  | 'add-account'
  | 'backup-config'
  | 'backup-progress'
  | 'backup-summary'
  | 'migrate-config';

export interface ScreenState {
  type: ScreenType;
  data?: any;
}

export class NavigationManager {
  private stack: ScreenState[] = [];
  private currentScreen: ScreenState | null = null;
  private renderer: CliRenderer;
  private onNavigate?: (screen: ScreenState) => void;

  constructor(renderer: CliRenderer) {
    this.renderer = renderer;
  }

  setNavigationCallback(callback: (screen: ScreenState) => void) {
    this.onNavigate = callback;
  }

  navigate(screen: ScreenType, data?: any) {
    const screenState: ScreenState = { type: screen, data };
    
    // Save current screen to stack
    if (this.currentScreen) {
      this.stack.push(this.currentScreen);
    }
    
    this.currentScreen = screenState;
    this.onNavigate?.(screenState);
  }

  replace(screen: ScreenType, data?: any) {
    const screenState: ScreenState = { type: screen, data };
    this.currentScreen = screenState;
    this.onNavigate?.(screenState);
  }

  back() {
    if (this.stack.length > 0) {
      this.currentScreen = this.stack.pop()!;
      this.onNavigate?.(this.currentScreen);
      return true;
    }
    return false;
  }

  getCurrentScreen(): ScreenState | null {
    return this.currentScreen;
  }

  clearStack() {
    this.stack = [];
  }

  reset(screen: ScreenType, data?: any) {
    this.stack = [];
    this.navigate(screen, data);
  }
}
