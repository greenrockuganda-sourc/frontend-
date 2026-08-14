import { Home, Package, ShoppingCart, Truck, FileText, Settings as SettingsIcon, X, BarChart3, Tags, FolderTree } from 'lucide-react'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: any) => void
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ currentPage, onNavigate, isOpen, onClose }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'brands', label: 'Brands', icon: Tags },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'deliveries', label: 'Deliveries', icon: Truck },
    { id: 'receipts', label: 'Receipts', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ]

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed left-0 top-0 z-40 flex h-full w-[85vw] max-w-xs flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-2xl transition-transform duration-200 ease-out lg:relative lg:z-0 lg:w-72 lg:translate-x-0 lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between border-b border-slate-200/80 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-100 via-white to-violet-100">
              <img
                src="https://res.cloudinary.com/h78tlu47/image/upload/v1784708343/icon_sotujz.jpg"
                alt="Seller Admin logo"
                className="h-full w-full object-cover"
              />
              {/* Glow overlay */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-2xl"
                style={{
                  boxShadow: '0 18px 40px -18px rgba(99,102,241,0.45), 0 0 64px rgba(168,85,247,0.22)',
                  pointerEvents: 'none',
                }}
              />
              <span className="absolute inset-0 rounded-2xl ring-2 ring-indigo-200/70 ring-offset-2 ring-offset-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900">Seller Admin</h1>
              <p className="text-xs text-slate-500">Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4 sm:px-4">
          <div className="mb-2 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id)
                  onClose()
                }}
                className={`
                  flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-[0_18px_30px_-18px_rgba(99,102,241,0.9)]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                `}
              >
                <Icon size={20} className="flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="border-t border-slate-200/80 p-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Status</p>
            <p className="mt-2 text-sm font-medium text-slate-700">All systems online</p>
          </div>
        </div>
      </aside>
    </>
  )
}