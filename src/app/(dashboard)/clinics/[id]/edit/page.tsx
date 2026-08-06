export const dynamic = 'force-dynamic';

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { clinics, clinicModules } from '@/lib/schema';
import { eq } from 'drizzle-orm';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'America/Sao_Paulo',
];

async function updateClinic(formData: FormData) {
  'use server';

  const id                  = formData.get('id') as string;
  const name                = formData.get('name') as string;
  const timezone            = formData.get('timezone') as string;
  const ownerNotifyNumber   = formData.get('ownerNotifyNumber') as string;

  await db.update(clinics).set({ name, timezone, ownerNotifyNumber }).where(eq(clinics.id, id));

  const stlFirst       = formData.get('stl_first_message') as string | null;
  const stlOwner       = formData.get('stl_owner_template') as string | null;
  const stlBookingLink = formData.get('stl_booking_link') as string | null;
  const mcTextback     = formData.get('mc_textback_template') as string | null;
  const mcOwner        = formData.get('mc_owner_template') as string | null;
  const mcBookingLink  = formData.get('mc_booking_link') as string | null;

  const modules = await db.select().from(clinicModules).where(eq(clinicModules.clinicId, id));

  for (const mod of modules) {
    const existing = (mod.config ?? {}) as Record<string, unknown>;

    if (mod.moduleKey === 'speed_to_lead') {
      await db
        .update(clinicModules)
        .set({
          config: {
            ...existing,
            ...(stlFirst       ? { first_message_template: stlFirst }   : {}),
            ...(stlOwner       ? { owner_template: stlOwner }           : {}),
            ...(stlBookingLink ? { booking_link: stlBookingLink }       : {}),
          },
        })
        .where(eq(clinicModules.id, mod.id));
    }

    if (mod.moduleKey === 'missed_call') {
      await db
        .update(clinicModules)
        .set({
          config: {
            ...existing,
            ...(mcTextback    ? { textback_template: mcTextback }       : {}),
            ...(mcOwner       ? { owner_template: mcOwner }             : {}),
            ...(mcBookingLink ? { booking_link: mcBookingLink }         : {}),
          },
        })
        .where(eq(clinicModules.id, mod.id));
    }
  }

  redirect(`/clinics/${id}`);
}

export default async function EditClinicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, id) });
  if (!clinic) notFound();

  const modules = await db.select().from(clinicModules).where(eq(clinicModules.clinicId, id));
  const stl = modules.find((m) => m.moduleKey === 'speed_to_lead');
  const mc  = modules.find((m) => m.moduleKey === 'missed_call');

  const stlConfig = (stl?.config ?? {}) as Record<string, string>;
  const mcConfig  = (mc?.config  ?? {}) as Record<string, string>;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/clinics" className="text-slate-400 hover:text-slate-600 text-sm">Clinics</Link>
          <span className="text-slate-300">/</span>
          <Link href={`/clinics/${id}`} className="text-slate-400 hover:text-slate-600 text-sm">{clinic.name}</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 text-sm font-medium">Edit</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit clinic</h1>
        <p className="text-slate-500 text-sm mt-0.5">Update settings and message templates</p>
      </div>

      <form action={updateClinic} className="space-y-8">
        <input type="hidden" name="id" value={id} />

        {/* Clinic details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Clinic details</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              name="name"
              defaultValue={clinic.name}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
            <select
              name="timezone"
              defaultValue={clinic.timezone}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Owner notify number</label>
            <input
              name="ownerNotifyNumber"
              defaultValue={clinic.ownerNotifyNumber}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">Where alerts are sent when new leads / missed calls come in.</p>
          </div>
        </div>

        {/* Speed-to-lead messages */}
        {stl && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">Speed-to-lead messages</h2>
            <p className="text-xs text-slate-400">Variables: <code className="bg-slate-100 px-1 rounded">{'{name}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{clinic_name}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{phone}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{source}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{booking_link}'}</code></p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Booking link (Calendly, etc.)</label>
              <input
                name="stl_booking_link"
                defaultValue={stlConfig.booking_link ?? ''}
                placeholder="https://calendly.com/yourlink"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">Used in follow-up messages as <code className="bg-slate-100 px-1 rounded">{'{booking_link}'}</code>. Leave blank to show "reply here to book".</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First-touch message (sent instantly)</label>
              <textarea
                name="stl_first_message"
                rows={3}
                defaultValue={stlConfig.first_message_template ?? "Hi {name}! Thanks for reaching out to {clinic_name}. We'll be with you shortly."}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Owner notification</label>
              <textarea
                name="stl_owner_template"
                rows={2}
                defaultValue={stlConfig.owner_template ?? 'New lead: {name} {phone} — auto-texted them.'}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Missed-call messages */}
        {mc && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">Missed-call messages</h2>
            <p className="text-xs text-slate-400">Variables: <code className="bg-slate-100 px-1 rounded">{'{clinic_name}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{name}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{caller}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{booking_link}'}</code></p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Booking link (Calendly, etc.)</label>
              <input
                name="mc_booking_link"
                defaultValue={mcConfig.booking_link ?? ''}
                placeholder="https://calendly.com/yourlink"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Text-back message (sent on missed call)</label>
              <textarea
                name="mc_textback_template"
                rows={3}
                defaultValue={mcConfig.textback_template ?? 'Hi! We missed your call at {clinic_name}. How can we help you today?'}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Owner notification</label>
              <textarea
                name="mc_owner_template"
                rows={2}
                defaultValue={mcConfig.owner_template ?? 'Missed call from {caller} ({status}) — auto-texted them.'}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Save changes
          </button>
          <Link
            href={`/clinics/${id}`}
            className="px-5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
