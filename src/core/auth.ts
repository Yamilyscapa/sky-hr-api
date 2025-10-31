import { organization as organizationPlugin } from 'better-auth/plugins';
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { db } from "../db";
import { users, accounts, sessions, verificationTokens, organization, member, invitation, team, teamMember } from "../db/schema";
import { sendEmail } from "../utils/email";

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL;
const TRUSTED_ORIGINS = process.env.TRUSTED_ORIGINS;

export const auth = betterAuth({
  basePath: "/auth", // Especifica que las rutas serán /auth/* en lugar de /api/auth/*
  plugins: [
    expo(), // Plugin para soporte nativo de Expo
    organizationPlugin({
      // ! Restrict organization creation to only paid users
      allowUserToCreateOrganization: true,
      defaultRole: "member",
      teams: {
        enabled: true,
        maximumTeams: 10,
      },
      async sendInvitationEmail(data: any) {
        const appUrl = process.env.APP_URL;
        const token = data.invitation?.id;
        
        if (!token) {
          throw new Error("Invitation token is missing for email invitation.");
        }

        const inviteLink = `${appUrl}/accept-invitation?token=${token}`;

        await sendEmail(
          data.email,
          `Invitación para unirse a ${data.organization?.name ?? "una organización"}`,
          `<p>Está invitado a unirse a ${data.organization?.name ?? "una organización"}. Haga clic <a href="${inviteLink}">aquí</a> para aceptar la invitación.</p>`
        );
      },
      async onInvitationAccepted(data: any) {
        // TODO: Add logic to handle invitation accepted
      },
    })
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      account: accounts,
      session: sessions,
      verification: verificationTokens,
      organization: organization,
      member: member,
      invitation: invitation,
      team: team,
      teamMember: teamMember,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  cookies: {
    secure: true,              // required for SameSite=None
    sameSite: 'none',
    essionToken: {
      path: '/',            // avoid path lock-in
      httpOnly: true,
      // Cross-site (different TLDs):
      sameSite: 'none',
      secure: true,
      // If sharing subdomains instead:
      // domain: '.example.com',
      // sameSite: 'lax',
    }  // cross-site cookie
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24, // Actualizar cada día,
  },
  user: {
    additionalFields: {
      user_face_url: {
        type: "string[]",
        required: false,
      },
    },
  },
  trustedOrigins: TRUSTED_ORIGINS?.split(",") || [
    "http://localhost:3000", // Web development
    "https://localhost:3000", // Web development (HTTPS)
    "skyhr://", // Expo deep link scheme
    "exp://", // Expo development scheme
    "exp+skyhr://", // Expo development scheme with custom
  ],
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL || "http://localhost:8080",
});