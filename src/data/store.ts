/**
 * Camada central de dados do Iter OS.
 *
 * Hoje é um store Zustand persistido em localStorage, semeado a partir de
 * src/data/mockData.ts. Toda tela lê e escreve por aqui — nunca direto do
 * localStorage ou do mock — para que a troca futura por Supabase seja só
 * trocar a implementação das actions (ex: `addTask` vira um `insert` no
 * Supabase) sem tocar em nenhum componente.
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  AppSettings,
  CalendarEvent,
  Client,
  ContentItem,
  DashboardCardDefinition,
  FileResource,
  FinancialEntry,
  Lead,
  Project,
  Task,
  User,
} from '@/types'
import {
  mockAppSettings,
  mockCalendarEvents,
  mockClients,
  mockContentItems,
  mockDashboardCards,
  mockFiles,
  mockFinancialEntries,
  mockLeads,
  mockProjects,
  mockTasks,
  mockUsers,
} from '@/data/mockData'
import { generateId } from '@/lib/utils'

const todayIso = () => new Date().toISOString().slice(0, 10)

interface DataState {
  users: User[]
  clients: Client[]
  projects: Project[]
  tasks: Task[]
  calendarEvents: CalendarEvent[]
  financialEntries: FinancialEntry[]
  leads: Lead[]
  contentItems: ContentItem[]
  files: FileResource[]
  dashboardCards: DashboardCardDefinition[]
  appSettings: AppSettings

  addUser: (data: Omit<User, 'id' | 'createdAt'>) => User
  updateUser: (id: string, patch: Partial<User>) => void
  removeUser: (id: string) => void

  addClient: (data: Omit<Client, 'id' | 'createdAt'>) => Client
  updateClient: (id: string, patch: Partial<Client>) => void
  removeClient: (id: string) => void

  addProject: (data: Omit<Project, 'id' | 'createdAt'>) => Project
  updateProject: (id: string, patch: Partial<Project>) => void
  removeProject: (id: string) => void

  addTask: (data: Omit<Task, 'id' | 'createdAt'>) => Task
  updateTask: (id: string, patch: Partial<Task>) => void
  removeTask: (id: string) => void

  addCalendarEvent: (data: Omit<CalendarEvent, 'id' | 'source'>) => CalendarEvent
  removeCalendarEvent: (id: string) => void

  addFinancialEntry: (data: Omit<FinancialEntry, 'id'>) => FinancialEntry
  updateFinancialEntry: (id: string, patch: Partial<FinancialEntry>) => void
  removeFinancialEntry: (id: string) => void

  addLead: (data: Omit<Lead, 'id' | 'createdAt'>) => Lead
  updateLead: (id: string, patch: Partial<Lead>) => void
  removeLead: (id: string) => void

  addContentItem: (data: Omit<ContentItem, 'id' | 'createdAt'>) => ContentItem
  updateContentItem: (id: string, patch: Partial<ContentItem>) => void
  removeContentItem: (id: string) => void

  addFile: (data: Omit<FileResource, 'id' | 'createdAt'>) => FileResource
  removeFile: (id: string) => void

  updateDashboardCard: (id: string, patch: Partial<DashboardCardDefinition>) => void

  updateAppSettings: (patch: Partial<AppSettings>) => void

  resetToMockData: () => void
}

const seed = {
  users: mockUsers,
  clients: mockClients,
  projects: mockProjects,
  tasks: mockTasks,
  calendarEvents: mockCalendarEvents,
  financialEntries: mockFinancialEntries,
  leads: mockLeads,
  contentItems: mockContentItems,
  files: mockFiles,
  dashboardCards: mockDashboardCards,
  appSettings: mockAppSettings,
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      ...seed,

      addUser: (data) => {
        const user: User = { ...data, id: generateId('usr'), createdAt: todayIso() }
        set((s) => ({ users: [...s.users, user] }))
        return user
      },
      updateUser: (id, patch) =>
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
      removeUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),

      addClient: (data) => {
        const client: Client = { ...data, id: generateId('cli'), createdAt: todayIso() }
        set((s) => ({ clients: [...s.clients, client] }))
        return client
      },
      updateClient: (id, patch) =>
        set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeClient: (id) => set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),

      addProject: (data) => {
        const project: Project = { ...data, id: generateId('proj'), createdAt: todayIso() }
        set((s) => ({ projects: [...s.projects, project] }))
        return project
      },
      updateProject: (id, patch) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removeProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      addTask: (data) => {
        const task: Task = { ...data, id: generateId('tsk'), createdAt: todayIso() }
        set((s) => ({ tasks: [...s.tasks, task] }))
        return task
      },
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addCalendarEvent: (data) => {
        const event: CalendarEvent = { ...data, id: generateId('evt'), source: 'manual' }
        set((s) => ({ calendarEvents: [...s.calendarEvents, event] }))
        return event
      },
      removeCalendarEvent: (id) => set((s) => ({ calendarEvents: s.calendarEvents.filter((e) => e.id !== id) })),

      addFinancialEntry: (data) => {
        const entry: FinancialEntry = { ...data, id: generateId('fin') }
        set((s) => ({ financialEntries: [...s.financialEntries, entry] }))
        return entry
      },
      updateFinancialEntry: (id, patch) =>
        set((s) => ({ financialEntries: s.financialEntries.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
      removeFinancialEntry: (id) => set((s) => ({ financialEntries: s.financialEntries.filter((f) => f.id !== id) })),

      addLead: (data) => {
        const lead: Lead = { ...data, id: generateId('lead'), createdAt: todayIso() }
        set((s) => ({ leads: [...s.leads, lead] }))
        return lead
      },
      updateLead: (id, patch) =>
        set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      removeLead: (id) => set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),

      addContentItem: (data) => {
        const item: ContentItem = { ...data, id: generateId('cnt'), createdAt: todayIso() }
        set((s) => ({ contentItems: [...s.contentItems, item] }))
        return item
      },
      updateContentItem: (id, patch) =>
        set((s) => ({ contentItems: s.contentItems.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeContentItem: (id) => set((s) => ({ contentItems: s.contentItems.filter((c) => c.id !== id) })),

      addFile: (data) => {
        const file: FileResource = { ...data, id: generateId('file'), createdAt: todayIso() }
        set((s) => ({ files: [...s.files, file] }))
        return file
      },
      removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id) })),

      updateDashboardCard: (id, patch) =>
        set((s) => ({ dashboardCards: s.dashboardCards.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      updateAppSettings: (patch) => set((s) => ({ appSettings: { ...s.appSettings, ...patch } })),

      resetToMockData: () => set(seed),
    }),
    {
      name: 'iteros-data',
      storage: createJSONStorage(() => localStorage),
      version: 3,
      // Sobe a cada mudança relevante no seed pra forçar reset de qualquer
      // localStorage já persistido — quem já tinha aberto o app antes volta
      // a ver o estado atual (dados de demonstração ou lista de usuários),
      // não o cache antigo.
      migrate: (_persistedState, persistedVersion) => (persistedVersion < 3 ? seed : (_persistedState as DataState)),
      // TODO(supabase): trocar esta camada de persistência por chamadas ao
      // Supabase (select/insert/update/delete), mantendo a mesma assinatura
      // das actions acima — os componentes não precisam mudar.
    },
  ),
)
