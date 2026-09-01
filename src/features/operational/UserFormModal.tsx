import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Lock } from 'lucide-react'
import type { ActionPermission, BaseId, RoleId, User } from '@/types'
import { useDataStore } from '@/data/store'
import { ROLES, ROLE_LIST } from '@/lib/permissions'
import { AREAS, BASES } from '@/lib/navigation'
import { ACTION_LABELS, ACTION_LIST, AVATAR_COLORS, getInitials } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Input, Label, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { ToggleChip } from '@/components/ui/ToggleChip'
import { Badge } from '@/components/ui/Badge'

interface UserFormModalProps {
  open: boolean
  onClose: () => void
  user?: User
}

interface UserFormState {
  name: string
  email: string
  password: string
  jobTitle: string
  role: RoleId
  active: boolean
  avatarColor: string
  allowedBases: BaseId[]
  allowedAreas: string[]
  allowedActions: ActionPermission[]
  allowedClientIds: 'all' | string[]
}

function toFormState(user?: User): UserFormState {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    jobTitle: user?.jobTitle ?? '',
    role: user?.role ?? 'usuario_limitado',
    active: user?.active ?? true,
    avatarColor: user?.avatarColor ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    allowedBases: user?.allowedBases ?? [],
    allowedAreas: Array.isArray(user?.allowedAreas) ? user.allowedAreas : [],
    allowedActions: user?.allowedActions ?? [],
    allowedClientIds: user?.allowedClientIds ?? 'all',
  }
}

