import type { LucideIcon } from 'lucide-react'
import { Construction } from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'

interface PagePlaceholderProps {
  title: string
  description?: string
  icon?: LucideIcon
}

/** Usado só durante a montagem do esqueleto — cada rota substitui isso por conteúdo real. */
export function PagePlaceholder({ title, description, icon = Construction }: PagePlaceholderProps) {
  return (
    <div>
      <SectionHeader title={title} description={description} />
      <EmptyState icon={icon} title="Em construção" description="Este módulo já está roteado e protegido por permissão — o conteúdo entra na próxima etapa." />
    </div>
  )
}
