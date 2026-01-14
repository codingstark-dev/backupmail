/**
 * Lightweight CLI parser using Bun's native capabilities
 * No external dependencies!
 */

export interface ParsedArgs {
  command: string[];
  options: Record<string, string | boolean | string[]>;
  flags: Set<string>;
}

export function parseArgs(args: string[] = process.argv.slice(2)): ParsedArgs {
  const parsed: ParsedArgs = {
    command: [],
    options: {},
    flags: new Set(),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (!arg) continue;

    // Long option with value: --option=value
    if (arg.startsWith('--') && arg.includes('=')) {
      const [key, ...valueParts] = arg.slice(2).split('=');
      if (key) {
        parsed.options[key] = valueParts.join('=');
      }
    }
    // Long option or flag: --option
    else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      
      // Check if next arg is a value (doesn't start with -)
      if (nextArg && !nextArg.startsWith('-')) {
        // Check if it's an array option (multiple values)
        if (parsed.options[key]) {
          const existing = parsed.options[key];
          if (Array.isArray(existing)) {
            existing.push(nextArg);
          } else {
            parsed.options[key] = [existing as string, nextArg];
          }
        } else {
          parsed.options[key] = nextArg;
        }
        i++; // Skip next arg
      } else {
        // It's a flag
        parsed.flags.add(key);
        parsed.options[key] = true;
      }
    }
    // Short option: -o
    else if (arg.startsWith('-') && arg.length > 1 && !arg.startsWith('--')) {
      const flags = arg.slice(1).split('');
      flags.forEach(flag => {
        parsed.flags.add(flag);
        parsed.options[flag] = true;
      });
    }
    // Command or positional argument
    else {
      parsed.command.push(arg);
    }
  }

  return parsed;
}

export function getOption(parsed: ParsedArgs, name: string, defaultValue?: string): string | undefined {
  const value = parsed.options[name];
  if (value === undefined) return defaultValue;
  if (typeof value === 'boolean') return defaultValue;
  if (Array.isArray(value)) return value[0];
  return value;
}

export function getArrayOption(parsed: ParsedArgs, name: string): string[] {
  const value = parsed.options[name];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

export function hasFlag(parsed: ParsedArgs, name: string): boolean {
  return parsed.flags.has(name) || parsed.options[name] === true;
}

export function showHelp(commandName: string, description: string, usage: string): void {
  console.log(`\n${commandName} - ${description}\n`);
  console.log('Usage:');
  console.log(`  ${usage}\n`);
}
