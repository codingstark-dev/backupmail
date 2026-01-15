/**
 * Core types and interfaces for mailbak
 */

export type ProviderType = 'gmail' | 'imap' | 'jmap';

export type ExportFormat = 'mbox' | 'eml' | 'json' | 'pst';

export interface EmailMessage {
  id: string;
  uid: number;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  date: Date;
  headers: Record<string, string | string[]>;
  text?: string;
  html?: string;
  attachments: Attachment[];
  raw?: string; // Raw email content
  labels?: string[]; // Gmail labels
  folder?: string; // IMAP folder
  flags?: string[]; // Email flags (read, starred, etc.)
}

export interface EmailAddress {
  name?: string;
  address: string;
}

export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  content?: Buffer;
  contentId?: string;
}

export interface Folder {
  name: string;
  path: string;
  delimiter: string;
  flags?: string[];
  messageCount?: number;
  unreadCount?: number;
  children?: Folder[];
}

export interface Account {
  id: string;
  name: string;
  email: string;
  type: ProviderType;
  createdAt: Date;
  lastSync?: Date;
}

export interface ImapAccount extends Account {
  type: 'imap';
  host: string;
  port: number;
  secure: boolean;
  username: string;
}

export interface GmailAccount extends Account {
  type: 'gmail';
  refreshToken: string;
}

export interface JmapAccount extends Account {
  type: 'jmap';
  sessionUrl: string; // JMAP session resource URL (e.g., https://api.fastmail.com/jmap/session)
  username: string;
}

export interface BackupOptions {
  accountId: string;
  format: ExportFormat[];
  outputDir: string;
  folders?: string[]; // If not specified, backup all folders
  includeAttachments?: boolean;
  batchSize?: number;
  onProgress?: (progress: BackupProgress) => void;
}

export interface BackupProgress {
  folder: string;
  current: number;
  total: number;
  percentage: number;
  email?: EmailMessage;
}

export interface MigrateOptions {
  fromAccountId: string;
  toAccountId: string;
  folders?: string[];
  preserveFolders?: boolean;
  skipDuplicates?: boolean;
  onProgress?: (progress: MigrationProgress) => void;
}

export interface MigrationProgress {
  folder: string;
  current: number;
  total: number;
  percentage: number;
  skipped: number;
  failed: number;
}

export interface ImportOptions {
  accountId: string;
  sourceFile: string;
  format: ExportFormat;
  targetFolder?: string;
  onProgress?: (progress: BackupProgress) => void;
}

export interface Config {
  configDir: string;
  accounts: Record<string, Account>;
  defaultAccount?: string;
}
