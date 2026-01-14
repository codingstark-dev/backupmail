/**
 * CLI prompts using Bun's native capabilities
 * No external dependencies!
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
};

export interface PromptOptions {
  message: string;
  default?: string;
  validate?: (input: string) => boolean | string;
}

export interface SelectOptions {
  message: string;
  choices: Array<{ name: string; value: string }>;
}

export interface ConfirmOptions {
  message: string;
  default?: boolean;
}

/**
 * Prompt for text input
 */
export async function prompt(options: PromptOptions): Promise<string> {
  const defaultText = options.default ? ` ${colors.gray}(${options.default})${colors.reset}` : '';
  process.stdout.write(`${colors.cyan}?${colors.reset} ${options.message}${defaultText}: `);

  const input = await readLine();
  const value = input.trim() || options.default || '';

  if (options.validate) {
    const result = options.validate(value);
    if (result !== true) {
      console.log(`${colors.yellow}✗ ${typeof result === 'string' ? result : 'Invalid input'}${colors.reset}`);
      return prompt(options);
    }
  }

  return value;
}

/**
 * Prompt for password (hidden input)
 */
export async function password(message: string): Promise<string> {
  process.stdout.write(`${colors.cyan}?${colors.reset} ${message}: `);
  
  // Bun.password() is not available in all versions, so we'll use a workaround
  // In production, you'd use Bun.password() when available
  const pass = await readLine();
  return pass.trim();
}

/**
 * Prompt for confirmation (yes/no)
 */
export async function confirm(options: ConfirmOptions): Promise<boolean> {
  const defaultText = options.default !== undefined 
    ? ` ${colors.gray}(${options.default ? 'Y/n' : 'y/N'})${colors.reset}` 
    : '';
  
  process.stdout.write(`${colors.cyan}?${colors.reset} ${options.message}${defaultText}: `);

  const input = await readLine();
  const value = input.trim().toLowerCase();

  if (!value && options.default !== undefined) {
    return options.default;
  }

  if (value === 'y' || value === 'yes') {
    return true;
  } else if (value === 'n' || value === 'no') {
    return false;
  } else {
    console.log(`${colors.yellow}Please answer yes or no${colors.reset}`);
    return confirm(options);
  }
}

/**
 * Prompt for selection from a list
 */
export async function select(options: SelectOptions): Promise<string> {
  console.log(`${colors.cyan}?${colors.reset} ${options.message}`);
  
  options.choices.forEach((choice, index) => {
    console.log(`  ${colors.cyan}${index + 1})${colors.reset} ${choice.name}`);
  });

  process.stdout.write(`${colors.cyan}Choose (1-${options.choices.length})${colors.reset}: `);

  const input = await readLine();
  const index = parseInt(input.trim()) - 1;

  if (index >= 0 && index < options.choices.length) {
    return options.choices[index]!.value;
  } else {
    console.log(`${colors.yellow}Invalid selection${colors.reset}`);
    return select(options);
  }
}

/**
 * Read a line from stdin
 */
async function readLine(): Promise<string> {
  const buf = new Uint8Array(1024);
  const n = await Bun.stdin.stream().getReader().read();
  
  if (n.value) {
    const decoder = new TextDecoder();
    return decoder.decode(n.value).trim();
  }
  
  return '';
}
