declare module 'next/server' {
  export class NextResponse {
    static json(body: any, init?: ResponseInit): Response
    static redirect(url: string | URL, init?: ResponseInit): Response
    constructor(body?: any, init?: ResponseInit)
    static rewrite(url: string | URL): Response
    static next(): Response
    headers: Headers
    status: number
    statusText: string
    ok: boolean
    url: string
    clone(): Response
  }

  export type NextRequest = Request
}

declare module 'next/navigation' {
  export function useRouter(): {
    push: (url: string) => void
    replace: (url: string) => void
    refresh: () => void
    prefetch: (url: string) => void
  }
}

declare const process: {
  env: Record<string, string | undefined>
}
