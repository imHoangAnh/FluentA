import {
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CircleDot,
  Droplets,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  type LucideProps,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { HabitIcon } from './api/habit.api'

const habitIconComponents: Record<HabitIcon, ComponentType<LucideProps>> = {
  Default: CircleDot,
  Book: BookOpen,
  Exercise: Dumbbell,
  Water: Droplets,
  Meditation: Brain,
  Study: GraduationCap,
  Work: BriefcaseBusiness,
  Health: HeartPulse,
}

export function HabitIconGlyph({ icon, ...props }: { icon: HabitIcon } & LucideProps) {
  const Icon = habitIconComponents[icon]
  return <Icon aria-hidden="true" {...props} />
}
