import { Home, Package, ShoppingCart, Truck, FileText, Settings as SettingsIcon, X, BarChart3, Tags, FolderTree, Users } from 'lucide-react'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: any) => void
  isOpen: boolean
  onClose: () => void
}

const menuSections = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Sales',
    items: [
      { id: 'orders', label: 'Orders', icon: ShoppingCart },
      { id: 'deliveries', label: 'Deliveries', icon: Truck },
      { id: 'receipts', label: 'Receipts', icon: FileText },
      { id: 'customers', label: 'Customers', icon: Users },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { id: 'products', label: 'Products', icon: Package },
      { id: 'brands', label: 'Brands', icon: Tags },
      { id: 'categories', label: 'Categories', icon: FolderTree },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
]

export default function Sidebar({ currentPage, onNavigate, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed left-0 top-0 z-40 flex h-screen w-[85vw] max-w-xs flex-col bg-[#001c44] text-slate-300 shadow-2xl transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-10 lg:w-64 lg:translate-x-0 lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-white ring-2 ring-white/10">
              <img
                src="https://res.cloudinary.com/h78tlu47/image/upload/v1784708343/icon_sotujz.jpg"
                alt="Glow logo"
                className="h-full w-full object-contain p-1"
              />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold tracking-tight text-white">Glow Admin</p>
              <p className="text-xs text-slate-400">Salon supplies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {menuSections.map((section) => (
            <div key={section.label} className="mt-4 first:mt-2">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = currentPage === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id)
                        onClose()
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={`
                        group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150
                        ${isActive
                          ? 'bg-white/10 text-white'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'}
                      `}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent-500" aria-hidden="true" />
                      )}
                      <Icon
                        size={18}
                        className={`flex-shrink-0 ${isActive ? 'text-accent-400' : 'text-slate-400 group-hover:text-slate-200'}`}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
