import { useEffect, useMemo, useState } from 'react'
import { Bell, Mail, MessageSquareText, UserRound, Users, Send, Sparkles, Phone, MapPin, CalendarClock, Download, Search, SlidersHorizontal, Clock3, ArrowUpDown, Plus } from 'lucide-react'
import { fetchCustomers, fetchUsers, sendBulkAppUserEmailCampaign, sendCustomerCampaignEmail, sendNewArrivalNotification } from '@/lib/api'
import { notifyError, notifySuccess } from '@/lib/notify'

interface CustomersProps {
  token?: string
}

export default function Customers({ token }: CustomersProps) {
  const activeToken = token ?? (typeof window !== 'undefined' ? localStorage.getItem('access') ?? '' : '')
  const [customers, setCustomers] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'app' | 'seller' | 'customer'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'spend' | 'activity'>('newest')
  const [pushTitle, setPushTitle] = useState('Customer update')
  const [pushMessage, setPushMessage] = useState('We have a new offer ready for you. Check your dashboard for details.')
  const [campaignSubject, setCampaignSubject] = useState('New offer to explore')
  const [campaignMessage, setCampaignMessage] = useState('Hi, we have new products and offers ready for you. Visit the store today.')
  const [sendingPush, setSendingPush] = useState(false)
  const [sendingCampaign, setSendingCampaign] = useState(false)
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; subject: string; message: string; pushTitle: string; type: 'email' | 'push' }>>([])
  const [sendHistory, setSendHistory] = useState<Array<{ id: string; type: 'email' | 'push'; subject: string; recipientCount: number; date: string }>>([])

  const normalizeAccountRole = (record: any) => {
    const roleValue = String(record?.role ?? record?.user_role ?? record?.userType ?? record?.user_type ?? record?.account_type ?? record?.user?.role ?? record?.user?.user_type ?? '').trim()
    const normalized = roleValue.toLowerCase()
    if (!normalized) {
      return isAppUserRecord(record) ? 'Customer' : 'Seller'
    }
    if (normalized.includes('customer')) return 'Customer'
    if (normalized.includes('seller')) return 'Seller'
    if (normalized.includes('admin')) return 'Admin'
    return isAppUserRecord(record) ? 'Customer' : 'Seller'
  }

  const unwrapList = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload
    if (!payload || typeof payload !== 'object') return []
    if (Array.isArray(payload.results)) return payload.results
    if (Array.isArray(payload.customers)) return payload.customers
    if (Array.isArray(payload.users)) return payload.users
    if (Array.isArray(payload.accounts)) return payload.accounts
    if (Array.isArray(payload.items)) return payload.items
    if (Array.isArray(payload.data)) return payload.data
    if (Array.isArray(payload.objects)) return payload.objects
    return []
  }

  const deduplicateRecords = <T extends Record<string, any>>(records: T[]) => {
    const seen = new Set<string>()
    return records.filter((record) => {
      const key = String(record.id ?? record.customer_id ?? record.user_id ?? record.email ?? record.phone_number ?? record.phone ?? JSON.stringify(record))
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  const downloadAllAccountsCsv = () => {
    const mergedRecords = deduplicateRecords([
      ...customers.map((record) => ({
        ...record,
        account_type: normalizeAccountRole(record),
        source: 'customer',
      })),
      ...users.map((record) => ({
        ...record,
        account_type: normalizeAccountRole(record),
        source: 'user',
      })),
    ])

    const rows = mergedRecords.map((record) => ({
      id: record.id ?? record.user_id ?? record.customer_id ?? '',
      name: record.name ?? record.full_name ?? [record.first_name, record.last_name].filter(Boolean).join(' ') ?? '',
      email: record.email ?? '',
      phone: record.phone_number ?? record.phone ?? '',
      role: normalizeAccountRole(record),
      status: record.status ?? record.customer_status ?? 'Active',
      source: record.source ?? 'customer',
      is_app_user: Boolean(record.is_app_user ?? record.app_user ?? record.isAppUser ?? record.appUser ?? record.user_type?.toLowerCase().includes('app') ?? false),
    }))

    const csvHeader = ['id', 'name', 'email', 'phone', 'role', 'status', 'source', 'is_app_user']
    const csvRows = rows.map((row) => csvHeader.map((key) => {
      const value = row[key as keyof typeof row] ?? ''
      const text = String(value).replace(/"/g, '""')
      return `"${text}"`
    }).join(','))
    const csv = [csvHeader.join(','), ...csvRows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'all-customers-and-sellers.csv')
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    notifySuccess('Customer and seller export downloaded.')
  }

  const defaultTemplates: Array<{ id: string; name: string; subject: string; message: string; pushTitle: string; type: 'email' | 'push' }> = [
    {
      id: 'new-arrival',
      name: 'New Arrival',
      type: 'email',
      subject: 'New products are here',
      message: 'Hi, we just added new products and offers for you. Visit the app to explore what is fresh today.',
      pushTitle: 'New arrival',
    },
    {
      id: 'offer',
      name: 'Offer',
      type: 'email',
      subject: 'Special offer just for you',
      message: 'Hi, we have a time-limited offer ready for you. Check the app now to unlock your offer.',
      pushTitle: 'Special offer',
    },
    {
      id: 'welcome-back',
      name: 'Welcome Back',
      type: 'push',
      subject: 'Welcome back',
      message: 'Welcome back to your dashboard. We have new updates and offers ready for you.',
      pushTitle: 'Welcome back',
    },
  ]

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const savedTemplates = window.localStorage.getItem('customer-campaign-templates')
      const savedHistory = window.localStorage.getItem('customer-campaign-history')

      if (savedTemplates) {
        const parsedTemplates = JSON.parse(savedTemplates)
        if (Array.isArray(parsedTemplates) && parsedTemplates.length > 0) {
          setTemplates(parsedTemplates)
        } else {
          setTemplates(defaultTemplates)
        }
      } else {
        setTemplates(defaultTemplates)
      }

      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory)
        if (Array.isArray(parsedHistory)) {
          setSendHistory(parsedHistory)
        }
      }
    } catch {
      setTemplates(defaultTemplates)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('customer-campaign-templates', JSON.stringify(templates))
  }, [templates])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('customer-campaign-history', JSON.stringify(sendHistory))
  }, [sendHistory])

  const isAppUserRecord = (record: any) => {
    const flags = [
      record.is_app_user,
      record.app_user,
      record.isAppUser,
      record.appUser,
      record.user?.is_app_user,
      record.user?.app_user,
    ]
    const roleValue = String(
      record.role ??
      record.user_role ??
      record.userType ??
      record.user_type ??
      record.account_type ??
      record.user?.role ??
      record.user?.user_type ??
      '',
    ).toLowerCase()
    return flags.some((flag) => flag === true) || /customer|app/.test(roleValue)
  }

  const getCustomerRoleLabel = (record: any) => {
    const roleValue = String(record?.role ?? record?.user_role ?? record?.userType ?? record?.user_type ?? '').trim()
    const normalized = roleValue.toLowerCase()
    if (!normalized) {
      return isAppUserRecord(record) ? 'Customer' : 'Seller'
    }
    if (normalized.includes('seller')) return 'Seller'
    if (normalized.includes('admin')) return 'Admin'
    if (normalized.includes('customer')) return 'Customer'
    return isAppUserRecord(record) ? 'Customer' : 'Seller'
  }

  const getCustomerStatus = (record: any) => {
    const status = String(record?.status ?? record?.customer_status ?? '').trim().toLowerCase()
    return status === 'inactive' ? 'Inactive' : 'Active'
  }

  const allAccounts = useMemo(
    () => deduplicateRecords([...customers, ...users]),
    [customers, users],
  )

  const appCustomers = useMemo(
    () => allAccounts.filter((customer) => isAppUserRecord(customer)),
    [allAccounts],
  )

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const sourceRecords = roleFilter === 'app' ? appCustomers : allAccounts

    return [...sourceRecords]
      .filter((customer) => {
        const haystack = [
          customer.name,
          customer.full_name,
          customer.first_name,
          customer.last_name,
          customer.email,
          customer.phone_number,
          customer.phone,
          customer.role,
          customer.user_type,
          customer.userType,
        ].filter(Boolean).join(' ').toLowerCase()

        const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery)

        const role = getCustomerRoleLabel(customer)
        const matchesRole = roleFilter === 'all'
          || (roleFilter === 'app' && isAppUserRecord(customer))
          || (roleFilter === 'seller' && role === 'Seller')
          || (roleFilter === 'customer' && role === 'Customer')

        const status = getCustomerStatus(customer)
        const matchesStatus = statusFilter === 'all'
          || (statusFilter === 'active' && status === 'Active')
          || (statusFilter === 'inactive' && status === 'Inactive')

        return matchesQuery && matchesRole && matchesStatus
      })
      .sort((a, b) => {
        if (sortBy === 'spend') {
          const aSpend = Number(a.total_spend ?? a.spend ?? 0)
          const bSpend = Number(b.total_spend ?? b.spend ?? 0)
          return bSpend - aSpend
        }

        if (sortBy === 'activity') {
          const aActivity = new Date(a.last_activity ?? a.updated_at ?? a.created_at ?? 0).getTime()
          const bActivity = new Date(b.last_activity ?? b.updated_at ?? b.created_at ?? 0).getTime()
          return bActivity - aActivity
        }

        const aDate = new Date(a.created_at ?? a.date ?? 0).getTime()
        const bDate = new Date(b.created_at ?? b.date ?? 0).getTime()
        return bDate - aDate
      })
  }, [allAccounts, appCustomers, searchQuery, roleFilter, statusFilter, sortBy])

  const selectedCustomer = useMemo(
    () =>
      filteredCustomers.find((customer) => String(customer.id ?? customer.customer_id ?? customer.user_id) === String(selectedCustomerId)) ??
      filteredCustomers[0] ??
      appCustomers[0] ??
      null,
    [filteredCustomers, appCustomers, selectedCustomerId],
  )

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoading(true)
        const [customersResult, usersResult] = await Promise.allSettled([
          fetchCustomers(activeToken),
          fetchUsers(activeToken),
        ])

        const customerList = customersResult.status === 'fulfilled' ? unwrapList(customersResult.value) : []
        const userList = usersResult.status === 'fulfilled' ? unwrapList(usersResult.value) : []

        setCustomers(customerList)
        setUsers(userList)

        const combinedList = deduplicateRecords([...customerList, ...userList])
        const firstAppCustomer = combinedList.find((customer: any) => {
          const flags = [customer.is_app_user, customer.app_user, customer.isAppUser, customer.appUser]
          const userType = String(customer.user_type ?? customer.userType ?? customer.role ?? '').toLowerCase()
          return flags.some((flag) => flag === true) || userType.includes('customer') || userType.includes('app')
        })
        if (firstAppCustomer) {
          setSelectedCustomerId((current) => current ?? String(firstAppCustomer.id ?? firstAppCustomer.customer_id ?? firstAppCustomer.user_id ?? 0))
        } else if (combinedList.length > 0) {
          setSelectedCustomerId((current) => current ?? String(combinedList[0].id ?? combinedList[0].customer_id ?? combinedList[0].user_id ?? 0))
        }
      } catch (error) {
        console.error('Failed to load customer and seller accounts', error)
        notifyError(error instanceof Error ? error.message : 'Unable to load customer records.')
      } finally {
        setLoading(false)
      }
    }

    void loadCustomers()
  }, [activeToken])

  const handleSendPush = async () => {
    if (!selectedCustomer) {
      notifyError('Select a customer before sending a push notification.')
      return
    }

    try {
      setSendingPush(true)
      const result = await sendNewArrivalNotification(
        activeToken,
        pushTitle.trim() || 'Customer update',
        pushMessage.trim() || 'We have an update for you.',
        {
          customer_id: selectedCustomer.id ?? selectedCustomer.customer_id ?? null,
          customer_email: selectedCustomer.email ?? '',
          segment: 'customers',
          target: 'customers',
          app_user_only: false,
          is_app_user: false,
        },
      )
      recordSendHistory('push', pushTitle.trim() || 'Customer update', Number(result?.recipient_count ?? 1))
      notifySuccess(`Push sent to ${result?.recipient_count ?? 1} app user${result?.recipient_count === 1 ? '' : 's'}.`)
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Unable to send the push notification.')
    } finally {
      setSendingPush(false)
    }
  }

  const handleSendEmailCampaign = async () => {
    if (!selectedCustomer?.email) {
      notifyError('This customer does not have an email address on file.')
      return
    }

    try {
      setSendingCampaign(true)
      await sendCustomerCampaignEmail(activeToken, {
        customer_id: selectedCustomer.id ?? selectedCustomer.customer_id ?? null,
        customer_email: selectedCustomer.email,
        subject: campaignSubject.trim() || 'Customer campaign',
        message: campaignMessage.trim() || 'Hi, we have a new offer waiting for you.',
        app_domain: false,
        segment: 'customers',
        target: 'customers',
        is_app_user: false,
        app_user_only: false,
      })
      recordSendHistory('email', campaignSubject.trim() || 'Customer campaign', 1)
      notifySuccess('Campaign email sent using the app domain.')
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Unable to send the email campaign.')
    } finally {
      setSendingCampaign(false)
    }
  }

  const handleSendBulkEmailCampaign = async () => {
    if (customerEmails.length === 0) {
      notifyError('There are no customer emails available for a bulk email campaign.')
      return
    }

    try {
      setSendingCampaign(true)
      await sendBulkAppUserEmailCampaign(activeToken, {
        subject: campaignSubject.trim() || 'Customer campaign',
        message: campaignMessage.trim() || 'Hi, we have a new offer waiting for you.',
        recipients: customerEmails,
      })
      recordSendHistory('email', campaignSubject.trim() || 'Customer campaign', customerEmails.length)
      notifySuccess(`Bulk campaign email sent to ${customerEmails.length} customers.`)
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Unable to send the bulk email campaign.')
    } finally {
      setSendingCampaign(false)
    }
  }

  const handleSendBulkPush = async () => {
    if (customerEmails.length === 0) {
      notifyError('There are no customer records available for a bulk push campaign.')
      return
    }

    try {
      setSendingPush(true)
      const result = await sendNewArrivalNotification(
        activeToken,
        pushTitle.trim() || 'Customer update',
        pushMessage.trim() || 'We have an update for you.',
        {
          segment: 'customers',
          target: 'customers',
          app_user_only: false,
          is_app_user: false,
          send_to_all: true,
          recipient_count: customerEmails.length,
          recipients: customerEmails,
        },
      )
      recordSendHistory('push', pushTitle.trim() || 'Customer update', Number(result?.recipient_count ?? customerEmails.length))
      notifySuccess(`Bulk push sent to ${result?.recipient_count ?? customerEmails.length} customers.`)
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Unable to send the bulk push campaign.')
    } finally {
      setSendingPush(false)
    }
  }

  const totalCustomers = customers.length
  const appUserCount = appCustomers.length
  const activeCustomers = customers.filter((customer) => {
    const status = String(customer.status ?? customer.customer_status ?? '').toLowerCase()
    return status === 'active' || status === 'new' || !status
  }).length
  const campaignReadyUsers = appCustomers.filter((customer) => !!customer.email && isAppUserRecord(customer)).length
  const noEmailUsers = appCustomers.filter((customer) => !customer.email || !String(customer.email).trim()).length

  const saveTemplate = (kind: 'email' | 'push') => {
    const title = kind === 'email' ? campaignSubject.trim() || 'New offer' : pushTitle.trim() || 'Customer update'
    const message = kind === 'email' ? campaignMessage.trim() : pushMessage.trim()

    if (!title || !message) {
      notifyError('Add a subject and message before saving a template.')
      return
    }

    const name = window.prompt(kind === 'email' ? 'Template name for email' : 'Template name for push', title)
    if (!name || !name.trim()) {
      return
    }

    const template = {
      id: `${kind}-${Date.now()}`,
      name: name.trim(),
      subject: title,
      message,
      pushTitle: kind === 'push' ? title : pushTitle.trim() || 'Customer update',
      type: kind,
    }

    setTemplates((current) => [template, ...current].slice(0, 8))
    notifySuccess(`${kind === 'email' ? 'Email' : 'Push'} template saved.`)
  }

  const applyTemplate = (template: { subject: string; message: string; pushTitle: string }) => {
    setCampaignSubject(template.subject)
    setCampaignMessage(template.message)
    setPushTitle(template.pushTitle)
    setPushMessage(template.message)
  }

  const recordSendHistory = (type: 'email' | 'push', subject: string, recipientCount: number) => {
    const entry = {
      id: `${type}-${Date.now()}`,
      type,
      subject,
      recipientCount,
      date: new Date().toISOString(),
    }

    setSendHistory((current) => [entry, ...current].slice(0, 6))
  }

  const customerEmails = useMemo(
    () =>
      Array.from(new Set(
        allAccounts
          .map((customer) => customer.email)
          .filter((email): email is string => typeof email === 'string' && email.trim().length > 0),
      )),
    [allAccounts],
  )

  return (
    <div className="page-container space-y-6">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.8)] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100">
              <Users className="h-3.5 w-3.5" />
              Customer hub
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Customers</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-200 sm:text-base">
              Manage customer records, launch push updates, and send campaign emails directly from one place.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Live audience</p>
              <p className="mt-2 text-2xl font-semibold">{totalCustomers}</p>
            </div>
            <button
              type="button"
              onClick={downloadAllAccountsCsv}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <Download className="h-4 w-4" />
              Download all accounts
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: 'Total customers', value: totalCustomers.toString(), icon: Users },
          { label: 'Active', value: activeCustomers.toString(), icon: Sparkles },
          { label: 'Campaign ready', value: customers.length ? 'Yes' : 'No', icon: Bell },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Live</span>
              </div>
              <p className="mt-5 text-sm text-slate-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1.5fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Audience</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Customer list</h2>
            </div>
          </div>

          <div className="mb-4 space-y-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, email, phone, or role"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-500">
                <span className="mb-1.5 block">Role</span>
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as 'all' | 'app' | 'seller' | 'customer')}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="all">All</option>
                  <option value="app">App users</option>
                  <option value="customer">Customers</option>
                  <option value="seller">Sellers</option>
                </select>
              </label>

              <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-500">
                <span className="mb-1.5 block">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-500">
                <span className="mb-1.5 block">Sort</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as 'newest' | 'spend' | 'activity')}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="newest">Newest</option>
                  <option value="spend">Spend</option>
                  <option value="activity">Last activity</option>
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              No matching app users found.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map((customer) => {
                const isSelected = String(customer.id ?? customer.customer_id ?? customer.user_id) === String(selectedCustomer?.id ?? selectedCustomer?.customer_id ?? selectedCustomer?.user_id ?? '')
                const customerName = customer.name ?? customer.full_name ?? ((`${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim()) || customer.email || 'Customer')
                return (
                  <button
                    type="button"
                    key={customer.id ?? customer.customer_id ?? customer.user_id ?? customer.email}
                    onClick={() => setSelectedCustomerId(String(customer.id ?? customer.customer_id ?? customer.user_id ?? customer.email))}
                    className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${
                      isSelected ? 'border-indigo-200 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{customerName}</p>
                      <p className="mt-1 text-xs text-slate-500">{customer.email || 'No email on file'}</p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm">
                      {getCustomerStatus(customer)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {selectedCustomer ? (
              <>
                <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-500 text-lg font-bold text-white">
                      {(selectedCustomer.name ?? selectedCustomer.full_name ?? selectedCustomer.email ?? 'CU').slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        {selectedCustomer.name ?? selectedCustomer.full_name ?? ((`${selectedCustomer.first_name ?? ''} ${selectedCustomer.last_name ?? ''}`.trim()) || 'Customer')}
                      </h2>
                      <p className="text-sm text-slate-500">{selectedCustomer.email || 'No email available'}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    {selectedCustomer.status ?? 'Active'}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-slate-500">
                      <Phone className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">Phone</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{selectedCustomer.phone_number ?? selectedCustomer.phone ?? 'Not available'}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-slate-500">
                      <MapPin className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">Location</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{selectedCustomer.location ?? selectedCustomer.address ?? selectedCustomer.city ?? 'Not specified'}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-slate-500">
                      <CalendarClock className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">Joined</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString() : 'Not available'}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-slate-500">
                      <UserRound className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">Profile</span>
                    </div>
                    <p className="text-sm text-slate-700">
                      {selectedCustomer.notes ?? selectedCustomer.bio ?? 'No extra profile notes yet.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-slate-500">
                      <MessageSquareText className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">Customer value</span>
                    </div>
                    <p className="text-sm text-slate-700">
                      {selectedCustomer.total_spend ? `Total spend: UGX ${Number(selectedCustomer.total_spend).toLocaleString()}` : 'Customer value data not recorded yet.'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Select a customer to view details.
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-slate-900">
                  <Bell className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-lg font-semibold">Push campaign</h3>
                </div>

                <div className="space-y-3">
                  <input
                    value={pushTitle}
                    onChange={(event) => setPushTitle(event.target.value)}
                    placeholder="Campaign title"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                  <textarea
                    value={pushMessage}
                    onChange={(event) => setPushMessage(event.target.value)}
                    rows={5}
                    placeholder="Type your push notification message"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSendPush()}
                      disabled={sendingPush || !selectedCustomer}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      {sendingPush ? 'Sending push...' : 'Send push campaign'}
                    </button>
                    <button
                      type="button"
                      onClick={() => saveTemplate('push')}
                      className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                      title="Save push template"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSendBulkPush()}
                    disabled={sendingPush || customerEmails.length === 0}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Users className="h-4 w-4" />
                    {sendingPush ? 'Sending bulk push...' : `Send to all ${customerEmails.length} customers`}
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-slate-900">
                  <Mail className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-lg font-semibold">Email campaign</h3>
                </div>

                <div className="space-y-3">
                  <input
                    value={campaignSubject}
                    onChange={(event) => setCampaignSubject(event.target.value)}
                    placeholder="Email subject"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                  <textarea
                    value={campaignMessage}
                    onChange={(event) => setCampaignMessage(event.target.value)}
                    rows={5}
                    placeholder="Type your email campaign message"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSendEmailCampaign()}
                      disabled={sendingCampaign || !selectedCustomer}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Mail className="h-4 w-4" />
                      {sendingCampaign ? 'Sending campaign...' : 'Send email campaign'}
                    </button>
                    <button
                      type="button"
                      onClick={() => saveTemplate('email')}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                      title="Save email template"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSendBulkEmailCampaign()}
                    disabled={sendingCampaign || customerEmails.length === 0}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Mail className="h-4 w-4" />
                    {sendingCampaign ? 'Sending bulk email...' : `Send email to all ${customerEmails.length} customers`}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900">
                  <Clock3 className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-lg font-semibold">Send history</h3>
                </div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                  {sendHistory.length} recent
                </span>
              </div>

              <div className="space-y-3">
                {templates.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Templates
                    </div>
                    <div className="space-y-2">
                      {templates.slice(0, 4).map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => applyTemplate(template)}
                          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50"
                        >
                          <span className="font-medium">{template.name}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">{template.type}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Recent sends
                  </div>
                  {sendHistory.length === 0 ? (
                    <p className="text-sm text-slate-500">No campaigns sent yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {sendHistory.map((entry) => (
                        <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{entry.type}</span>
                            <span className="text-[10px] text-slate-400">{new Date(entry.date).toLocaleDateString()}</span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-800">{entry.subject}</p>
                          <p className="mt-1 text-xs text-slate-500">{entry.recipientCount} recipient{entry.recipientCount === 1 ? '' : 's'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
