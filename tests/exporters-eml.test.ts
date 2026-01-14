/**
 * EML and JSON Exporter Tests
 */

import { test, expect, beforeEach, afterEach } from 'bun:test';
import { EmlExporter, JsonExporter } from '../src/exporters/eml';
import { join } from 'path';
import type { EmailMessage } from '../src/types';

const testOutputDir = join(import.meta.dir, '.test-output-eml');

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

test('EmlExporter: export single message', async () => {
  const exporter = new EmlExporter();
  const messages = [createTestMessage(1)];

  await exporter.export(messages, testOutputDir);

  const files = await Array.fromAsync(new Bun.Glob('*.eml').scan(testOutputDir));
  expect(files.length).toBe(1);
});

test('EmlExporter: export multiple messages', async () => {
  const exporter = new EmlExporter();
  const messages = [
    createTestMessage(1),
    createTestMessage(2),
    createTestMessage(3),
  ];

  await exporter.export(messages, testOutputDir);

  const files = await Array.fromAsync(new Bun.Glob('*.eml').scan(testOutputDir));
  expect(files.length).toBe(3);
});

test('JsonExporter: export messages', async () => {
  const exporter = new JsonExporter();
  const messages = [createTestMessage(1), createTestMessage(2)];
  const outputPath = join(testOutputDir, 'test.json');

  await exporter.export(messages, outputPath);

  const file = Bun.file(outputPath);
  expect(await file.exists()).toBe(true);

  const content = await file.json();
  expect(Array.isArray(content)).toBe(true);
  expect(content.length).toBe(2);
  expect(content[0].subject).toBe('Test Email 1');
});

test('JsonExporter: export by folder', async () => {
  const exporter = new JsonExporter();
  const messagesByFolder = new Map<string, EmailMessage[]>([
    ['Inbox', [createTestMessage(1), createTestMessage(2)]],
    ['Sent', [createTestMessage(3)]],
  ]);

  await exporter.exportByFolder(messagesByFolder, testOutputDir);

  const inboxFile = Bun.file(join(testOutputDir, 'inbox.json'));
  const sentFile = Bun.file(join(testOutputDir, 'sent.json'));

  expect(await inboxFile.exists()).toBe(true);
  expect(await sentFile.exists()).toBe(true);

  const inboxData = await inboxFile.json();
  expect(inboxData.length).toBe(2);
});

test('JsonExporter: export all messages to single file', async () => {
  const exporter = new JsonExporter();
  const messagesByFolder = new Map<string, EmailMessage[]>([
    ['Inbox', [createTestMessage(1), createTestMessage(2)]],
    ['Sent', [createTestMessage(3)]],
  ]);
  const outputPath = join(testOutputDir, 'all.json');

  await exporter.exportAll(messagesByFolder, outputPath);

  const content = await Bun.file(outputPath).json();
  expect(content.Inbox).toBeDefined();
  expect(content.Sent).toBeDefined();
  expect(content.Inbox.length).toBe(2);
  expect(content.Sent.length).toBe(1);
});