export function UserFormModal({ open, onClose, user }: UserFormModalProps) {
  const addUser = useDataStore((s) => s.addUser)
  const updateUser = useDataStore((s) => s.updateUser)
  const clients = useDataStore((s) => s.clients)

  const [form, setForm] = useState(() => toFormState(user))

  useEffect(() => {
    if (open) setForm(toFormState(user))
  }, [user, open])

  const role = ROLES[form.role]

  function toggleBase(base: BaseId) {
    if (role.defaultBases.includes(base)) return
    setForm((f) => ({
      ...f,
      allowedBases: f.allowedBases.includes(base) ? f.allowedBases.filter((b) => b !== base) : [...f.allowedBases, base],
    }))
  }

  function toggleArea(areaId: string) {
    if (role.defaultAreas === 'all' || role.defaultAreas.includes(areaId)) return
    setForm((f) => ({
      ...f,
      allowedAreas: f.allowedAreas.includes(areaId) ? f.allowedAreas.filter((a) => a !== areaId) : [...f.allowedAreas, areaId],
    }))
  }

  function toggleAction(action: ActionPermission) {
    if (role.defaultActions.includes(action)) return
    setForm((f) => ({
      ...f,
      allowedActions: f.allowedActions.includes(action) ? f.allowedActions.filter((a) => a !== action) : [...f.allowedActions, action],
    }))
  }

  function toggleClient(clientId: string) {
    setForm((f) => {
      if (f.allowedClientIds === 'all') return f
      return {
        ...f,
        allowedClientIds: f.allowedClientIds.includes(clientId)
          ? f.allowedClientIds.filter((c) => c !== clientId)
          : [...f.allowedClientIds, clientId],
      }
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return
    if (!user && !form.password.trim()) return

    const payload = {
      name: form.name,
      email: form.email,
      // A API nunca retorna `password` (Fase 2, B4b) — se o campo ficou em
      // branco ao editar, não manda a chave, pra não sobrescrever a senha
      // legada existente com vazio. Criar usuário sempre exige senha (guard
      // acima), então esse spread nunca fica de fora nesse caso.
      ...(form.password.trim() ? { password: form.password } : {}),
      role: form.role,
      jobTitle: form.jobTitle,
      avatarInitials: getInitials(form.name),
      avatarColor: form.avatarColor,
      active: form.active,
      allowedBases: form.allowedBases,
      allowedAreas: form.allowedAreas,
      allowedActions: form.allowedActions,
      allowedClientIds: form.allowedClientIds,
      allowedDashboardCards: user?.allowedDashboardCards ?? ('all' as const),
      // Vínculo com Supabase Auth é feito à parte (fora deste formulário);
      // um usuário novo nasce sem sessão de Auth associada.
      authUserId: user?.authUserId ?? null,
    }

    const result = user ? await updateUser(user.id, payload) : await addUser(payload)
    if (result.ok) onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={user ? `Editar ${user.name}` : 'Novo usuário'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="jobTitle">Cargo</Label>
            <Input id="jobTitle" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="role">Perfil</Label>
            <Select id="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as RoleId })}>
              {ROLE_LIST.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="password">Senha {user && '(deixe em branco para manter)'}</Label>
            <Input
              id="password"
              type="text"
              required={!user}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={user ? '••••••••' : 'Defina uma senha'}
            />
          </div>
          <div className="flex items-end justify-between rounded-lg border border-iter-border px-3 py-2.5">
            <span className="text-xs font-medium text-iter-muted">Usuário ativo</span>
            <Switch checked={form.active} onChange={(active) => setForm({ ...form, active })} />
          </div>
        </div>

        <p className="text-[11px] text-iter-faint">
          O perfil <strong className="text-iter-muted">{role.label}</strong> já libera um conjunto padrão de bases, áreas e ações
          (mostrado com <Lock className="inline h-2.5 w-2.5" /> abaixo). Os toggles servem para liberar algo <em>a mais</em>, específico
          deste usuário.
        </p>

        <section>
          <Label>Bases</Label>
          <div className="flex flex-wrap gap-1.5">
            {BASES.map((b) => {
              const viaRole = role.defaultBases.includes(b.id)
              return (
                <ToggleChip key={b.id} active={viaRole || form.allowedBases.includes(b.id)} disabled={viaRole} onClick={() => toggleBase(b.id)}>
                  {viaRole && <Lock className="mr-1 inline h-2.5 w-2.5" />}
                  {b.label}
                </ToggleChip>
              )
            })}
          </div>
        </section>

        <section>
          <Label>Áreas</Label>
          <div className="space-y-2.5">
            {BASES.map((base) => (
              <div key={base.id}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-iter-faint">{base.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {AREAS.filter((a) => a.baseId === base.id).map((area) => {
                    const viaRole = role.defaultAreas === 'all' || role.defaultAreas.includes(area.id)
                    return (
                      <ToggleChip key={area.id} active={viaRole || form.allowedAreas.includes(area.id)} disabled={viaRole} onClick={() => toggleArea(area.id)}>
                        {viaRole && <Lock className="mr-1 inline h-2.5 w-2.5" />}
                        {area.label}
                      </ToggleChip>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <Label>Ações permitidas</Label>
          <div className="flex flex-wrap gap-1.5">
            {ACTION_LIST.map((action) => {
              const viaRole = role.defaultActions.includes(action)
              return (
                <ToggleChip key={action} active={viaRole || form.allowedActions.includes(action)} disabled={viaRole} onClick={() => toggleAction(action)}>
                  {viaRole && <Lock className="mr-1 inline h-2.5 w-2.5" />}
                  {ACTION_LABELS[action]}
                </ToggleChip>
              )
            })}
          </div>
        </section>

        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <Label className="mb-0">Clientes acessíveis</Label>
            <label className="flex items-center gap-1.5 text-[11px] text-iter-muted">
              <input
                type="checkbox"
                checked={form.allowedClientIds === 'all'}
                onChange={(e) => setForm({ ...form, allowedClientIds: e.target.checked ? 'all' : [] })}
                className="h-3.5 w-3.5 rounded border-iter-border accent-iter-primary"
              />
              Todos os clientes
            </label>
          </div>
          {form.allowedClientIds === 'all' ? (
            <Badge tone="primary">Acesso total a clientes</Badge>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {clients.map((c) => (
                <ToggleChip key={c.id} active={form.allowedClientIds.includes(c.id)} onClick={() => toggleClient(c.id)}>
                  {c.name}
                </ToggleChip>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-end gap-2 border-t border-iter-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{user ? 'Salvar alterações' : 'Criar usuário'}</Button>
        </div>
      </form>
    </Modal>
  )
}
