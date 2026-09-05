import Link from 'next/link'

export function GlowHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 lg:px-8">
      <Link href="/glow" className="font-mono text-sm font-bold tracking-[0.28em] text-foreground" aria-label="Glow home">
        GLOW<span className="text-primary">.</span>
      </Link>
      <nav className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex" aria-label="Main navigation">
        <a href="#features" className="transition-colors hover:text-foreground">Features</a>
        <a href="#build" className="transition-colors hover:text-foreground">Build status</a>
        <a href="#download" className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground transition-transform hover:scale-105">Get the app</a>
      </nav>
      <a href="#download" className="text-sm font-semibold text-primary sm:hidden">Download</a>
    </header>
  )
}

export default GlowHeader
