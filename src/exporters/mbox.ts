/**
 * MBOX Exporter
 * Exports emails to the MBOX format (standard Unix mailbox format)
 */

import { join } from 'path';
import type { EmailMessage } from '../types';
import { logger } from '../utils/logger';

export class MboxExporter {
  /**
   * Export messages to MBOX format
   * @param messages - Array of email messages
   * @param outputPath - Path to the output MBOX file
   */
  async export(messages: EmailMessage[], outputPath: string): Promise<void> {
    logger.debug(`Exporting ${messages.length} messages to MBOX: ${outputPath}`);

    const mboxContent = this.messagesToMbox(messages);
    
    try {
      await Bun.write(outputPath, mboxContent);
      logger.success(`Exported ${messages.length} messages to ${outputPath}`);
    } catch (error) {
      throw new Error(`Failed to write MBOX file: ${error}`);
    }
  }

  /**
   * Export messages to MBOX format, organized by folder
   * @param messagesByFolder - Map of folder names to messages
   * @param outputDir - Directory to save MBOX files
   */
  async exportByFolder(
    messagesByFolder: Map<string, EmailMessage[]>,
    outputDir: string
  ): Promise<void> {
    for (const [folder, messages] of messagesByFolder.entries()) {
      const safeFolder = this.sanitizeFolderName(folder);
      const outputPath = join(outputDir, `${safeFolder}.mbox`);
      await this.export(messages, outputPath);
    }
  }

  /**
   * Convert messages to MBOX format string
   */
  private messagesToMbox(messages: EmailMessage[]): string {
    let mbox = '';

    for (const message of messages) {
      mbox += this.messageToMboxEntry(message);
    }

    return mbox;
  }

  /**
   * Convert a single message to MBOX entry
   */
  private messageToMboxEntry(message: EmailMessage): string {
    // MBOX format starts with "From " (with a space) followed by sender and date
    const fromLine = this.createFromLine(message);
    
    // Get the raw message or reconstruct it
    const messageContent = message.raw || this.reconstructRawMessage(message);
    
    // Escape "From " lines in the body (MBOX requirement)
    const escapedContent = messageContent.replace(/^From /gm, '>From ');
    
    // MBOX entries are separated by a blank line
    return `${fromLine}\n${escapedContent}\n\n`;
  }

  /**
   * Create the "From " line that starts each MBOX entry
   */
  private createFromLine(message: EmailMessage): string {
    const sender = message.from.address || 'unknown';
    const date = message.date.toString();
    
    return `From ${sender} ${date}`;
  }

  /**
   * Reconstruct raw message from EmailMessage object
   * This is needed when the raw content is not available
   */
  private reconstructRawMessage(message: EmailMessage): string {
    const lines: string[] = [];

    // Add headers
    const headers = this.buildHeaders(message);
    lines.push(...headers);
    
    // Blank line between headers and body
    lines.push('');
    
    // Add body
    const hasAttachments = message.attachments && message.attachments.length > 0;
    
    if (hasAttachments) {
      // Multipart message
      const boundary = this.generateBoundary();
      const body = this.buildMultipartBody(message, boundary);
      lines.push(...body);
    } else {
      // Simple message
      const body = message.html || message.text || '';
      lines.push(body);
    }

    return lines.join('\n');
  }

  /**
   * Build email headers
   */
  private buildHeaders(message: EmailMessage): string[] {
    const headers: string[] = [];

    // Essential headers
    headers.push(`From: ${this.formatAddress(message.from)}`);
    headers.push(`To: ${message.to.map(a => this.formatAddress(a)).join(', ')}`);
    
    if (message.cc && message.cc.length > 0) {
      headers.push(`Cc: ${message.cc.map(a => this.formatAddress(a)).join(', ')}`);
    }
    
    headers.push(`Subject: ${message.subject}`);
    headers.push(`Date: ${message.date.toUTCString()}`);
    headers.push(`Message-ID: ${message.id}`);
    
    // Content type
    const hasAttachments = message.attachments && message.attachments.length > 0;
    if (hasAttachments) {
      const boundary = this.generateBoundary();
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    } else if (message.html) {
      headers.push('Content-Type: text/html; charset=utf-8');
    } else {
      headers.push('Content-Type: text/plain; charset=utf-8');
    }
    
    // Add any additional headers from the original message
    for (const [key, value] of Object.entries(message.headers || {})) {
      const lowerKey = key.toLowerCase();
      // Skip headers we've already added
      if (!['from', 'to', 'cc', 'subject', 'date', 'message-id', 'content-type'].includes(lowerKey)) {
        headers.push(`${key}: ${value}`);
      }
    }

    return headers;
  }

