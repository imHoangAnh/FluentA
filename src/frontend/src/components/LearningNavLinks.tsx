import { BookOpen, FilePenLine, Layers, PenSquare } from 'lucide-react'
import { Link, type LinkProps, useLocation } from 'react-router-dom'

type LearningNavLinksProps = {
  className?: string
}

function isActive(pathname: string, href: string) {
  if (href === '/flashcards') {
    return pathname === '/flashcards' || pathname.startsWith('/flashcards/pages/')
  }

  if (href === '/notes') {
    return pathname === '/notes' || pathname.startsWith('/notes/')
  }

  return pathname === href
}

function NavLink({
  to,
  className,
  children,
}: Pick<LinkProps, 'to' | 'children'> & { className?: string }) {
  const location = useLocation()

  return (
    <Link to={to} className={isActive(location.pathname, String(to)) ? `active${className ? ` ${className}` : ''}` : className}>
      {children}
    </Link>
  )
}

export function LearningNavLinks({ className }: LearningNavLinksProps) {
  return (
    <>
      <NavLink to="/flashcards" className={className}>
        <Layers size={20} /> Flashcard
      </NavLink>
      <NavLink to="/flashcards/practice" className={className}>
        <PenSquare size={20} /> Practice
      </NavLink>
      <NavLink to="/review" className={className}>
        <BookOpen size={20} /> Review
      </NavLink>
      <NavLink to="/notes" className={className}>
        <FilePenLine size={20} /> Notes
      </NavLink>
    </>
  )
}
