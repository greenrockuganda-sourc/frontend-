'use client'

import { DashboardLayout } from '../../components/layout/dashboard-layout'
import { Button } from '../../components/ui/button'
import { Save, LogOut } from 'lucide-react'
import { useState } from 'react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    storeName: 'My Store',
    email: 'admin@example.com',
    phone: '+1234567890',
    address: '123 Business St, City, State 12345',
    currency: 'USD',
    taxRate: '10',
    shippingRate: '5',
  })

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700">
              Account preferences
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
            <p className="mt-2 text-sm text-slate-500">Manage your account and store settings</p>
          </div>
        </div>

        {saved && (
          <div className="rounded-2xl border border-emerald-500/10 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-700">Settings saved successfully!</p>
          </div>
        )}

        <div className="space-y-6 rounded-[26px] border border-slate-200/80 bg-white/80 p-6 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <div>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Store Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Store Name</label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Phone</label>
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Address</label>
                <textarea
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-indigo-300"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Business Settings</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-indigo-300"
                >
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                  <option>INR</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.taxRate}
                  onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-indigo-300"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">Shipping Rate ({settings.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.shippingRate}
                  onChange={(e) => setSettings({ ...settings, shippingRate: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-indigo-300"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
            <Button onClick={handleSave} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-95 shadow-[0_8px_20px_-12px_rgba(99,102,241,0.45)]">
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
            <Button variant="destructive" className="gap-2 sm:ml-auto">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