  /**
   * Build multipart body with attachments
   */
  private buildMultipartBody(message: EmailMessage, boundary: string): string[] {
    const lines: string[] = [];
    
    // Text/HTML part
    lines.push(`--${boundary}`);
    if (message.html) {
      lines.push('Content-Type: text/html; charset=utf-8');
      lines.push('');
      lines.push(message.html);
    } else {
      lines.push('Content-Type: text/plain; charset=utf-8');
      lines.push('');
      lines.push(message.text || '');
    }
    
    // Attachments
    for (const attachment of message.attachments) {
      lines.push('');
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${attachment.contentType}`);
      lines.push('Content-Transfer-Encoding: base64');
      lines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
      lines.push('');
      
      if (attachment.content) {
        lines.push(attachment.content.toString('base64'));
      } else {
        lines.push('[Attachment content not available]');
      }
    }
    
    lines.push('');
    lines.push(`--${boundary}--`);
    
    return lines;
  }

  /**
   * Format email address
   */
  private formatAddress(addr: { name?: string; address: string }): string {
    if (addr.name) {
      return `"${addr.name}" <${addr.address}>`;
    }
    return addr.address;
  }

  /**
   * Generate a MIME boundary
   */
  private generateBoundary(): string {
    return `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Sanitize folder name for use as filename
   */
  private sanitizeFolderName(folder: string): string {
    return folder
      .replace(/[^a-z0-9_\-]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
  }
}

/**
 * MBOX Importer
 * Import emails from MBOX format
 */
export class MboxImporter {
  /**
   * Import messages from an MBOX file
   * @param mboxPath - Path to the MBOX file
   * @returns Array of parsed email messages
   */
  async import(mboxPath: string): Promise<EmailMessage[]> {
    logger.debug(`Importing messages from MBOX: ${mboxPath}`);

    try {
      const file = Bun.file(mboxPath);
      const content = await file.text();
      
      const messages = this.parseMbox(content);
      logger.success(`Imported ${messages.length} messages from ${mboxPath}`);
      
      return messages;
    } catch (error) {
      throw new Error(`Failed to read MBOX file: ${error}`);
    }
  }

  /**
   * Parse MBOX content into individual messages
   */
  private parseMbox(content: string): EmailMessage[] {
    const messages: EmailMessage[] = [];
    
    // Split on "From " lines (MBOX separator)
    // This regex matches lines that start with "From " at the beginning of a line
    const entries = content.split(/^From /m).filter(entry => entry.trim());
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;
      
      try {
        // Skip the envelope line and parse the rest
        const messageContent = entry.substring(entry.indexOf('\n') + 1);
        const message = this.parseMessage(messageContent, i + 1);
        messages.push(message);
      } catch (error) {
        logger.warn(`Failed to parse MBOX entry ${i + 1}: ${error}`);
      }
    }
    
    return messages;
  }

  /**
   * Parse a single message from MBOX entry
   */
  private parseMessage(content: string, uid: number): EmailMessage {
    // For simplicity, we'll extract basic info
    // In production, you'd use mailparser for full parsing
    const lines = content.split('\n');
    const headers: Record<string, string> = {};
    let bodyStartIndex = 0;
    
    // Parse headers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      if (line.trim() === '') {
        bodyStartIndex = i + 1;
        break;
      }
      
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match && match[1] && match[2]) {
        headers[match[1]] = match[2];
      }
    }
    
    // Get body
    const body = lines.slice(bodyStartIndex).join('\n');
    
    return {
      id: headers['Message-ID'] || `${uid}`,
      uid,
      subject: headers['Subject'] || '(No Subject)',
      from: this.parseAddress(headers['From'] || 'unknown'),
      to: this.parseAddresses(headers['To'] || ''),
      cc: this.parseAddresses(headers['Cc'] || ''),
      date: new Date(headers['Date'] || Date.now()),
      headers,
      text: body,
      attachments: [],
      raw: content,
    };
  }

  /**
   * Parse email address
   */
  private parseAddress(addr: string): { name?: string; address: string } {
    const match = addr.match(/"?([^"]*)"?\s*<(.+)>/) || [null, null, addr.trim()];
    return {
      name: match[1]?.trim() || undefined,
      address: match[2]?.trim() || addr.trim(),
    };
  }

  /**
   * Parse multiple email addresses
   */
  private parseAddresses(addrs: string): Array<{ name?: string; address: string }> {
    if (!addrs) return [];
    return addrs.split(',').map(addr => this.parseAddress(addr.trim()));
  }
}
