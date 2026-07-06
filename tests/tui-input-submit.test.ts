import { expect, test } from 'bun:test';
import { InputRenderableEvents } from '@opentui/core';
import { bindInputSubmit } from '../src/tui/utils/input-submit';

type InputListener = (value: string) => void;

class FakeInput {
  readonly listeners: Partial<Record<InputRenderableEvents, InputListener[]>> = {};
  value = '';

  on(eventName: InputRenderableEvents, listener: InputListener): void {
    const listeners = this.listeners[eventName] ?? [];
    listeners.push(listener);
    this.listeners[eventName] = listeners;
  }

  submit(value: string): void {
    for (const listener of this.listeners[InputRenderableEvents.ENTER] ?? []) {
      listener(value);
    }
  }
}

test('bindInputSubmit submits an unchanged default value when Enter is pressed', () => {
  const input = new FakeInput();
  const submittedValues: string[] = [];

  input.value = '993';
  bindInputSubmit(input, (value) => {
    submittedValues.push(value);
  });

  input.submit('993');

  expect(submittedValues).toEqual(['993']);
});

test('bindInputSubmit trims entered values and falls back for blank submissions', () => {
  const input = new FakeInput();
  const submittedValues: string[] = [];

  bindInputSubmit(
    input,
    (value) => {
      submittedValues.push(value);
    },
    { fallbackValue: './email-backups' },
  );

  input.submit('  ');
  input.submit('  /tmp/mail  ');

  expect(submittedValues).toEqual(['./email-backups', '/tmp/mail']);
});
