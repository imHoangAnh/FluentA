import {
  BookOpenText,
  CalendarClock,
  CheckSquare2,
  Columns3,
  FileText,
  Flame,
  GraduationCap,
  LayoutDashboard,
  NotebookPen,
  Settings,
  Timer,
} from 'lucide-react'
import type { ShellNavigationItem, ShellNavigationSection } from '@/shared/components/layout/ShellEnvironment'

const practiceRoute = (pathname: string) => pathname === '/practice'
  || /^\/practice\/[^/]+$/.test(pathname)

export const shellNavigationSections: ShellNavigationSection[] = [
  {
    label: 'Learning',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/vocabulary', label: 'Vocabulary', icon: BookOpenText },
      {
        to: '/flashcards',
        label: 'Flashcard',
        icon: GraduationCap,
        isActive: (pathname) => pathname.startsWith('/flashcards') && !practiceRoute(pathname),
      },
      { to: '/practice', label: 'Practice', icon: BookOpenText, isActive: practiceRoute },
      { to: '/review', label: 'Review', icon: Flame },
    ],
  },
  {
    label: 'Productivity',
    items: [
      { to: '/todo', label: 'Todo', icon: CheckSquare2 },
      { to: '/habits', label: 'Habits', icon: Columns3 },
      { to: '/countdowns', label: 'Countdowns', icon: CalendarClock },
      { to: '/journal', label: 'Journal', icon: NotebookPen },
      { to: '/notes', label: 'Notes', icon: FileText },
      { to: '/kanban', label: 'Kanban', icon: Columns3 },
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
