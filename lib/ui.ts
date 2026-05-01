type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassValue[]
  | { [key: string]: boolean | undefined | null };

function clsx(...inputs: ClassValue[]): string {
  let result = '';
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string' || typeof input === 'number') {
      result += (result ? ' ' : '') + input;
    } else if (Array.isArray(input)) {
      const sub = clsx(...input);
      if (sub) result += (result ? ' ' : '') + sub;
    } else if (typeof input === 'object') {
      for (const [key, val] of Object.entries(input)) {
        if (val) result += (result ? ' ' : '') + key;
      }
    }
  }
  return result;
}

export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs);
}