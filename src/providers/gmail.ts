/**
 * Gmail Provider with OAuth2 authentication
 * Uses Gmail API for high-performance email access
 */

import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { BaseEmailProvider } from './base';
import type { EmailMessage, Folder, GmailAccount } from '../types';
import { logger } from '../utils/logger';

export class GmailProvider extends BaseEmailProvider {
  private gmail: gmail_v1.Gmail | null = null;
  private auth: OAuth2Client;
  private account: GmailAccount;

  constructor(account: GmailAccount, clientId: string, clientSecret: string) {
    super();
    this.account = account;
    
    this.auth = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'urn:ietf:wg:oauth:2.0:oob' // For CLI apps
    );

    // Set refresh token if available
    if (account.refreshToken) {
      this.auth.setCredentials({
        refresh_token: account.refreshToken,
      });
    }
  }

  async connect(): Promise<void> {
    try {
      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      
      // Test the connection by fetching the profile
      await this.gmail.users.getProfile({ userId: 'me' });
      
      this.connected = true;
      logger.debug('Connected to Gmail API');
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to Gmail: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.gmail = null;
    this.connected = false;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      return true;
    } catch (error) {
      logger.error(`Connection test failed: ${error}`);
      return false;
    }
  }

  async getFolders(): Promise<Folder[]> {
    this.ensureConnected();

    try {
      const response = await this.gmail!.users.labels.list({ userId: 'me' });
      const labels = response.data.labels || [];

      return labels.map((label) => ({
        name: label.name || '',
        path: label.id || '',
        delimiter: '/',
        flags: [label.type || ''],
        messageCount: label.messagesTotal ?? undefined,
        unreadCount: label.messagesUnread ?? undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch Gmail labels: ${error}`);
    }
  }

  async getMessages(folder: string, limit: number = 0): Promise<EmailMessage[]> {
    this.ensureConnected();

    try {
      // List messages in the label/folder
      const listResponse = await this.gmail!.users.messages.list({
        userId: 'me',
        labelIds: [folder],
        maxResults: limit > 0 ? limit : 500, // Gmail API max is 500 per request
      });

      const messageIds = listResponse.data.messages || [];
      const messages: EmailMessage[] = [];

      // Fetch each message in batch
      for (const { id } of messageIds) {
        if (!id) continue;
        
        try {
          const message = await this.getMessage(folder, id);
          messages.push(message);
        } catch (error) {
          logger.warn(`Failed to fetch message ${id}: ${error}`);
        }
      }

      return messages;
    } catch (error) {
      throw new Error(`Failed to fetch messages from ${folder}: ${error}`);
    }
  }

  async getMessage(folder: string, id: string): Promise<EmailMessage> {
    this.ensureConnected();

    try {
      const response = await this.gmail!.users.messages.get({
        userId: 'me',
        id,
        format: 'full',
      });

      const message = response.data;
      return this.parseGmailMessage(message);
    } catch (error) {
      throw new Error(`Failed to fetch message ${id}: ${error}`);
    }
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

    try {
      // Convert raw message to base64url format
      const raw = Buffer.from(message.raw).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await this.gmail!.users.messages.import({
        userId: 'me',
        requestBody: {
          raw,
          labelIds: [folder],
        },
      });
    } catch (error) {
      throw new Error(`Failed to upload message: ${error}`);
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    this.ensureConnected();

    try {
      await this.gmail!.users.labels.create({
        userId: 'me',
        requestBody: {
          name: folderPath,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });
    } catch (error) {
      throw new Error(`Failed to create folder ${folderPath}: ${error}`);
    }
  }

  async deleteFolder(folderPath: string): Promise<void> {
    this.ensureConnected();

    try {
      await this.gmail!.users.labels.delete({
        userId: 'me',
        id: folderPath,
      });
    } catch (error) {
      throw new Error(`Failed to delete folder ${folderPath}: ${error}`);
    }
  }

  async getTotalMessageCount(): Promise<number> {
    this.ensureConnected();

    try {
      const profile = await this.gmail!.users.getProfile({ userId: 'me' });
      return profile.data.messagesTotal || 0;
    } catch (error) {
      throw new Error(`Failed to get total message count: ${error}`);
    }
  }

  private parseGmailMessage(message: gmail_v1.Schema$Message): EmailMessage {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) => 
      headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const parseAddresses = (addressString: string): Array<{ name?: string; address: string }> => {
      if (!addressString) return [];
      return addressString.split(',').map(addr => {
        const match = addr.match(/(.*?)\s*<(.+?)>/) || [null, null, addr.trim()];
        return {
          name: match[1]?.trim(),
          address: match[2]?.trim() || addr.trim(),
        };
      });
    };

    return {
      id: message.id || '',
      uid: parseInt(message.id || '0'),
      subject: getHeader('Subject'),
      from: parseAddresses(getHeader('From'))[0] || { address: 'unknown' },
      to: parseAddresses(getHeader('To')),
      cc: parseAddresses(getHeader('Cc')),
      bcc: parseAddresses(getHeader('Bcc')),
      date: new Date(parseInt(message.internalDate || '0')),
      headers: headers.reduce((acc, h) => {
        if (h.name && h.value) {
          acc[h.name] = h.value;
        }
        return acc;
      }, {} as Record<string, string>),
      text: this.extractTextContent(message.payload),
      html: this.extractHtmlContent(message.payload),
      attachments: this.extractAttachments(message.payload),
      labels: message.labelIds ?? undefined,
      flags: [],
      raw: message.raw ? Buffer.from(message.raw, 'base64').toString('utf8') : undefined,
    };
  }

  private extractTextContent(payload?: gmail_v1.Schema$MessagePart): string | undefined {
    if (!payload) return undefined;

    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        const text = this.extractTextContent(part);
        if (text) return text;
      }
    }

    return undefined;
  }

  private extractHtmlContent(payload?: gmail_v1.Schema$MessagePart): string | undefined {
    if (!payload) return undefined;

    if (payload.mimeType === 'text/html' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        const html = this.extractHtmlContent(part);
        if (html) return html;
      }
    }

    return undefined;
  }

  private extractAttachments(payload?: gmail_v1.Schema$MessagePart): Array<any> {
    const attachments: Array<any> = [];

    if (!payload) return attachments;

    const processpart = (part: gmail_v1.Schema$MessagePart) => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          contentType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
          contentId: part.body.attachmentId,
        });
      }

      if (part.parts) {
        part.parts.forEach(processPart);
      }
    };

    const processPart = processpart;
    processpart(payload);

    return attachments;
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels',
    ];

    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<{ refresh_token?: string; access_token?: string }> {
    const { tokens } = await this.auth.getToken(code);
    this.auth.setCredentials(tokens);
    return {
      refresh_token: tokens.refresh_token ?? undefined,
      access_token: tokens.access_token ?? undefined,
    };
  }
}
