'use client';

import { useRef } from 'react';

interface Props {
  action: (formData: FormData) => Promise<void>;
  timezones: string[];
}

export function NewClinicForm({ action, timezones }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={action} className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Clinic details</h2>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Clinic name</label>
          <input
            name="name"
            type="text"
            required
            placeholder="Sunrise Dental"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Timezone</label>
          <select
            name="timezone"
            required
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Twilio inbound number</label>
          <input
            name="inboundNumber"
            type="text"
            required
            placeholder="+14705551234"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-400 mt-1">E.164 format. This is the number Twilio routes calls and SMS to.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Owner notify number</label>
          <input
            name="ownerNotifyNumber"
            type="text"
            required
            placeholder="+14705559999"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-400 mt-1">Owner receives a notification SMS on every new lead or missed call.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Modules</h2>

        <div className="flex items-start gap-3">
          <input
            name="enableMissedCall"
            id="enableMissedCall"
            type="checkbox"
            defaultChecked
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <label htmlFor="enableMissedCall" className="text-sm font-medium text-slate-700">
              Missed-call text-back
            </label>
            <p className="text-xs text-slate-400 mt-0.5">Automatically texts callers who go unanswered, then follows up at 2 hr and 24 hr.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Forward calls to</label>
          <input
            name="forwardNumber"
            type="text"
            placeholder="+14705559999"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-400 mt-1">The real clinic phone number that Twilio dials.</p>
        </div>

        <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
          <input
            name="enableSpeedToLead"
            id="enableSpeedToLead"
            type="checkbox"
            defaultChecked
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <label htmlFor="enableSpeedToLead" className="text-sm font-medium text-slate-700">
              Speed-to-lead
            </label>
            <p className="text-xs text-slate-400 mt-0.5">Texts new form leads instantly, then follows up at 30 min, 24 hr, and 72 hr if no reply.</p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors"
      >
        Create clinic
      </button>
    </form>
  );
}
