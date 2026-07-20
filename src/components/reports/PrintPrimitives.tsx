import type { ReactNode } from 'react'

/**
 * Peças usadas só dentro dos relatórios impressos. Deliberadamente usam
 * cores claras fixas (não os tokens --iter-*) porque o documento impresso
 * segue sua própria identidade de "papel", independente do tema escuro do app.
 */

export function PrintSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10 break-inside-avoid">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      {children}
    </section>
  )
}

export function PrintStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}

export function PrintTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) return <p className="text-sm text-gray-400">Nenhum registro.</p>

  return (
    <table className="w-full border-collapse text-left text-xs">
      <thead>
        <tr className="border-b border-gray-300 text-gray-500">
          {headers.map((h) => (
            <th key={h} className="py-2 pr-4 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-100">
            {row.map((cell, j) => (
              <td key={j} className="py-2 pr-4 text-gray-700">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function PrintCover({ company, title, subtitle, authorName, authorRole }: { company: string; title: string; subtitle?: string; authorName: string; authorRole: string }) {
  const today = new Date().toISOString().slice(0, 10)
  const formatted = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${today}T12:00:00`))

  return (
    <div className="mb-12 border-b border-gray-200 pb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">{company}</p>
      <h1 className="mt-3 text-3xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-gray-500">{subtitle}</p>}
      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-1 text-xs text-gray-500">
        <span>Gerado em {formatted}</span>
        <span>
          Por {authorName} · {authorRole}
        </span>
      </div>
    </div>
  )
}
