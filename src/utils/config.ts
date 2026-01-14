/**
 * Configuration manager for mailbak
 * Handles storing and retrieving account configurations
 */

import { join } from 'path';
import { homedir } from 'os';
import type { Config, Account, ImapAccount, GmailAccount } from '../types';

export class ConfigManager {
  private configDir: string;
  private configFile: string;
  private config: Config | null = null;

  constructor(configDir?: string) {
    this.configDir = configDir || join(homedir(), '.mailbak');
    this.configFile = join(this.configDir, 'config.json');
  }

  /**
   * Initialize the config directory and file
   */
  async init(): Promise<void> {
    try {
      await Bun.write(join(this.configDir, '.gitignore'), '*\n');
    } catch {
      // Directory might already exist
    }

    const configExists = await Bun.file(this.configFile).exists();
    
    if (!configExists) {
      const defaultConfig: Config = {
        configDir: this.configDir,
        accounts: {},
      };
      await this.saveConfig(defaultConfig);
    }
  }

  /**
   * Load configuration from disk
   */
  async load(): Promise<Config> {
    if (this.config) {
      return this.config;
    }

    await this.init();

    try {
      const file = Bun.file(this.configFile);
      const content = await file.text();
      this.config = JSON.parse(content);
      return this.config!;
    } catch (error) {
      throw new Error(`Failed to load config: ${error}`);
    }
  }

  /**
   * Save configuration to disk
   */
  private async saveConfig(config: Config): Promise<void> {
    this.config = config;
    await Bun.write(this.configFile, JSON.stringify(config, null, 2));
  }

  /**
   * Get all accounts
   */
  async getAccounts(): Promise<Account[]> {
    const config = await this.load();
    return Object.values(config.accounts);
  }

  /**
   * Get account by ID
   */
  async getAccount(accountId: string): Promise<Account | null> {
    const config = await this.load();
    return config.accounts[accountId] || null;
  }

  /**
   * Add or update an account
   */
  async saveAccount(account: Account): Promise<void> {
    const config = await this.load();
    config.accounts[account.id] = account;
    await this.saveConfig(config);
  }

  /**
   * Remove an account
   */
  async removeAccount(accountId: string): Promise<void> {
    const config = await this.load();
    delete config.accounts[accountId];
    await this.saveConfig(config);
  }

  /**
   * Get the default account
   */
  async getDefaultAccount(): Promise<Account | null> {
    const config = await this.load();
    if (config.defaultAccount) {
      return config.accounts[config.defaultAccount] || null;
    }
    return null;
  }

  /**
   * Set the default account
   */
  async setDefaultAccount(accountId: string): Promise<void> {
    const config = await this.load();
    if (!config.accounts[accountId]) {
      throw new Error(`Account ${accountId} not found`);
    }
    config.defaultAccount = accountId;
    await this.saveConfig(config);
  }

  /**
   * Get the config directory path
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * Get account credentials file path
   */
  getCredentialsPath(accountId: string): string {
    return join(this.configDir, 'credentials', `${accountId}.json`);
  }

  /**
   * Save account credentials (encrypted storage would be better for production)
   */
  async saveCredentials(accountId: string, credentials: any): Promise<void> {
    const credDir = join(this.configDir, 'credentials');
    try {
      await Bun.write(join(credDir, '.gitignore'), '*\n');
    } catch {
      // Directory might already exist
    }
    
    const credPath = this.getCredentialsPath(accountId);
    await Bun.write(credPath, JSON.stringify(credentials, null, 2));
  }

  /**
   * Load account credentials
   */
  async loadCredentials(accountId: string): Promise<any> {
    const credPath = this.getCredentialsPath(accountId);
    try {
      const file = Bun.file(credPath);
      const content = await file.text();
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load credentials for ${accountId}: ${error}`);
    }
  }

  /**
   * Delete account credentials
   */
  async deleteCredentials(accountId: string): Promise<void> {
    const credPath = this.getCredentialsPath(accountId);
    try {
      await Bun.file(credPath).exists() && await Bun.$`rm ${credPath}`;
    } catch {
      // Ignore errors if file doesn't exist
    }
  }
}

// Singleton instance
let configManager: ConfigManager | null = null;

export function getConfigManager(): ConfigManager {
  if (!configManager) {
    configManager = new ConfigManager();
  }
  return configManager;
}
