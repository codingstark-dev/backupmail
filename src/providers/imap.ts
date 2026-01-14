/**
 * IMAP Email Provider
 * Supports SpaceMail and any other IMAP-compatible email service
 */

import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { BaseEmailProvider } from './base';
import type { EmailMessage, Folder, ImapAccount } from '../types';
import { logger } from '../utils/logger';

export interface ImapConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  tlsOptions?: {
    rejectUnauthorized?: boolean;
  };
}

export class ImapProvider extends BaseEmailProvider {
  private imap: Imap | null = null;
  private config: ImapConfig;
  private account: ImapAccount;

  constructor(account: ImapAccount, password: string) {
    super();
    this.account = account;
    this.config = {
      user: account.username,
      password,
      host: account.host,
      port: account.port,
      tls: account.secure,
      tlsOptions: { rejectUnauthorized: false },
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap = new Imap(this.config);

      this.imap.once('ready', () => {
        this.connected = true;
        logger.debug(`Connected to IMAP server ${this.config.host}`);
        resolve();
      });

      this.imap.once('error', (err) => {
        this.connected = false;
        logger.error(`IMAP connection error: ${err.message}`);
        reject(err);
      });

      this.imap.once('end', () => {
        this.connected = false;
        logger.debug('IMAP connection ended');
      });

      this.imap.connect();
    });
  }

  async disconnect(): Promise<void> {
    if (this.imap) {
      this.imap.end();
      this.imap = null;
      this.connected = false;
    }
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

  async getFolders(): Promise<Folder[]> {
    this.ensureConnected();
    
    return new Promise((resolve, reject) => {
      this.imap!.getBoxes((err, boxes) => {
        if (err) {
          reject(err);
          return;
        }

        const folders = this.parseBoxes(boxes);
        resolve(folders);
      });
    });
  }

  private parseBoxes(boxes: any, parentPath: string = ''): Folder[] {
    const folders: Folder[] = [];

    for (const [name, box] of Object.entries<any>(boxes)) {
      const path = parentPath ? `${parentPath}${box.delimiter}${name}` : name;
      
      const folder: Folder = {
        name,
        path,
        delimiter: box.delimiter,
        flags: box.attribs || [],
      };

      if (box.children) {
        folder.children = this.parseBoxes(box.children, path);
      }

      folders.push(folder);
    }

    return folders;
  }

  async getMessages(folder: string, limit: number = 0): Promise<EmailMessage[]> {
    this.ensureConnected();

    return new Promise((resolve, reject) => {
      this.imap!.openBox(folder, true, async (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        const totalMessages = box.messages.total;
        if (totalMessages === 0) {
          resolve([]);
          return;
        }

        // Calculate the range to fetch
        const start = limit > 0 && limit < totalMessages ? totalMessages - limit + 1 : 1;
        const end = totalMessages;
        const range = `${start}:${end}`;

        logger.debug(`Fetching messages ${range} from ${folder}`);

        const messages: EmailMessage[] = [];
        const fetch = this.imap!.seq.fetch(range, {
          bodies: '',
          struct: true,
        });

        fetch.on('message', (msg, seqno) => {
          let buffer = '';
          let uid = 0;

          msg.on('body', (stream) => {
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
          });

          msg.once('attributes', (attrs) => {
            uid = attrs.uid;
          });

          msg.once('end', async () => {
            try {
              const parsed = await simpleParser(buffer);
              const emailMessage = this.parseMessage(parsed, uid, folder);
              messages.push(emailMessage);
            } catch (error) {
              logger.warn(`Failed to parse message ${uid}: ${error}`);
            }
          });
        });

        fetch.once('error', reject);

        fetch.once('end', () => {
          resolve(messages);
        });
      });
    });
  }

  async getMessage(folder: string, id: string): Promise<EmailMessage> {
    this.ensureConnected();

    return new Promise((resolve, reject) => {
      this.imap!.openBox(folder, true, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        const fetch = this.imap!.fetch([id], {
          bodies: '',
          struct: true,
        });

        let message: EmailMessage | null = null;

        fetch.on('message', (msg) => {
          let buffer = '';
          let uid = 0;

          msg.on('body', (stream) => {
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
          });

          msg.once('attributes', (attrs) => {
            uid = attrs.uid;
          });

          msg.once('end', async () => {
            try {
              const parsed = await simpleParser(buffer);
              message = this.parseMessage(parsed, uid, folder);
            } catch (error) {
              reject(error);
            }
          });
        });

        fetch.once('error', reject);

        fetch.once('end', () => {
          if (message) {
            resolve(message);
          } else {
            reject(new Error(`Message ${id} not found`));
          }
        });
      });
    });
  }

  async uploadMessages(folder: string, messages: EmailMessage[]): Promise<void> {
    this.ensureConnected();

    for (const message of messages) {
      await this.uploadMessage(folder, message);
    }
  }

  private async uploadMessage(folder: string, message: EmailMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!message.raw) {
        reject(new Error('Message must have raw content for upload'));
        return;
      }

      this.imap!.openBox(folder, false, (err) => {
        if (err) {
          reject(err);
          return;
        }

        this.imap!.append(message.raw!, {
          mailbox: folder,
          flags: message.flags || [],
          date: message.date,
        }, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  async createFolder(folderPath: string): Promise<void> {
    this.ensureConnected();

    return new Promise((resolve, reject) => {
      this.imap!.addBox(folderPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async deleteFolder(folderPath: string): Promise<void> {
    this.ensureConnected();

    return new Promise((resolve, reject) => {
      this.imap!.delBox(folderPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async getTotalMessageCount(): Promise<number> {
    const folders = await this.getFolders();
    let total = 0;

    for (const folder of folders) {
      const count = await this.getFolderMessageCount(folder.path);
      total += count;
    }

    return total;
  }

  private async getFolderMessageCount(folder: string): Promise<number> {
    this.ensureConnected();

    return new Promise((resolve, reject) => {
      this.imap!.openBox(folder, true, (err, box) => {
        if (err) {
          reject(err);
        } else {
          resolve(box.messages.total);
        }
      });
    });
  }

  private parseMessage(parsed: any, uid: number, folder: string): EmailMessage {
    return {
      id: parsed.messageId || `${uid}`,
      uid,
      subject: parsed.subject || '(No Subject)',
      from: parsed.from?.value?.[0] || { address: 'unknown' },
      to: parsed.to?.value || [],
      cc: parsed.cc?.value,
      bcc: parsed.bcc?.value,
      date: parsed.date || new Date(),
      headers: parsed.headers || {},
      text: parsed.text,
      html: parsed.html,
      attachments: (parsed.attachments || []).map((att: any) => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        content: att.content,
        contentId: att.contentId,
      })),
      folder,
      flags: [],
      raw: parsed.raw,
    };
  }
}
