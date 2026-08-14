import { useEffect, useState, type ChangeEvent } from 'react'
import { Save } from 'lucide-react'
import { updateProfile } from '@/lib/api'
import { cloudinaryService } from '@/lib/cloudinary-service'
import { UserProfile } from '@/types'
import { notifyError, notifySuccess } from '@/lib/notify'

interface SettingsProps {
  user?: UserProfile | null
  onProfileSave: (profile: UserProfile) => void
}

export default function Settings({ user, onProfileSave }: SettingsProps) {
  const [settings, setSettings] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    profileImage: '',
  })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string>('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState(0)

  const DEFAULT_PROFILE_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="%23EDF2F7"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="40" fill="%236B7280">Profile</text></svg>'

  useEffect(() => {
    if (!user) {
      return
    }

    setSettings({
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      email: user.email || '',
      phoneNumber: user.phone_number || '',
      profileImage: user.profile_image || '',
    })
    setProfileImagePreview(user?.profile_image || '')
  }, [user])

  useEffect(() => {
    return () => {
      try { if (profileImagePreview) URL.revokeObjectURL(profileImagePreview) } catch {}
    }
  }, [profileImagePreview])

  const handleProfileImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      if (profileImagePreview && profileImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(profileImagePreview)
      }
    } catch {}

    const objectUrl = URL.createObjectURL(file)
    setProfileImageFile(file)
    setProfileImagePreview(objectUrl)
    setSettings((current) => ({ ...current, profileImage: objectUrl }))
    event.target.value = ''
  }

  const handleSave = async () => {
    if (!user) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      let profileImageUrl = settings.profileImage
      if (profileImageFile) {
        setUploadingImage(true)
        setImageUploadProgress(0)
        try {
          // validate image
          const validation = cloudinaryService.validateImage(profileImageFile, 10)
          if (!validation.valid) {
            throw new Error(validation.error || 'Invalid image')
          }

          const uploadResp = await cloudinaryService.uploadImageWithProgress(
            profileImageFile,
            'seller-admin/profiles',
            (pct) => setImageUploadProgress(pct)
          )

          profileImageUrl = cloudinaryService.getSecureUrl(uploadResp)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          notifyError(`Profile image upload failed: ${msg}`)
          throw err
        } finally {
          setUploadingImage(false)
          setImageUploadProgress(0)
        }
      }

      const updated = await updateProfile({
        first_name: settings.firstName,
        last_name: settings.lastName,
        phone_number: settings.phoneNumber,
        profile_image: profileImageUrl,
      })

      const persistedProfileImage = updated.profile_image || profileImageUrl

      const updatedProfile: UserProfile = {
        ...user,
        first_name: updated.first_name || settings.firstName,
        last_name: updated.last_name || settings.lastName,
        phone_number: updated.phone_number ?? settings.phoneNumber,
        profile_image: persistedProfileImage,
      }
      onProfileSave(updatedProfile)
      setSettings((current) => ({ ...current, profileImage: persistedProfileImage }))
      setProfileImagePreview(persistedProfileImage)
      setProfileImageFile(null)
      setSaved(true)
      notifySuccess('Profile updated')
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile settings.')
      notifyError(String(err))
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="p-3 sm:p-6 lg:p-8">
        <div className="text-sm text-gray-600">Loading user settings…</div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 p-3 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-500">Account</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Settings</h2>
        <p className="mt-1 text-slate-500">Manage your account and profile settings</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Profile Information</h3>
        </div>

        <form
          className="space-y-6 p-6"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">First Name</label>
              <input
                type="text"
                value={settings.firstName}
                onChange={(event) => setSettings({ ...settings, firstName: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Last Name</label>
              <input
                type="text"
                value={settings.lastName}
                onChange={(event) => setSettings({ ...settings, lastName: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={settings.email}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-slate-600"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Phone Number</label>
              <input
                type="tel"
                value={settings.phoneNumber}
                onChange={(event) => setSettings({ ...settings, phoneNumber: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div>
                  <img
                    src={profileImageFile ? profileImagePreview : settings.profileImage || DEFAULT_PROFILE_PLACEHOLDER}
                    alt="avatar"
                    onError={(event) => {
                      event.currentTarget.onerror = null
                      event.currentTarget.src = DEFAULT_PROFILE_PLACEHOLDER
                    }}
                    className="w-20 h-20 rounded-full object-cover border"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    onClick={(event) => {
                      event.stopPropagation()
                    }}
                    className="mb-2"
                  />
                  <input
                    type="url"
                    placeholder="Or paste image URL"
                    value={settings.profileImage}
                    onChange={(event) => {
                      setProfileImageFile(null)
                      setProfileImagePreview('')
                      setSettings({ ...settings, profileImage: event.target.value })
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {uploadingImage && <div className="text-sm text-gray-500 mt-1">Uploading image... {imageUploadProgress}%</div>}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:bg-blue-300 w-full sm:w-auto"
        >
          <Save size={20} />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && (
          <span className="text-blue-600 text-sm font-medium">✓ Settings saved successfully</span>
        )}
      </div>
    </div>
  )
}
