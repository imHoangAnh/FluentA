export function getUserAvatarUrl(user: { avatarUrl?: string | null } | null | undefined, displayName: string) {
  if (user?.avatarUrl) {
    return user.avatarUrl
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D9488&color=fff`
}
