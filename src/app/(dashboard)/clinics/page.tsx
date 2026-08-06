import { db } from '@/lib/db';
import { clinics, clinicModules, contacts, messages, cadenceEnrollments } from '@/lib/schema';
import { eq, count, and } from 'drizzle-orm';
import Link from 'next/link';

async function getOverviewStats() {
  const [clinicCount] = await db.select({ count: count() }).from(clinics);
  const [contactCount] = await db.select({ count: count() }).from(contacts);
  const [messageCount] = await db.select({ count: count() }).from(messages);
  const [activeEnrollments] = await db
    .select({ count: count() })
    .from(cadenceEnrollments)
    .where(eq(cadenceEnrollments.status, 'active'));

  return {
    clinics:          clinicCount.count,
    contacts:         contactCount.count,
    messagesSent:     messageCount.count,
    activeCadences:   activeEnrollments.count,
  };
}

async function getClinicsWithStats() {
  const allClinics = await db.select().from(clinics).orderBy(clinics.createdAt);

  const withStats = await Promise.all(
    allClinics.map(async (clinic) => {
      const [contactCount] = await db
        .select({ count: count() })
        .from(contacts)
        .where(eq(contacts.clinicId, clinic.id));

      const [msgCount] = await db
        .select({ count: count() })
        .from(messages)
        .where(and(eq(messages.clinicId, clinic.id), eq(messages.direction, 'outbound')));

      const modules = await db
        .select({ moduleKey: clinicModules.moduleKey, enabled: clinicModules.enabled })
        .from(clinicModules)
        .where(eq(clinicModules.clinicId, clinic.id));

      return { ...clinic, contactCount: contactCount.count, msgCount: msgCount.count, modules };
    }),
  );

  return withStats;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  paused: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

export default async function ClinicsPage() {
  const [stats, clinicList] = await Promise.all([getOverviewStats(), getClinicsWithStats()]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Clinics</h1>
          <p className="text-slate-500 text-sm mt-0.5">All tenants on the Jedna platform</p>
        </div>
        <Link
          href="/clinics/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          + Add clinic
        </Link>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total clinics',    value: stats.clinics },
          { label: 'Total contacts',   value: stats.contacts },
          { label: 'Messages sent',    value: stats.messagesSent },
          { label: 'Active cadences',  value: stats.activeCadences },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-200">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-3xl font-semibold text-slate-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Clinics table */}
      {clinicList.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No clinics yet.</p>
          <Link href="/clinics/new" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
            Add your first clinic
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Clinic</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Modules</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Contacts</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">SMS sent</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clinicList.map((clinic) => (
                <tr key={clinic.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-900">{clinic.name}</div>
                    <div className="text-slate-400 text-xs mt-0.5 font-mono">{clinic.inboundNumber}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[clinic.status]}`}>
                      {clinic.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {clinic.modules.map((m) => (
                        <span
                          key={m.moduleKey}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            m.enabled
                              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {m.moduleKey.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right text-slate-700">{clinic.contactCount}</td>
                  <td className="px-5 py-4 text-right text-slate-700">{clinic.msgCount}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/clinics/${clinic.id}`}
                      className="text-blue-600 hover:text-blue-500 font-medium text-xs"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
