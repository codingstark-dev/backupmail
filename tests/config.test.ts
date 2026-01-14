/**
 * Configuration Manager Tests
 */

import { test, expect, beforeEach, afterEach } from 'bun:test';
import { ConfigManager } from '../src/utils/config';
import { join } from 'path';
import type { Account } from '../src/types';

const testConfigDir = join(import.meta.dir, '.test-config');

beforeEach(async () => {
  // Clean up test directory
  await Bun.$`rm -rf ${testConfigDir}`.quiet();
});

afterEach(async () => {
  // Clean up test directory
  await Bun.$`rm -rf ${testConfigDir}`.quiet();
});

test('ConfigManager: init creates config directory and file', async () => {
  const manager = new ConfigManager(testConfigDir);
  await manager.init();

  const configFile = Bun.file(join(testConfigDir, 'config.json'));
  expect(await configFile.exists()).toBe(true);
});

test('ConfigManager: load returns default config', async () => {
  const manager = new ConfigManager(testConfigDir);
  const config = await manager.load();

  expect(config).toBeDefined();
  expect(config.accounts).toEqual({});
  expect(config.configDir).toBe(testConfigDir);
});

test('ConfigManager: save and retrieve account', async () => {
  const manager = new ConfigManager(testConfigDir);
  await manager.init();

  const account: Account = {
    id: 'test123',
    name: 'Test Account',
    email: 'test@example.com',
    type: 'imap',
    createdAt: new Date(),
  };

  await manager.saveAccount(account);
  const retrieved = await manager.getAccount('test123');

  expect(retrieved).toBeDefined();
  expect(retrieved?.email).toBe('test@example.com');
});

test('ConfigManager: get all accounts', async () => {
  const manager = new ConfigManager(testConfigDir);
  await manager.init();

  const account1: Account = {
    id: 'test1',
    name: 'Account 1',
    email: 'test1@example.com',
    type: 'imap',
    createdAt: new Date(),
  };

  const account2: Account = {
    id: 'test2',
    name: 'Account 2',
    email: 'test2@example.com',
    type: 'gmail',
    createdAt: new Date(),
  };

  await manager.saveAccount(account1);
  await manager.saveAccount(account2);

  const accounts = await manager.getAccounts();
  expect(accounts.length).toBe(2);
});

test('ConfigManager: remove account', async () => {
  const manager = new ConfigManager(testConfigDir);
  await manager.init();

  const account: Account = {
    id: 'test123',
    name: 'Test Account',
    email: 'test@example.com',
    type: 'imap',
    createdAt: new Date(),
  };

  await manager.saveAccount(account);
  await manager.removeAccount('test123');

  const retrieved = await manager.getAccount('test123');
  expect(retrieved).toBeNull();
});

test('ConfigManager: save and load credentials', async () => {
  const manager = new ConfigManager(testConfigDir);
  await manager.init();

  const credentials = {
    password: 'test-password',
    username: 'test-user',
  };

  await manager.saveCredentials('test123', credentials);
  const retrieved = await manager.loadCredentials('test123');

  expect(retrieved).toEqual(credentials);
});

test('ConfigManager: default account', async () => {
  const manager = new ConfigManager(testConfigDir);
  await manager.init();

  const account: Account = {
    id: 'test123',
    name: 'Test Account',
    email: 'test@example.com',
    type: 'imap',
    createdAt: new Date(),
  };

  await manager.saveAccount(account);
  await manager.setDefaultAccount('test123');

  const defaultAccount = await manager.getDefaultAccount();
  expect(defaultAccount?.id).toBe('test123');
});
