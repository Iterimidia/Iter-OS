import type { RoleId, User } from '@/types'

/** Usuário mínimo válido para testes — sobrescreva só os campos que o cenário precisa. */
export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'usr_test',
    name: 'Usuário Teste',
    email: 'teste@iter.invalid',
    role: 'usuario_limitado' as RoleId,
    jobTitle: 'Teste',
    avatarInitials: 'UT',
    avatarColor: '#000000',
    active: true,
    allowedBases: [],
    allowedAreas: [],
    allowedActions: [],
    allowedClientIds: [],
    allowedDashboardCards: 'all',
    createdAt: '2026-01-01',
    authUserId: 'auth_test',
    ...overrides,
  }
}
