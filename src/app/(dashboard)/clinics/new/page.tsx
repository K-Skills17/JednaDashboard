'use server' ;

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { clinics, clinicModules } from '@/lib/schema';
import { NewClinicForm } from '@/components/NewClinicForm';

export async function createClinic(formData: FormData) {
  'use server';

  const name              = formData.get('name') as string;
  const timezone          = formData.get('timezone') as string;
  const inboundNumber     = formData.get('inboundNumber') as string;
  const ownerNotifyNumber = formData.get('ownerNotifyNumber') as string;
  const forwardNumber     = formData.get('forwardNumber') as string;
  const enableMissedCall  = formData.get('enableMissedCall') === 'on';
  const enableSpeedToLead = formData.get('enableSpeedToLead') === 'on';

  const [clinic] = await db
    .insert(clinics)
    .values({ name, timezone, inboundNumber, ownerNotifyNumber })
    .returning();

  const moduleInserts = [];

  if (enableMissedCall) {
    moduleInserts.push({
      clinicId:  clinic.id,
      moduleKey: 'missed_call',
      enabled:   true,
      config:    { forward_number: forwardNumber, respect_quiet_hours: false },
    });
  }

  if (enableSpeedToLead) {
    moduleInserts.push({
      clinicId:  clinic.id,
      moduleKey: 'speed_to_lead',
      enabled:   true,
      config:    { respect_quiet_hours: true },
    });
  }

  if (moduleInserts.length > 0) {
    await db.insert(clinicModules).values(moduleInserts);
  }

  redirect(`/clinics/${clinic.id}`);
}

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

export default function NewClinicPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Add clinic</h1>
        <p className="text-slate-500 text-sm mt-0.5">Onboard a new client onto the Jedna platform</p>
      </div>

      <NewClinicForm action={createClinic} timezones={TIMEZONES} />
    </div>
  );
}
