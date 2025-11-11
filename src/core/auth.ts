import { organization as organizationPlugin } from 'better-auth/plugins';
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { db } from "../db";
import { users, accounts, sessions, verificationTokens, organization, member, invitation, team, teamMember } from "../db/schema";
import { sendEmail } from "../utils/email";
import { createOrganizationCollection, deleteOrganizationCollection } from "../modules/organizations/organizations.service";
import { TRUSTED_ORIGINS } from "../utils/cors";

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;

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
      organizationHooks: {
        // Create Rekognition collection after organization is created
        afterCreateOrganization: async ({ organization, member, user }) => {
          console.log(`[afterCreateOrganization Hook] Triggered for organization: ${organization.id}`, {
            organizationId: organization.id,
            organizationName: organization.name,
          });
          
          try {
            // Directly create Rekognition collection for the new organization
            const collectionId = await createOrganizationCollection(organization.id);
            
            if (collectionId) {
              console.log(`[afterCreateOrganization Hook] Successfully created Rekognition collection ${collectionId} for organization: ${organization.id}`);
            } else {
              console.error(`[afterCreateOrganization Hook] Failed to create Rekognition collection for organization: ${organization.id}`);
            }
          } catch (error) {
            // Log error but don't fail organization creation
            console.error(`[afterCreateOrganization Hook] Error creating Rekognition collection for organization ${organization.id}:`, {
              error: error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined,
            });
          }
        },
        // Delete Rekognition collection after organization is deleted
        afterDeleteOrganization: async ({ organization }) => {
          try {
            // Directly delete Rekognition collection for the organization
            const success = await deleteOrganizationCollection(organization.id);
            
            if (success) {
              console.log(`Successfully deleted Rekognition collection for organization: ${organization.id}`);
            } else {
              console.error(`Failed to delete Rekognition collection for organization: ${organization.id}`);
            }
          } catch (error) {
            // Log error but don't fail organization deletion
            console.error(`Error deleting Rekognition collection for organization ${organization.id}:`, error);
          }
        },
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
    sessionToken: {
      path: '/',            // avoid path lock-in
      httpOnly: true,
      // Cross-site (different TLDs):
      sameSite: 'none',
      secure: true,
      // If sharing subdomains instead:
      domain: COOKIE_DOMAIN,
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
  trustedOrigins: TRUSTED_ORIGINS,
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL || "http://localhost:8080",
});