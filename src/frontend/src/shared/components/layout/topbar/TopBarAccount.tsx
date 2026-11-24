import { ChevronDown, LogOut, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'
import type { ShellAccount } from '../ShellEnvironment'

type TopBarAccountProps = {
  account: ShellAccount | null
  displayName: string
  avatarImageUrl: string
  logout: () => Promise<void>
  open: boolean
  onToggle: () => void
  onCloseAll: () => void
}

export function TopBarAccount({
  account,
  displayName,
  avatarImageUrl,
  logout,
  open,
  onToggle,
  onCloseAll,
}: TopBarAccountProps) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        aria-controls="topbar-account-menu"
        onClick={onToggle}
        className={cn(
          'inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 transition-colors duration-150 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          open && 'border-primary/40 bg-secondary/45',
        )}
      >
        <img
          className="size-7 shrink-0 rounded-full border border-border object-cover"
          src={avatarImageUrl}
          alt=""
        />
        <span className="hidden max-w-[120px] truncate text-[13px] font-semibold text-foreground sm:inline">
          {displayName}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn('size-3.5 text-muted-foreground transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          id="topbar-account-menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[256px] rounded-xl border border-border bg-card p-2 shadow-[var(--ds-shadow-lg)]"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-bold text-foreground">{displayName}</p>
            {account?.email ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{account.email}</p>
            ) : null}
          </div>

          <div className="my-1.5 h-px bg-border" />

          <Link
            to="/profile"
            aria-label="Open profile"
            onClick={onCloseAll}
            className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 hover:bg-muted/65 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-secondary-foreground group-hover:bg-background"
            >
              <User className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground leading-tight">Profile</span>
            </span>
          </Link>

          <div className="my-1.5 h-px bg-border" />

          <button
            type="button"
            aria-label="Log out"
            onClick={() => {
              onCloseAll()
              void logout()
            }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left text-destructive transition-colors duration-150 hover:bg-destructive/10 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
            >
              <LogOut className="size-4" />
            </span>
            <span className="text-sm font-semibold">Log out</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
