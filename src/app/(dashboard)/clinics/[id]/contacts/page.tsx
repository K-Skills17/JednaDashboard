export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { clinics, contacts, cadenceEnrollments } from '@/lib/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const CONSENT_STYLES: Record<string, string> = {
  opted_in:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  opted_out: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  unknown:   'bg-slate-100 text-slate-500',
};

export default async function ContactsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const clinicRow = await db.query.clinics.findFirst({ where: eq(clinics.id, id) });
  if (!clinicRow) notFound();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const clinic = clinicRow!;

  const allContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.clinicId, id))
    .orderBy(desc(contacts.createdAt));

  const enrollmentCounts = await db
    .select({ contactId: cadenceEnrollments.contactId, status: cadenceEnrollments.status, count: count() })
    .from(cadenceEnrollments)
    .where(and(eq(cadenceEnrollments.clinicId, id), eq(cadenceEnrollments.status, 'active')))
    .groupBy(cadenceEnrollments.contactId, cadenceEnrollments.status);

  const activeByContact = new Set(enrollmentCounts.map((e) => e.contactId));

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/clinics" className="text-slate-400 hover:text-slate-600 text-sm">Clinics</Link>
          <span className="text-slate-300">/</span>
          <Link href={`/clinics/${id}`} className="text-slate-400 hover:text-slate-600 text-sm">{clinic.name}</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 text-sm font-medium">Contacts</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Contacts</h1>
        <p className="text-slate-500 text-sm mt-0.5">{allContacts.length} total for {clinic.name}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {allContacts.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">No contacts yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Consent</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Source</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Cadence</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Last contacted</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allContacts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{c.name ?? '—'}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{c.phone}</div>
                    {c.email && <div className="text-xs text-slate-400 mt-0.5">{c.email}</div>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CONSENT_STYLES[c.consentStatus]}`}>
                      {c.consentStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{c.consentSource ?? '—'}</td>
                  <td className="px-5 py-3">
                    {activeByContact.has(c.id) ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                        active
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">
                    {c.lastContactedAt
                      ? new Date(c.lastContactedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">
                    {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
