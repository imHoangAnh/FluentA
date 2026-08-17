import { LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import type { ShellAccount } from '../ShellEnvironment'

type SidebarAccountProps = {
  account: ShellAccount | null
  displayName: string
  avatarImageUrl: string
  logout: () => Promise<void>
}

export function SidebarAccount({ account, displayName, avatarImageUrl, logout }: SidebarAccountProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background p-2 max-[1100px]:justify-center max-[1100px]:border-0 max-[1100px]:bg-transparent">
      <Link
        to="/profile"
        aria-label="Open profile"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 max-[1100px]:flex-none"
      >
        <img className="size-8 shrink-0 rounded-full border border-border object-cover" src={avatarImageUrl} alt="" />
        <span className="min-w-0 flex-1 overflow-hidden max-[1100px]:hidden">
          <span className="block max-w-full truncate text-xs font-semibold text-foreground">{displayName}</span>
          <span className="block max-w-full truncate text-[11px] text-muted-foreground">{account?.email}</span>
        </span>
      </Link>
      <span className="group/logout relative shrink-0 max-[1100px]:hidden">
        <Button variant="ghost" size="icon-sm" aria-label="Log out" aria-describedby="logout-tooltip" onClick={() => void logout()}>
          <LogOut />
        </Button>
        <span
          id="logout-tooltip"
          role="tooltip"
          className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-sm transition-opacity group-hover/logout:opacity-100 group-focus-within/logout:opacity-100"
        >
          Log out
        </span>
      </span>
    </div>
  )
}
