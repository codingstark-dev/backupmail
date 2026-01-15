/**
 * JMAP Email Provider
 * Implements the JMAP (JSON Meta Application Protocol) standard
 * @see https://jmap.io/ and RFC 8620, RFC 8621
 */

import { BaseEmailProvider } from './base';
import type { EmailMessage, Folder, JmapAccount } from '../types';
import { logger } from '../utils/logger';

interface JmapSession {
  username: string;
  apiUrl: string;
  downloadUrl: string;
  uploadUrl: string;
  eventSourceUrl: string;
  state: string;
  accounts: Record<string, JmapAccountInfo>;
  primaryAccounts: Record<string, string>;
  capabilities: Record<string, any>;
}

interface JmapAccountInfo {
  name: string;
  isPersonal: boolean;
  isReadOnly: boolean;
  accountCapabilities: Record<string, any>;
}

interface JmapMailbox {
  id: string;
  name: string;
  parentId: string | null;
  role: string | null;
  sortOrder: number;
  totalEmails: number;
  unreadEmails: number;
  totalThreads: number;
  unreadThreads: number;
  myRights: Record<string, boolean>;
  isSubscribed: boolean;
}

interface JmapEmail {
  id: string;
  blobId: string;
  threadId: string;
  mailboxIds: Record<string, boolean>;
  keywords: Record<string, boolean>;
  size: number;
  receivedAt: string;
  messageId: string[];
  inReplyTo: string[] | null;
  references: string[] | null;
  sender: JmapEmailAddress[] | null;
  from: JmapEmailAddress[] | null;
  to: JmapEmailAddress[] | null;
  cc: JmapEmailAddress[] | null;
  bcc: JmapEmailAddress[] | null;
  replyTo: JmapEmailAddress[] | null;
  subject: string;
  sentAt: string | null;
  hasAttachment: boolean;
  preview: string;
  bodyStructure?: JmapBodyPart;
  bodyValues?: Record<string, JmapBodyValue>;
  textBody?: JmapBodyPart[];
  htmlBody?: JmapBodyPart[];
  attachments?: JmapBodyPart[];
}

interface JmapEmailAddress {
  name: string | null;
  email: string;
}

interface JmapBodyPart {
  partId: string | null;
  blobId: string | null;
  size: number;
  headers?: JmapHeader[];
  name: string | null;
  type: string;
  charset: string | null;
  disposition: string | null;
  cid: string | null;
  language: string[] | null;
  location: string | null;
  subParts?: JmapBodyPart[];
}

interface JmapBodyValue {
  value: string;
  isEncodingProblem: boolean;
  isTruncated: boolean;
}

interface JmapHeader {
  name: string;
  value: string;
}

interface JmapMethodCall {
  name: string;
  args: Record<string, any>;
  clientId: string;
}

interface JmapResponse {
  methodResponses: [string, any, string][];
  sessionState: string;
}

export class JmapProvider extends BaseEmailProvider {
  private session: JmapSession | null = null;
  private account: JmapAccount;
  private password: string;
  private primaryAccountId: string | null = null;
  private mailboxCache: Map<string, JmapMailbox> = new Map();

