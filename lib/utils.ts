export function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.flat().filter(Boolean).join(' ')
}
