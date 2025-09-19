import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums para roles organizacionales (Better Auth default roles)
export const organizationRoleEnum = pgEnum("organization_role", [
  "owner",    // Creador de la organización, máximo control
  "admin",    // Administrador, control total excepto eliminar org o cambiar owner
  "member",   // Miembro regular, control limitado
]);

// Business Module Tables
export const subscription = pgTable("subscription", {
  id: uuid("id").primaryKey().defaultRandom(),
  is_active: boolean("is_active").notNull().default(true),
  max_users: integer("max_users").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logo: text("logo"),
  createdAt: timestamp("created_at").notNull(),
  metadata: text("metadata"),
  // Custom fields for your application
  subscription_id: uuid("subscription_id").references(() => subscription.id),
  is_active: boolean("is_active").notNull().default(true),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});



// Better Auth Core Tables
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  // Custom fields for your application
  user_face_url: text("user_face_url"),
  deleted_at: timestamp("deleted_at"),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => users.id),
  impersonatedBy: text("impersonatedBy").references(() => users.id),
  activeOrganizationId: text("activeOrganizationId"),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => users.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verificationTokens = pgTable("verificationTokens", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Better Auth Organization Plugin Tables
export const member = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

// Better Auth Teams Tables
export const team = pgTable("team", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const teamMember = pgTable("team_member", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => team.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").references(() => users.id),
  message: text("message").notNull(),
  documents_url: text("documents_url").notNull(),
  starting_date: timestamp("starting_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  is_approved: boolean("is_approved").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

// Geofence Module
export const geofence = pgTable("geofence", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(), // enum: 'circular', 'polygon', etc.
  center_latitude: text("center_latitude"), // Center point for circular geofence
  center_longitude: text("center_longitude"),
  radius: integer("radius"), // Radius in meters for circular geofence
  coordinates: text("coordinates"), // JSON string for polygon coordinates
  organization_id: text("organization_id").references(() => organization.id),
  active: boolean("active").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

// Attendance Module
export const attendance_event = pgTable("attendance_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").references(() => users.id),
  check_in: timestamp("check_in").notNull(),
  is_verified: boolean("is_verified").notNull().default(false),
  organization_id: text("organization_id").references(() => organization.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  deleted_at: timestamp("deleted_at"),
  // Geolocation fields
  latitude: text("latitude"), // Using text for precise decimal coordinates
  longitude: text("longitude"),
  distance_to_geofence_m: integer("distance_to_geofence_m"), // Distance in meters
  // Biometric verification fields
  source: text("source").notNull(), // enum: 'face', 'fingerprint', 'manual', 'qr', etc.
  face_confidence: text("face_confidence"), // Confidence score as text for precision
  liveness_score: text("liveness_score"), // Anti-spoofing liveness score
  spoof_flag: boolean("spoof_flag").notNull().default(false), // True if potential spoof detected
});

// Announcements
export const announcement = pgTable("announcement", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  organization_id: text("organization_id").references(() => organization.id),
  scope: text("scope").notNull(), // enum: 'all', 'team', 'department', 'specific_users'
  category: text("category").notNull(), // enum para categorías
  created_at: timestamp("created_at").notNull().defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

// Tabla de relación para announcements dirigidos a teams específicos
export const announcement_teams = pgTable("announcement_teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  announcement_id: uuid("announcement_id").notNull().references(() => announcement.id, { onDelete: "cascade" }),
  team_id: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const subscriptionRelations = relations(subscription, ({ many }) => ({
  organizations: many(organization),
}));

export const organizationRelations = relations(
  organization,
  ({ one, many }) => ({
    subscription: one(subscription, {
      fields: [organization.subscription_id],
      references: [subscription.id],
    }),
    attendanceEvents: many(attendance_event),
    announcements: many(announcement),
    geofences: many(geofence),
    // Better Auth organization plugin relations
    members: many(member),
    invitations: many(invitation),
    teams: many(team),
  }),
);

export const usersRelations = relations(users, ({ one, many }) => ({
  permissions: many(permissions),
  attendanceEvents: many(attendance_event),
  // Better Auth relations
  sessions: many(sessions),
  accounts: many(accounts),
  // Better Auth organization plugin relations
  memberships: many(member),
  sentInvitations: many(invitation),
  teamMemberships: many(teamMember),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const verificationTokensRelations = relations(verificationTokens, ({ one }) => ({
  // Verification tokens don't typically have user relations in Better Auth
  // They're identified by email/identifier
}));

export const permissionsRelations = relations(permissions, ({ one }) => ({
  user: one(users, {
    fields: [permissions.user_id],
    references: [users.id],
  }),
}));

export const attendanceEventRelations = relations(
  attendance_event,
  ({ one }) => ({
    user: one(users, {
      fields: [attendance_event.user_id],
      references: [users.id],
    }),
    organization: one(organization, {
      fields: [attendance_event.organization_id],
      references: [organization.id],
    }),
  }),
);

export const announcementRelations = relations(announcement, ({ one, many }) => ({
  organization: one(organization, {
    fields: [announcement.organization_id],
    references: [organization.id],
  }),
  teams: many(announcement_teams),
}));

export const announcementTeamsRelations = relations(announcement_teams, ({ one }) => ({
  announcement: one(announcement, {
    fields: [announcement_teams.announcement_id],
    references: [announcement.id],
  }),
  team: one(team, {
    fields: [announcement_teams.team_id],
    references: [team.id],
  }),
}));

export const geofenceRelations = relations(geofence, ({ one }) => ({
  organization: one(organization, {
    fields: [geofence.organization_id],
    references: [organization.id],
  }),
}));


// Better Auth Organization Plugin Relations
export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(users, {
    fields: [member.userId],
    references: [users.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  inviter: one(users, {
    fields: [invitation.inviterId],
    references: [users.id],
  }),
}));

// Team Relations
export const teamRelations = relations(team, ({ one, many }) => ({
  organization: one(organization, {
    fields: [team.organizationId],
    references: [organization.id],
  }),
  members: many(teamMember),
  announcements: many(announcement_teams),
}));

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, {
    fields: [teamMember.teamId],
    references: [team.id],
  }),
  user: one(users, {
    fields: [teamMember.userId],
    references: [users.id],
  }),
}));