  constructor(account: JmapAccount, password: string) {
    super();
    this.account = account;
    this.password = password;
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.account.username}:${this.password}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async connect(): Promise<void> {
    try {
      // Fetch the JMAP session resource
      const response = await fetch(this.account.sessionUrl, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`JMAP session request failed: ${response.status} ${response.statusText}`);
      }

      this.session = await response.json() as JmapSession;

      // Get the primary mail account
      const primaryAccountId = this.session.primaryAccounts['urn:ietf:params:jmap:mail'];
      
      if (!primaryAccountId) {
        throw new Error('No mail account found in JMAP session');
      }
      
      this.primaryAccountId = primaryAccountId;

      this.connected = true;
      logger.debug(`Connected to JMAP server: ${this.account.sessionUrl}`);
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to JMAP: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.session = null;
    this.primaryAccountId = null;
    this.mailboxCache.clear();
    this.connected = false;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      await this.disconnect();
      return true;
    } catch (error) {
      logger.error(`Connection test failed: ${error}`);
      return false;
    }
  }

  private async makeRequest(methodCalls: JmapMethodCall[]): Promise<JmapResponse> {
    this.ensureConnected();

    const request = {
      using: [
        'urn:ietf:params:jmap:core',
        'urn:ietf:params:jmap:mail',
      ],
      methodCalls: methodCalls.map(call => [call.name, call.args, call.clientId]),
    };

    const response = await fetch(this.session!.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`JMAP request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json() as JmapResponse;
  }

  async getFolders(): Promise<Folder[]> {
    this.ensureConnected();

    const response = await this.makeRequest([
      {
        name: 'Mailbox/get',
        args: {
          accountId: this.primaryAccountId,
        },
        clientId: 'mailbox-get',
      },
    ]);

    const methodResponse = response.methodResponses[0];
    if (!methodResponse) {
      throw new Error('No response from JMAP server');
    }
    const [, result] = methodResponse;
    const mailboxes: JmapMailbox[] = result.list || [];

    // Cache mailboxes for later use
    this.mailboxCache.clear();
    for (const mailbox of mailboxes) {
      this.mailboxCache.set(mailbox.id, mailbox);
    }

    return this.convertMailboxesToFolders(mailboxes);
  }

  private convertMailboxesToFolders(mailboxes: JmapMailbox[]): Folder[] {
    // Build a tree structure
    const rootFolders: Folder[] = [];
    const folderMap = new Map<string, Folder>();

    // First pass: create folder objects
    for (const mailbox of mailboxes) {
      const folder: Folder = {
        name: mailbox.name,
        path: mailbox.id,
        delimiter: '/',
        flags: mailbox.role ? [mailbox.role] : [],
        messageCount: mailbox.totalEmails,
        unreadCount: mailbox.unreadEmails,
      };
      folderMap.set(mailbox.id, folder);
    }

    // Second pass: build tree structure
    for (const mailbox of mailboxes) {
      const folder = folderMap.get(mailbox.id)!;
      
      if (mailbox.parentId && folderMap.has(mailbox.parentId)) {
        const parent = folderMap.get(mailbox.parentId)!;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(folder);
      } else {
        rootFolders.push(folder);
      }
    }

    return rootFolders;
  }

  async getMessages(folder: string, limit: number = 0): Promise<EmailMessage[]> {
    this.ensureConnected();

    // First, query for email IDs in the mailbox
    const queryResponse = await this.makeRequest([
      {
        name: 'Email/query',
        args: {
          accountId: this.primaryAccountId,
          filter: {
            inMailbox: folder,
          },
          sort: [{ property: 'receivedAt', isAscending: false }],
          position: 0,
          limit: limit > 0 ? limit : null,
        },
        clientId: 'email-query',
      },
    ]);

    const queryMethodResponse = queryResponse.methodResponses[0];
    if (!queryMethodResponse) {
      throw new Error('No response from JMAP server');
    }
    const [, queryResult] = queryMethodResponse;
    const emailIds: string[] = queryResult.ids || [];

    if (emailIds.length === 0) {
      return [];
    }

    // Fetch email details
    const getResponse = await this.makeRequest([
      {
        name: 'Email/get',
        args: {
          accountId: this.primaryAccountId,
          ids: emailIds,
          properties: [
            'id', 'blobId', 'threadId', 'mailboxIds', 'keywords', 'size',
            'receivedAt', 'messageId', 'inReplyTo', 'references',
            'sender', 'from', 'to', 'cc', 'bcc', 'replyTo',
            'subject', 'sentAt', 'hasAttachment', 'preview',
            'bodyStructure', 'bodyValues', 'textBody', 'htmlBody', 'attachments',
          ],
          fetchTextBodyValues: true,
          fetchHTMLBodyValues: true,
          fetchAllBodyValues: true,
        },
        clientId: 'email-get',
      },
    ]);

    const getMethodResponse = getResponse.methodResponses[0];
    if (!getMethodResponse) {
      throw new Error('No response from JMAP server');
    }
    const [, getResult] = getMethodResponse;
    const emails: JmapEmail[] = getResult.list || [];

    return emails.map(email => this.convertJmapEmail(email, folder));
  }

  async getMessage(folder: string, id: string): Promise<EmailMessage> {
    this.ensureConnected();

    const response = await this.makeRequest([
      {
        name: 'Email/get',
        args: {
          accountId: this.primaryAccountId,
          ids: [id],
          properties: [
            'id', 'blobId', 'threadId', 'mailboxIds', 'keywords', 'size',
            'receivedAt', 'messageId', 'inReplyTo', 'references',
            'sender', 'from', 'to', 'cc', 'bcc', 'replyTo',
            'subject', 'sentAt', 'hasAttachment', 'preview',
            'bodyStructure', 'bodyValues', 'textBody', 'htmlBody', 'attachments',
          ],
          fetchTextBodyValues: true,
          fetchHTMLBodyValues: true,
          fetchAllBodyValues: true,
        },
        clientId: 'email-get-single',
      },
    ]);

    const methodResponse = response.methodResponses[0];
    if (!methodResponse) {
      throw new Error('No response from JMAP server');
    }
    const [, result] = methodResponse;
    const emails: JmapEmail[] = result.list || [];

    if (emails.length === 0) {
      throw new Error(`Email ${id} not found`);
    }

    const email = emails[0];
    if (!email) {
      throw new Error(`Email ${id} not found`);
    }

    return this.convertJmapEmail(email, folder);
  }

  private convertJmapEmail(email: JmapEmail, folder: string): EmailMessage {
    // Extract text body
    let text: string | undefined;
    if (email.textBody && email.bodyValues) {
      for (const part of email.textBody) {
        const bodyValue = part.partId ? email.bodyValues[part.partId] : undefined;
        if (bodyValue) {
          text = bodyValue.value;
          break;
        }
      }
    }

    // Extract HTML body
    let html: string | undefined;
    if (email.htmlBody && email.bodyValues) {
      for (const part of email.htmlBody) {
        const bodyValue = part.partId ? email.bodyValues[part.partId] : undefined;
        if (bodyValue) {
          html = bodyValue.value;
          break;
        }
      }
    }

    // Convert keywords to flags
    const flags: string[] = [];
    if (email.keywords) {
      if (email.keywords['$seen']) flags.push('\\Seen');
      if (email.keywords['$flagged']) flags.push('\\Flagged');
      if (email.keywords['$answered']) flags.push('\\Answered');
      if (email.keywords['$draft']) flags.push('\\Draft');
    }

    // Convert attachments
    const attachments = (email.attachments || []).map(att => ({
      filename: att.name || 'attachment',
      contentType: att.type,
      size: att.size,
      contentId: att.cid || undefined,
    }));

    // Get mailbox names as labels
    const labels: string[] = [];
    if (email.mailboxIds) {
      for (const mailboxId of Object.keys(email.mailboxIds)) {
        const mailbox = this.mailboxCache.get(mailboxId);
        if (mailbox) {
          labels.push(mailbox.name);
        }
      }
    }

    return {
      id: email.id,
      uid: parseInt(email.id.replace(/\D/g, '')) || 0,
      subject: email.subject || '(No Subject)',
      from: email.from?.[0] 
        ? { name: email.from[0].name || undefined, address: email.from[0].email }
        : { address: 'unknown' },
      to: (email.to || []).map(addr => ({
        name: addr.name || undefined,
        address: addr.email,
      })),
      cc: (email.cc || []).map(addr => ({
        name: addr.name || undefined,
        address: addr.email,
      })),
      bcc: (email.bcc || []).map(addr => ({
        name: addr.name || undefined,
        address: addr.email,
      })),
      date: new Date(email.receivedAt),
      headers: {},
      text,
      html,
      attachments,
      folder,
      labels,
      flags,
    };
  }

  async uploadMessages(folder: string, messages: EmailMessage[]): Promise<void> {
    this.ensureConnected();

    for (const message of messages) {
      await this.uploadMessage(folder, message);
    }
  }

  private async uploadMessage(folder: string, message: EmailMessage): Promise<void> {
    if (!message.raw) {
      throw new Error('Message must have raw content for upload');
    }

    // Upload the blob first
    const uploadUrl = this.session!.uploadUrl
      .replace('{accountId}', this.primaryAccountId!);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'message/rfc822',
      },
      body: message.raw,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Blob upload failed: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json() as { blobId: string; type: string; size: number };

    // Import the email
    const response = await this.makeRequest([
      {
        name: 'Email/import',
        args: {
          accountId: this.primaryAccountId,
          emails: {
            'import-1': {
              blobId: uploadResult.blobId,
              mailboxIds: { [folder]: true },
              keywords: {},
            },
          },
        },
        clientId: 'email-import',
      },
    ]);

    const methodResponse = response.methodResponses[0];
    if (!methodResponse) {
      throw new Error('No response from JMAP server');
    }
    const [methodName, result] = methodResponse;
    
    if (methodName === 'error') {
      throw new Error(`Email import failed: ${result.description || 'Unknown error'}`);
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    this.ensureConnected();

    const response = await this.makeRequest([
      {
        name: 'Mailbox/set',
        args: {
          accountId: this.primaryAccountId,
          create: {
            'new-mailbox': {
              name: folderPath,
              parentId: null,
            },
          },
        },
        clientId: 'mailbox-create',
      },
    ]);

    const createMethodResponse = response.methodResponses[0];
    if (!createMethodResponse) {
      throw new Error('No response from JMAP server');
    }
    const [methodName, result] = createMethodResponse;
    
    if (methodName === 'error' || (result.notCreated && result.notCreated['new-mailbox'])) {
      const error = result.notCreated?.['new-mailbox']?.description || result.description || 'Unknown error';
      throw new Error(`Failed to create folder: ${error}`);
    }
  }

  async deleteFolder(folderPath: string): Promise<void> {
    this.ensureConnected();

    const response = await this.makeRequest([
      {
        name: 'Mailbox/set',
        args: {
          accountId: this.primaryAccountId,
          destroy: [folderPath],
        },
        clientId: 'mailbox-delete',
      },
    ]);

    const deleteMethodResponse = response.methodResponses[0];
    if (!deleteMethodResponse) {
      throw new Error('No response from JMAP server');
    }
    const [deleteMethodName, deleteResult] = deleteMethodResponse;
    
    if (deleteMethodName === 'error' || (deleteResult.notDestroyed && deleteResult.notDestroyed[folderPath])) {
      const error = deleteResult.notDestroyed?.[folderPath]?.description || deleteResult.description || 'Unknown error';
      throw new Error(`Failed to delete folder: ${error}`);
    }
  }

  async getTotalMessageCount(): Promise<number> {
    const folders = await this.getFolders();
    return this.countMessages(folders);
  }

  private countMessages(folders: Folder[]): number {
    let total = 0;
    for (const folder of folders) {
      total += folder.messageCount || 0;
      if (folder.children) {
        total += this.countMessages(folder.children);
      }
    }
    return total;
  }

  /**
   * Download the raw RFC822 message content
   */
  async getRawMessage(blobId: string): Promise<string> {
    this.ensureConnected();

    const downloadUrl = this.session!.downloadUrl
      .replace('{accountId}', this.primaryAccountId!)
      .replace('{blobId}', blobId)
      .replace('{type}', 'message/rfc822')
      .replace('{name}', 'message.eml');

    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download message: ${response.status}`);
    }

    return await response.text();
  }
}
