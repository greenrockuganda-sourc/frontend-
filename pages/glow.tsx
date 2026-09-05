import type { NextPage } from 'next'
import { BuildStatus, DownloadCTA, GlowFeatures, GlowFooter, GlowHero } from '../app/glow/glow-sections'
import { GlowHeader } from '../app/glow/glow-header'

const GlowPage: NextPage = () => <main className="min-h-screen overflow-hidden bg-background"><GlowHeader /><GlowHero /><GlowFeatures /><BuildStatus /><DownloadCTA /><GlowFooter /></main>
export default GlowPage
