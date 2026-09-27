export function getUserAvatarImageUrl(user: { avatarUrl?: string | null; avatarDownloadUrl?: string | null } | null | undefined, displayName: string) {
  return user?.avatarDownloadUrl ?? user?.avatarUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5b8def&color=ffffff`
}
