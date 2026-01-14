/**
 * Add Account Screen - Add new email account
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
import { getConfigManager } from '../../utils/config';
import { ImapProvider } from '../../providers/imap';
import type { ImapAccount } from '../../types';

enum AddAccountStep {
  CHOOSE_PROVIDER = 'choose_provider',
  ENTER_EMAIL = 'enter_email',
  ENTER_HOST = 'enter_host',
  ENTER_PORT = 'enter_port',
  ENTER_PASSWORD = 'enter_password',
  TESTING = 'testing',
  SUCCESS = 'success',
  ERROR = 'error',
}

export class AddAccountScreen {
  private renderer: CliRenderer;
  private navigation: NavigationManager;
  private container: BoxRenderable;
  private header: Header;
  private footer: Footer;
  private currentStep: AddAccountStep = AddAccountStep.CHOOSE_PROVIDER;
  
  // Form data
  private providerType: 'gmail' | 'imap' | 'spacemail' = 'imap';
  private email = '';
  private host = '';
  private port = '993';
  private password = '';
  
  // UI elements
  private contentContainer: BoxRenderable;
  private providerMenu?: SelectRenderable;
  private emailInput?: InputRenderable;
  private hostInput?: InputRenderable;
  private portInput?: InputRenderable;
  private passwordInput?: InputRenderable;
  private statusText?: TextRenderable;

  constructor(renderer: CliRenderer, navigation: NavigationManager) {
    this.renderer = renderer;
    this.navigation = navigation;

    // Create main container
    this.container = new BoxRenderable(renderer, {
      id: 'add-account-container',
      width: '100%',
      height: '100%',
      position: 'relative',
    });

    // Create header
    this.header = new Header(renderer, {
      title: 'Add Email Account',
      subtitle: 'Configure a new email account for backup',
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

    // Start with provider selection
    this.showProviderSelection();
  }

  private clearContent() {
    // Remove all children from content container
    const children = this.contentContainer.getChildren();
    children.forEach(child => {
      this.contentContainer.remove(child.id);
    });
    
    // Clear references
    this.providerMenu = undefined;
    this.emailInput = undefined;
    this.hostInput = undefined;
    this.portInput = undefined;
    this.passwordInput = undefined;
    this.statusText = undefined;
  }

  private showProviderSelection() {
    this.clearContent();
    this.currentStep = AddAccountStep.CHOOSE_PROVIDER;
    
    const instructionText = new TextRenderable(this.renderer, {
      id: 'instruction',
      content: 'Select your email provider:',
      fg: theme.colors.text,
      position: 'relative',
      left: 10,
      top: 0,
    });
    this.contentContainer.add(instructionText);

    this.providerMenu = new SelectRenderable(this.renderer, {
      id: 'provider-menu',
      width: 60,
      height: 5,
      options: [
        { name: '✉️  Generic IMAP Server', description: 'Any IMAP-compatible email service' },
        { name: '📧  SpaceMail (IMAP)', description: 'SpaceMail email service' },
        { name: '🔷  Gmail (OAuth2)', description: 'Gmail with OAuth2 (not implemented yet)' },
      ],
      position: 'relative',
      left: 10,
      top: 2,
      focusedBackgroundColor: theme.colors.backgroundLight,
    });
    this.contentContainer.add(this.providerMenu);

    this.providerMenu.on(SelectRenderableEvents.ITEM_SELECTED, (index) => {
      switch (index) {
        case 0:
          this.providerType = 'imap';
          this.showEmailInput();
          break;
        case 1:
          this.providerType = 'spacemail';
          this.host = 'mail.spacemail.com';
          this.port = '993';
          this.showEmailInput();
          break;
        case 2:
          this.showGmailNotImplemented();
          break;
      }
    });

    this.providerMenu.focus();
  }

  private showGmailNotImplemented() {
    this.clearContent();
    
    const errorText = new TextRenderable(this.renderer, {
      id: 'error',
      content: 'Gmail OAuth2 is not yet implemented in the TUI.\n\nPlease use the CLI command:\n  mailbak auth add\n\nPress Esc to go back.',
      fg: theme.colors.warning,
      position: 'relative',
      left: 10,
      top: 2,
    });
    this.contentContainer.add(errorText);
  }

  private showEmailInput() {
    this.clearContent();
    this.currentStep = AddAccountStep.ENTER_EMAIL;
    
    const instructionText = new TextRenderable(this.renderer, {
      id: 'instruction',
      content: 'Enter your email address:',
      fg: theme.colors.text,
      position: 'relative',
      left: 10,
      top: 0,
    });
    this.contentContainer.add(instructionText);

    this.emailInput = new InputRenderable(this.renderer, {
      id: 'email-input',
      width: 50,
      placeholder: 'user@example.com',
      position: 'relative',
      left: 10,
      top: 2,
      focusedBackgroundColor: theme.colors.backgroundLight,
    });
    this.contentContainer.add(this.emailInput);

    this.emailInput.on(InputRenderableEvents.CHANGE, (value: string) => {
      this.email = value;
      if (this.providerType === 'spacemail') {
        this.showPasswordInput();
      } else {
        this.showHostInput();
      }
    });

    this.emailInput.focus();
  }

  private showHostInput() {
    this.clearContent();
    this.currentStep = AddAccountStep.ENTER_HOST;
    
    const instructionText = new TextRenderable(this.renderer, {
      id: 'instruction',
      content: `Email: ${this.email}\n\nEnter IMAP server host:`,
      fg: theme.colors.text,
      position: 'relative',
      left: 10,
      top: 0,
    });
    this.contentContainer.add(instructionText);

    this.hostInput = new InputRenderable(this.renderer, {
      id: 'host-input',
      width: 50,
      placeholder: 'imap.example.com',
      position: 'relative',
      left: 10,
      top: 4,
      focusedBackgroundColor: theme.colors.backgroundLight,
    });
    this.contentContainer.add(this.hostInput);

    this.hostInput.on(InputRenderableEvents.CHANGE, (value: string) => {
      this.host = value;
      this.showPortInput();
    });

    this.hostInput.focus();
  }

  private showPortInput() {
    this.clearContent();
    this.currentStep = AddAccountStep.ENTER_PORT;
    
    const instructionText = new TextRenderable(this.renderer, {
      id: 'instruction',
      content: `Email: ${this.email}\nHost: ${this.host}\n\nEnter IMAP port (usually 993):`,
      fg: theme.colors.text,
      position: 'relative',
      left: 10,
      top: 0,
    });
    this.contentContainer.add(instructionText);

    this.portInput = new InputRenderable(this.renderer, {
      id: 'port-input',
      width: 20,
      placeholder: '993',
      position: 'relative',
      left: 10,
      top: 5,
      focusedBackgroundColor: theme.colors.backgroundLight,
    });
    this.contentContainer.add(this.portInput);

    // Set default value
    this.portInput.value = '993';

    this.portInput.on(InputRenderableEvents.CHANGE, (value: string) => {
      this.port = value || '993';
      this.showPasswordInput();
    });

    this.portInput.focus();
  }

  private showPasswordInput() {
    this.clearContent();
    this.currentStep = AddAccountStep.ENTER_PASSWORD;
    
    const instructionText = new TextRenderable(this.renderer, {
      id: 'instruction',
      content: `Email: ${this.email}\nHost: ${this.host}\nPort: ${this.port}\n\nEnter password:`,
      fg: theme.colors.text,
      position: 'relative',
      left: 10,
      top: 0,
    });
    this.contentContainer.add(instructionText);

    this.passwordInput = new InputRenderable(this.renderer, {
      id: 'password-input',
      width: 50,
      placeholder: 'Enter your password',
      position: 'relative',
      left: 10,
      top: 6,
      focusedBackgroundColor: theme.colors.backgroundLight,
    });
    this.contentContainer.add(this.passwordInput);

    this.passwordInput.on(InputRenderableEvents.CHANGE, (value: string) => {
      this.password = value;
      this.testConnection();
    });

    this.passwordInput.focus();
  }

  private async testConnection() {
    this.clearContent();
    this.currentStep = AddAccountStep.TESTING;
    
    this.statusText = new TextRenderable(this.renderer, {
      id: 'status',
      content: 'Testing connection...\n\nPlease wait...',
      fg: theme.colors.info,
      position: 'relative',
      left: 10,
      top: 2,
    });
    this.contentContainer.add(this.statusText);

    try {
      const accountId = `imap_${Date.now()}`;
      const account: ImapAccount = {
        id: accountId,
        name: this.email,
        email: this.email,
        type: 'imap',
        host: this.host,
        port: parseInt(this.port) || 993,
        secure: true,
        username: this.email,
        createdAt: new Date(),
      };

      const provider = new ImapProvider(account, this.password);
      const success = await provider.testConnection();

      if (!success) {
        throw new Error('Connection test failed');
      }

      // Save account
      const config = getConfigManager();
      await config.saveAccount(account);
      await config.saveCredentials(accountId, { password: this.password });

      this.showSuccess();
    } catch (error) {
      this.showError(`${error}`);
    }
  }

  private showSuccess() {
    this.clearContent();
    this.currentStep = AddAccountStep.SUCCESS;
    
    this.statusText = new TextRenderable(this.renderer, {
      id: 'status',
      content: `${theme.icons.success} Account added successfully!\n\nEmail: ${this.email}\nHost: ${this.host}\nPort: ${this.port}\n\nPress Enter to continue or Esc to go back.`,
      fg: theme.colors.success,
      position: 'relative',
      left: 10,
      top: 2,
    });
    this.contentContainer.add(this.statusText);

    // Update footer
    this.footer.updateShortcuts([
      { key: 'Enter', description: 'Continue' },
      { key: 'Esc', description: 'Main Menu' },
    ]);

    // Handle Enter to continue
    const enterHandler = (key: any) => {
      if (key.name === 'return' || key.name === 'enter') {
        this.renderer.keyInput.off('keypress', enterHandler);
        this.navigation.back();
      }
    };
    this.renderer.keyInput.on('keypress', enterHandler);
  }

  private showError(message: string) {
    this.clearContent();
    this.currentStep = AddAccountStep.ERROR;
    
    this.statusText = new TextRenderable(this.renderer, {
      id: 'status',
      content: `${theme.icons.error} Connection failed!\n\nError: ${message}\n\nPlease check your settings and try again.\n\nPress Enter to retry or Esc to go back.`,
      fg: theme.colors.error,
      position: 'relative',
      left: 10,
      top: 2,
    });
    this.contentContainer.add(this.statusText);

    // Handle Enter to retry
    const enterHandler = (key: any) => {
      if (key.name === 'return' || key.name === 'enter') {
        this.renderer.keyInput.off('keypress', enterHandler);
        this.showProviderSelection();
      }
    };
    this.renderer.keyInput.on('keypress', enterHandler);
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
    if (this.providerMenu) this.providerMenu.destroy();
    if (this.emailInput) this.emailInput.destroy();
    if (this.hostInput) this.hostInput.destroy();
    if (this.portInput) this.portInput.destroy();
    if (this.passwordInput) this.passwordInput.destroy();
    if (this.statusText) this.statusText.destroy();
    this.contentContainer.destroy();
    this.container.destroy();
  }
}
