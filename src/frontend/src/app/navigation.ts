import {
  CalendarClock,
  Dumbbell,
  FolderKanban,
  LibraryBig,
  ListChecks,
  NotebookPen,
  Repeat2,
  RotateCcw,
  Settings,
  SquareStack,
  StickyNote,
  Timer,
} from 'lucide-react'
import type { ShellNavigationItem, ShellNavigationSection } from '@/shared/components/layout/ShellEnvironment'

const practiceRoute = (pathname: string) => pathname === '/practice'
  || /^\/practice\/[^/]+$/.test(pathname)

export const shellNavigationSections: ShellNavigationSection[] = [
  {
    label: 'Studying',
    items: [
      { to: '/vocabulary', label: 'Vocabulary', icon: LibraryBig },
      {
        to: '/flashcards',
        label: 'Flashcard',
        icon: SquareStack,
        isActive: (pathname) => pathname.startsWith('/flashcards') && !practiceRoute(pathname),
      },
      { to: '/practice', label: 'Practice', icon: Dumbbell, isActive: practiceRoute },
      { to: '/review', label: 'Review', icon: RotateCcw },
    ],
  },
  {
    label: 'Productivity',
    items: [
      { to: '/todo', label: 'Todo', icon: ListChecks },
      { to: '/habits', label: 'Habits', icon: Repeat2 },
      { to: '/countdowns', label: 'Countdowns', icon: CalendarClock },
      { to: '/journal', label: 'Journal', icon: NotebookPen },
      { to: '/notes', label: 'Notes', icon: StickyNote },
      { to: '/project', label: 'Project', icon: FolderKanban },
      { to: '/pomodoro', label: 'Pomodoro', icon: Timer },
    ],
  },
]

export const shellSettingsNavigation: ShellNavigationItem = {
  to: '/settings',
  label: 'Settings',
  icon: Settings,
}

export const shellNotificationsPath = '/notifications'
