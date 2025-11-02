import type { Context } from "hono";
import { successResponse, errorResponse } from "../../core/http";
import { 
  createOrganizationCollection,
  deleteOrganizationCollection,
  getOrganization,
  ensureOrganizationCollection
} from "./organizations.service";
import {
  getOrganizationSettings,
  ensureOrganizationSettings,
} from "../attendance/attendance.service";
import { db } from "../../db";
import { organization_settings } from "../../db/schema";
import { eq } from "drizzle-orm";

/**
 * Webhook handler for organization creation events
 * This will be called when Better Auth creates a new organization
 */
export const handleOrganizationCreated = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { organizationId } = body;
    
    if (!organizationId) {
      return errorResponse(c, "Organization ID is required", 400);
    }
    
    // Create Rekognition collection for the new organization
    const collectionId = await createOrganizationCollection(organizationId);
    
    if (collectionId) {
      return successResponse(c, {
        message: "Organization collection created successfully",
        data: { 
          organizationId, 
          collectionId 
        }
      });
    } else {
      return errorResponse(c, "Failed to create organization collection", 500);
    }
  } catch (error) {
    console.error("Organization creation webhook error:", error);
    return errorResponse(c, "Internal server error", 500);
  }
};

/**
 * Webhook handler for organization deletion events
 * This will be called when Better Auth deletes an organization
 */
export const handleOrganizationDeleted = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { organizationId } = body;
    
    if (!organizationId) {
      return errorResponse(c, "Organization ID is required", 400);
    }
    
    // Delete Rekognition collection for the organization
    const success = await deleteOrganizationCollection(organizationId);
    
    if (success) {
      return successResponse(c, {
        message: "Organization collection deleted successfully",
        data: { organizationId }
      });
    } else {
      return errorResponse(c, "Failed to delete organization collection", 500);
    }
  } catch (error) {
    console.error("Organization deletion webhook error:", error);
    return errorResponse(c, "Internal server error", 500);
  }
};

/**
 * Get organization details including collection info
 */
export const getOrganizationDetails = async (c: Context) => {
  try {
    const organizationId = c.req.param("organizationId");
    
    if (!organizationId) {
      return errorResponse(c, "Organization ID is required", 400);
    }
    
    const organization = await getOrganization(organizationId);
    
    if (!organization) {
      return errorResponse(c, "Organization not found", 404);
    }
    
    return successResponse(c, {
      message: "Organization retrieved successfully",
      data: organization
    });
  } catch (error) {
    console.error("Get organization error:", error);
    return errorResponse(c, "Internal server error", 500);
  }
};

/**
 * Manually create or ensure organization collection exists
 * Useful for existing organizations or recovery scenarios
 */
export const ensureCollection = async (c: Context) => {
  try {
    const organizationId = c.req.param("organizationId");
    
    if (!organizationId) {
      return errorResponse(c, "Organization ID is required", 400);
    }
    
    const collectionId = await ensureOrganizationCollection(organizationId);
    
    if (collectionId) {
      return successResponse(c, {
        message: "Organization collection ensured successfully",
        data: { 
          organizationId, 
          collectionId 
        }
      });
    } else {
      return errorResponse(c, "Failed to ensure organization collection", 500);
    }
  } catch (error) {
    console.error("Ensure collection error:", error);
    return errorResponse(c, "Internal server error", 500);
  }
};

/**
 * Get organization settings
 */
export const getSettings = async (c: Context) => {
  try {
    const organizationId = c.req.param("organizationId");
    const organization = c.get("organization");

    if (!organizationId) {
      return errorResponse(c, "Organization ID is required", 400);
    }

    // Verify user has access to this organization
    if (organization && organization.id !== organizationId) {
      return errorResponse(c, "Unauthorized to access this organization's settings", 403);
    }

    // Ensure settings exist (create with defaults if not)
    const settings = await ensureOrganizationSettings(organizationId);

    return successResponse(c, {
      message: "Organization settings retrieved successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return errorResponse(c, "Internal server error", 500);
  }
};

/**
 * Update organization settings
 */
export const updateSettings = async (c: Context) => {
  try {
    const organizationId = c.req.param("organizationId");
    const organization = c.get("organization");
    const body = await c.req.json();

    if (!organizationId) {
      return errorResponse(c, "Organization ID is required", 400);
    }

    // Verify user has access to this organization
    if (organization && organization.id !== organizationId) {
      return errorResponse(c, "Unauthorized to update this organization's settings", 403);
    }

    // Validate grace_period_minutes if provided
    if (body.grace_period_minutes !== undefined) {
      const gracePeriod = Number(body.grace_period_minutes);
      if (isNaN(gracePeriod) || gracePeriod < 0 || gracePeriod > 60) {
        return errorResponse(c, "grace_period_minutes must be between 0 and 60", 400);
      }
    }

    // Ensure settings exist first
    await ensureOrganizationSettings(organizationId);

    // Update settings
    const updated = await db
      .update(organization_settings)
      .set({
        grace_period_minutes: body.grace_period_minutes,
        timezone: body.timezone,
        updated_at: new Date(),
      })
      .where(eq(organization_settings.organization_id, organizationId))
      .returning();

    if (!updated || updated.length === 0) {
      return errorResponse(c, "Failed to update settings", 500);
    }

    return successResponse(c, {
      message: "Organization settings updated successfully",
      data: updated[0],
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return errorResponse(c, "Internal server error", 500);
  }
};
