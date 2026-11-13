import { useState } from 'react'

import { AlertIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import type { ChangePasswordFormValues, UpdateProfileRequest } from '@/contracts'
import { toFormFailure, type FormFailure } from '@/lib/form-errors'
import { errorMessage } from '@/lib/http'
import { notify } from '@/lib/notify'

import { AccountShell } from './account-shell'
import { AvatarField } from './components/avatar-field'
import { PasswordForm } from './components/password-form'
import { ProfileForm } from './components/profile-form'
import { ProfileFormSkeleton } from './components/profile-form-skeleton'
import {
  useChangePassword,
  useProfile,
  useRemoveAvatar,
  useUpdateProfile,
  useUploadAvatar,
} from './queries'

/**
 * Profile data, avatar and password. Each block saves on its own and reports its
 * own result, so a failure in one never hides a success in another.
 */
export function ProfilePage() {
  const profile = useProfile()
  const updateProfile = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()
  const removeAvatar = useRemoveAvatar()
  const changePassword = useChangePassword()

  const [profileFailure, setProfileFailure] = useState<FormFailure>({})
  const [profileSaved, setProfileSaved] = useState<string>()
  /** Bumped after each successful save so the form restarts from the saved values. */
  const [formVersion, setFormVersion] = useState(0)
  const [avatarError, setAvatarError] = useState<string>()
  const [passwordFailure, setPasswordFailure] = useState<FormFailure>({})
  const [passwordSaved, setPasswordSaved] = useState<string>()

  async function saveProfile(values: UpdateProfileRequest) {
    setProfileFailure({})
    setProfileSaved(undefined)
    try {
      await updateProfile.mutateAsync(values)
      setProfileSaved('Perfil atualizado.')
      setFormVersion((version) => version + 1)
      notify.success('Perfil atualizado.', { id: 'profile' })
    } catch (error) {
      setProfileFailure(toFormFailure(error))
    }
  }

  function selectAvatar(file: File) {
    setAvatarError(undefined)
    uploadAvatar.mutate(file, {
      onSuccess: () => notify.success('Avatar atualizado.', { id: 'avatar' }),
      onError: (error) =>
        setAvatarError(toFormFailure(error).fieldErrors?.file ?? errorMessage(error)),
    })
  }

  function clearAvatar() {
    setAvatarError(undefined)
    removeAvatar.mutate(undefined, {
      onSuccess: () => notify.info('Avatar removido.', { id: 'avatar' }),
      onError: (error) => setAvatarError(errorMessage(error)),
    })
  }

  async function savePassword({ currentPassword, newPassword }: ChangePasswordFormValues) {
    setPasswordFailure({})
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword })
      // A new string each time, so the form resets after every successful change.
      setPasswordSaved(`Senha alterada às ${new Date().toLocaleTimeString('pt-BR')}.`)
      notify.success('Senha alterada.', { id: 'password' })
    } catch (error) {
      setPasswordSaved(undefined)
      setPasswordFailure(toFormFailure(error))
    }
  }

  return (
    <AccountShell section="perfil" title="Perfil do colecionador">
      {profile.data ? (
        <>
          <ProfileForm
            key={formVersion}
            defaultValues={profile.data}
            onSubmit={saveProfile}
            pending={updateProfile.isPending}
            formError={profileFailure.formError}
            fieldErrors={profileFailure.fieldErrors}
            successMessage={profileSaved}
            avatarField={
              <AvatarField
                avatarUrl={profile.data.avatarUrl}
                displayName={profile.data.displayName}
                onSelect={selectAvatar}
                onRemove={clearAvatar}
                pending={uploadAvatar.isPending || removeAvatar.isPending}
                error={avatarError}
                onValidationError={setAvatarError}
              />
            }
          />
          <div className="mt-8">
            <PasswordForm
              onSubmit={savePassword}
              pending={changePassword.isPending}
              formError={passwordFailure.formError}
              fieldErrors={passwordFailure.fieldErrors}
              successMessage={passwordSaved}
            />
          </div>
        </>
      ) : profile.isError ? (
        <div
          role="alert"
          className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg border border-coral p-6 text-center"
        >
          <AlertIcon size={32} className="text-coral" />
          <h1 className="text-xl font-bold">Não foi possível carregar seu perfil</h1>
          <p className="max-w-md text-sand">{errorMessage(profile.error)}</p>
          <Button onClick={() => void profile.refetch()} loading={profile.isFetching}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <ProfileFormSkeleton includePassword />
      )}
    </AccountShell>
  )
}
