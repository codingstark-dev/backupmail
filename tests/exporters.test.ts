/**
 * MBOX Exporter Tests
 */

import { test, expect, beforeEach, afterEach } from 'bun:test';
import { MboxExporter, MboxImporter } from '../src/exporters/mbox';
import { join } from 'path';
import type { EmailMessage } from '../src/types';

const testOutputDir = join(import.meta.dir, '.test-output');

beforeEach(async () => {
  await Bun.$`rm -rf ${testOutputDir}`.quiet();
  await Bun.$`mkdir -p ${testOutputDir}`.quiet();
});

afterEach(async () => {
  await Bun.$`rm -rf ${testOutputDir}`.quiet();
});

const createTestMessage = (id: number): EmailMessage => ({
  id: `${id}`,
  uid: id,
  subject: `Test Email ${id}`,
  from: { name: 'Sender Name', address: 'sender@example.com' },
  to: [{ name: 'Recipient', address: 'recipient@example.com' }],
  date: new Date('2024-01-01T00:00:00Z'),
  headers: {
    'Message-ID': `${id}@example.com`,
  },
  text: 'This is a test email body.',
  attachments: [],
});

test('MboxExporter: export single message', async () => {
  const exporter = new MboxExporter();
  const messages = [createTestMessage(1)];
  const outputPath = join(testOutputDir, 'test.mbox');

  await exporter.export(messages, outputPath);

  const file = Bun.file(outputPath);
  expect(await file.exists()).toBe(true);

  const content = await file.text();
  expect(content).toContain('From sender@example.com');
  expect(content).toContain('Subject: Test Email 1');
  expect(content).toContain('This is a test email body.');
});

test('MboxExporter: export multiple messages', async () => {
  const exporter = new MboxExporter();
  const messages = [
    createTestMessage(1),
    createTestMessage(2),
    createTestMessage(3),
  ];
  const outputPath = join(testOutputDir, 'test.mbox');

  await exporter.export(messages, outputPath);

  const content = await Bun.file(outputPath).text();
  
  // Should contain all messages
  expect(content).toContain('Test Email 1');
  expect(content).toContain('Test Email 2');
  expect(content).toContain('Test Email 3');
});

test('MboxExporter: export by folder', async () => {
  const exporter = new MboxExporter();
  const messagesByFolder = new Map<string, EmailMessage[]>([
    ['Inbox', [createTestMessage(1), createTestMessage(2)]],
    ['Sent', [createTestMessage(3)]],
  ]);

  await exporter.exportByFolder(messagesByFolder, testOutputDir);

  const inboxFile = Bun.file(join(testOutputDir, 'inbox.mbox'));
  const sentFile = Bun.file(join(testOutputDir, 'sent.mbox'));

  expect(await inboxFile.exists()).toBe(true);
  expect(await sentFile.exists()).toBe(true);
});

test('MboxImporter: import messages', async () => {
  // First, create an MBOX file
  const exporter = new MboxExporter();
  const messages = [createTestMessage(1), createTestMessage(2)];
  const mboxPath = join(testOutputDir, 'test.mbox');

  await exporter.export(messages, mboxPath);

  // Now import it
  const importer = new MboxImporter();
  const imported = await importer.import(mboxPath);

  expect(imported.length).toBe(2);
  expect(imported[0]?.subject).toContain('Test Email');
});
