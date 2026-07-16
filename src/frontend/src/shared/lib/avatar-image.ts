export function getUserAvatarImageUrl(user: { avatarDownloadUrl?: string | null } | null | undefined, displayName: string) {
  return user?.avatarDownloadUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5b8def&color=ffffff`
}
