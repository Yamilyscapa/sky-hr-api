import type { Context } from "hono";
import { successResponse, errorResponse } from "../../core/http";
import { 
  createOrganizationCollection,
  deleteOrganizationCollection,
  getOrganization,
  ensureOrganizationCollection
} from "./organizations.service";

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
