import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { Label, Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface EditableTagListProps {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}

export function EditableTagList({ label, items, onChange, placeholder = 'Adicionar...' }: EditableTagListProps) {
  const [draft, setDraft] = useState('')

  function add() {
    const value = draft.trim()
    if (!value || items.includes(value)) return
    onChange([...items, value])
    setDraft('')
  }

  function remove(item: string) {
    onChange(items.filter((i) => i !== item))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }

  return (
    <div>
      <Label>{label}</Label>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {items.length === 0 && <span className="text-xs text-iter-faint">Nenhum item ainda.</span>}
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 rounded-full border border-iter-border bg-iter-surface-alt px-2.5 py-1 text-[11px] font-medium text-iter-text"
          >
            {item}
            <button type="button" onClick={() => remove(item)} className="text-iter-faint hover:text-iter-danger" aria-label={`Remover ${item}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} />
        <Button type="button" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={add}>
          Adicionar
        </Button>
      </div>
    </div>
  )
}
