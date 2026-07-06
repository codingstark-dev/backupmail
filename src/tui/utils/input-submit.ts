import { InputRenderableEvents } from '@opentui/core';

export interface SubmitInput {
  readonly value: string;
  on(eventName: InputRenderableEvents.ENTER, listener: (value: string) => void): void;
}

export interface InputSubmitOptions {
  readonly fallbackValue?: string;
}

export function getSubmittedInputValue(value: string, fallbackValue = ''): string {
  const trimmedValue = value.trim();
  return trimmedValue || fallbackValue;
}

export function bindInputSubmit(
  input: SubmitInput,
  onSubmit: (value: string) => void,
  options: InputSubmitOptions = {},
): void {
  input.on(InputRenderableEvents.ENTER, (value) => {
    onSubmit(getSubmittedInputValue(value, options.fallbackValue));
  });
}
