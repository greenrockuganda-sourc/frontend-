import { BuildStatus, DownloadCTA, GlowFeatures, GlowFooter, GlowHero } from './glow-sections'
import { GlowHeader } from './glow-header'

export default function GlowPage() {
  return <main className="min-h-screen overflow-hidden bg-background"><GlowHeader /><GlowHero /><GlowFeatures /><BuildStatus /><DownloadCTA /><GlowFooter /></main>
}
