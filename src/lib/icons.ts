import {
  LayoutDashboard,
  CalendarDays,
  FileBarChart2,
  Eye,
  Compass,
  Handshake,
  Users,
  KanbanSquare,
  Wallet,
  UsersRound,
  FolderOpen,
  Settings,
  PenTool,
  CheckCircle2,
  Globe2,
  Building2,
  Sparkles,
  Layers,
  PackageCheck,
  type LucideIcon,
} from 'lucide-react'

/** Mapa central de ícones — as áreas/bases guardam só o nome (string) no config de navegação. */
export const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  CalendarDays,
  FileBarChart2,
  Eye,
  Compass,
  Handshake,
  Users,
  KanbanSquare,
  Wallet,
  UsersRound,
  FolderOpen,
  Settings,
  PenTool,
  CheckCircle2,
  Globe2,
  Building2,
  Sparkles,
  Layers,
  PackageCheck,
}

export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? LayoutDashboard
}
