import {
  pgSchema,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

export const jednaSchema = pgSchema('jedna');

export const clinicStatusEnum     = pgEnum('clinic_status',     ['active', 'paused']);
export const consentStatusEnum    = pgEnum('consent_status',    ['unknown', 'opted_in', 'opted_out']);
export const messageDirectionEnum = pgEnum('message_direction', ['inbound', 'outbound']);

export const clinics = jednaSchema.table('clinics', {
  id:                uuid('id').primaryKey().defaultRandom(),
  name:              text('name').notNull(),
  timezone:          text('timezone').notNull(),
  businessHours:     jsonb('business_hours').notNull().default({}),
  brand:             jsonb('brand').notNull().default({}),
  inboundNumber:     text('inbound_number').notNull(),
  ownerNotifyNumber: text('owner_notify_number').notNull(),
  status:            clinicStatusEnum('status').notNull().default('active'),
  createdAt:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const clinicModules = jednaSchema.table('clinic_modules', {
  id:        uuid('id').primaryKey().defaultRandom(),
  clinicId:  uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  moduleKey: text('module_key').notNull(),
  enabled:   boolean('enabled').notNull().default(false),
  config:    jsonb('config').notNull().default({}),
}, (t) => [
  unique('clinic_modules_clinic_module_unique').on(t.clinicId, t.moduleKey),
]);

export const contacts = jednaSchema.table('contacts', {
  id:              uuid('id').primaryKey().defaultRandom(),
  clinicId:        uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  phone:           text('phone').notNull(),
  name:            text('name'),
  email:           text('email'),
  consentStatus:   consentStatusEnum('consent_status').notNull().default('unknown'),
  consentSource:   text('consent_source'),
  lastContactedAt: timestamp('last_contacted_at', { withTimezone: true }),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('contacts_clinic_phone_unique').on(t.clinicId, t.phone),
]);

export const messages = jednaSchema.table('messages', {
  id:        uuid('id').primaryKey().defaultRandom(),
  clinicId:  uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  direction: messageDirectionEnum('direction').notNull(),
  body:      text('body').notNull(),
  module:    text('module'),
  twilioSid: text('twilio_sid'),
  status:    text('status').notNull().default('queued'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const events = jednaSchema.table('events', {
  id:        uuid('id').primaryKey().defaultRandom(),
  clinicId:  uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  type:      text('type').notNull(),
  payload:   jsonb('payload').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cadenceEnrollments = jednaSchema.table('cadence_enrollments', {
  id:         uuid('id').primaryKey().defaultRandom(),
  clinicId:   uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  contactId:  uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  module:     text('module').notNull(),
  status:     text('status').notNull().default('active'),
  nextStep:   integer('next_step').notNull().default(0),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Clinic            = typeof clinics.$inferSelect;
export type ClinicModule      = typeof clinicModules.$inferSelect;
export type Contact           = typeof contacts.$inferSelect;
export type Message           = typeof messages.$inferSelect;
export type CadenceEnrollment = typeof cadenceEnrollments.$inferSelect;
