export function getUserAvatarUrl(user: { avatarDownloadUrl?: string | null } | null | undefined, displayName: string) {
  if (user?.avatarDownloadUrl) {
    return user.avatarDownloadUrl
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D9488&color=fff`
}
