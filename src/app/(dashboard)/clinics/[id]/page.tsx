import { db } from '@/lib/db';
import {
  clinics, clinicModules, contacts, messages, cadenceEnrollments,
} from '@/lib/schema';
import { eq, and, count, desc } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

async function getClinicData(id: string) {
  const clinic = await db.query.clinics.findFirst({
    where: eq(clinics.id, id),
  });
  if (!clinic) return null;

  const [modules, recentContacts, recentMessages, enrollmentStats] = await Promise.all([
    db.select().from(clinicModules).where(eq(clinicModules.clinicId, id)),

    db.select().from(contacts)
      .where(eq(contacts.clinicId, id))
      .orderBy(desc(contacts.createdAt))
      .limit(10),

    db.select().from(messages)
      .where(eq(messages.clinicId, id))
      .orderBy(desc(messages.createdAt))
      .limit(10),

    db.select({ status: cadenceEnrollments.status, count: count() })
      .from(cadenceEnrollments)
      .where(eq(cadenceEnrollments.clinicId, id))
      .groupBy(cadenceEnrollments.status),
  ]);

  const [totalContacts] = await db.select({ count: count() }).from(contacts).where(eq(contacts.clinicId, id));
  const [totalSent]     = await db.select({ count: count() }).from(messages).where(and(eq(messages.clinicId, id), eq(messages.direction, 'outbound')));
  const [optedOut]      = await db.select({ count: count() }).from(contacts).where(and(eq(contacts.clinicId, id), eq(contacts.consentStatus, 'opted_out')));
  const activeCadences  = enrollmentStats.find((e) => e.status === 'active')?.count ?? 0;

  return { clinic, modules, recentContacts, recentMessages, totalContacts: totalContacts.count, totalSent: totalSent.count, optedOut: optedOut.count, activeCadences };
}

const CONSENT_STYLES: Record<string, string> = {
  opted_in:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  opted_out: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  unknown:   'bg-slate-100 text-slate-500',
};

const DIR_STYLES: Record<string, string> = {
  inbound:  'bg-slate-100 text-slate-600',
  outbound: 'bg-blue-50 text-blue-700',
};

export default async function ClinicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getClinicData(id);
  if (!data) notFound();

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { clinic, modules, recentContacts, recentMessages, totalContacts, totalSent, optedOut, activeCadences } = data!;

  const webhookUrl = `${process.env.API_BASE_URL}/webhooks/leads/${clinic.id}`;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/clinics" className="text-slate-400 hover:text-slate-600 text-sm">Clinics</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 text-sm font-medium">{clinic.name}</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{clinic.name}</h1>
          <p className="text-slate-400 text-sm mt-0.5 font-mono">{clinic.inboundNumber} · {clinic.timezone}</p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
          clinic.status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
        }`}>
          {clinic.status}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Contacts',       value: totalContacts },
          { label: 'SMS sent',       value: totalSent },
          { label: 'Opted out',      value: optedOut },
          { label: 'Active cadences', value: activeCadences },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-200">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-3xl font-semibold text-slate-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Modules + Webhook */}
      <div className="grid grid-cols-2 gap-6">
        {/* Modules */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Active modules</h2>
          {modules.length === 0 ? (
            <p className="text-slate-400 text-sm">No modules configured.</p>
          ) : (
            <div className="space-y-2">
              {modules.map((m) => (
                <div key={m.moduleKey} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-700">{m.moduleKey.replace(/_/g, ' ')}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    m.enabled ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {m.enabled ? 'enabled' : 'disabled'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Webhook info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Lead webhook</h2>
          <p className="text-xs text-slate-500 mb-2">POST this URL from the client's lead form or CRM:</p>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 break-all">
            <code className="text-xs text-slate-700">{webhookUrl}</code>
          </div>
          <p className="text-xs text-slate-500 mt-3 mb-1">Required header:</p>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <code className="text-xs text-slate-700">x-jedna-secret: {'<your LEADS_WEBHOOK_SECRET>'}</code>
          </div>
        </div>
      </div>

      {/* Recent contacts + messages */}
      <div className="grid grid-cols-2 gap-6">
        {/* Contacts */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Recent contacts</h2>
            <Link href={`/clinics/${id}/contacts`} className="text-xs text-blue-600 hover:text-blue-500">View all</Link>
          </div>
          {recentContacts.length === 0 ? (
            <p className="text-slate-400 text-sm p-5">No contacts yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {recentContacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{c.name ?? c.phone}</div>
                      {c.name && <div className="text-xs text-slate-400 font-mono">{c.phone}</div>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CONSENT_STYLES[c.consentStatus]}`}>
                        {c.consentStatus.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Messages */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Recent messages</h2>
          </div>
          {recentMessages.length === 0 ? (
            <p className="text-slate-400 text-sm p-5">No messages yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentMessages.map((m) => (
                <div key={m.id} className="px-5 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${DIR_STYLES[m.direction]}`}>
                      {m.direction}
                    </span>
                    {m.module && (
                      <span className="text-xs text-slate-400">{m.module.replace(/_/g, ' ')}</span>
                    )}
                    <span className="text-xs text-slate-300 ml-auto">
                      {new Date(m.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 line-clamp-2">{m.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
