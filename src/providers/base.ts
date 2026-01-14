/**
 * Base provider interface that all email providers must implement
 */

import type { EmailMessage, Folder } from '../types';

export interface IEmailProvider {
  /**
   * Connect to the email provider
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the email provider
   */
  disconnect(): Promise<void>;

  /**
   * Test the connection
   */
  testConnection(): Promise<boolean>;

  /**
   * Get all folders/labels
   */
  getFolders(): Promise<Folder[]>;

  /**
   * Get messages from a specific folder
   * @param folder - Folder name or path
   * @param limit - Maximum number of messages to fetch (0 = all)
   */
  getMessages(folder: string, limit?: number): Promise<EmailMessage[]>;

  /**
   * Get a single message by ID
   */
  getMessage(folder: string, id: string): Promise<EmailMessage>;

  /**
   * Upload/import messages to a folder
   */
  uploadMessages(folder: string, messages: EmailMessage[]): Promise<void>;

  /**
   * Create a folder
   */
  createFolder(folderPath: string): Promise<void>;

  /**
   * Delete a folder
   */
  deleteFolder(folderPath: string): Promise<void>;

  /**
   * Get total message count across all folders
   */
  getTotalMessageCount(): Promise<number>;
}

export abstract class BaseEmailProvider implements IEmailProvider {
  protected connected: boolean = false;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract testConnection(): Promise<boolean>;
  abstract getFolders(): Promise<Folder[]>;
  abstract getMessages(folder: string, limit?: number): Promise<EmailMessage[]>;
  abstract getMessage(folder: string, id: string): Promise<EmailMessage>;
  abstract uploadMessages(folder: string, messages: EmailMessage[]): Promise<void>;
  abstract createFolder(folderPath: string): Promise<void>;
  abstract deleteFolder(folderPath: string): Promise<void>;
  abstract getTotalMessageCount(): Promise<number>;

  isConnected(): boolean {
    return this.connected;
  }

  protected ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Provider not connected. Call connect() first.');
    }
  }
}
