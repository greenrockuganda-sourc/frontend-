declare module 'next/link' {
  import * as React from 'react'
  const Link: React.FC<any>
  export default Link
}

declare module 'next/navigation' {
  export function usePathname(): string | undefined
}
