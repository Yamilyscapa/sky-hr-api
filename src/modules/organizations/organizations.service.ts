import { db } from "../../db";
import { organization } from "../../db/schema";
import { eq } from "drizzle-orm";
import { createCollection, deleteCollection } from "../biometrics/biometrics.service";

export interface OrganizationWithCollection {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  createdAt: Date;
  metadata: string | null;
  subscription_id: string | null;
  is_active: boolean;
  updated_at: Date;
  rekognition_collection_id: string | null;
}

/**
 * Generate a unique collection ID for the organization
 */
const generateCollectionId = (organizationId: string): string => {
  // Rekognition collection names must be alphanumeric and underscores only
  // Format: skyhr_org_{organizationId}
  return `skyhr_org_${organizationId.replace(/[^a-zA-Z0-9]/g, '_')}`;
};

/**
 * Create a Rekognition collection for an organization
 */
export const createOrganizationCollection = async (organizationId: string): Promise<string | null> => {
  try {
    const collectionId = generateCollectionId(organizationId);
    
    // Create the collection in AWS Rekognition
    const success = await createCollection(collectionId);
    
    if (success) {
      // Update the organization record with the collection ID
      await db
        .update(organization)
        .set({ 
          rekognition_collection_id: collectionId,
          updated_at: new Date()
        })
        .where(eq(organization.id, organizationId));
      
      console.log(`Created Rekognition collection: ${collectionId} for organization: ${organizationId}`);
      return collectionId;
    }
    
    console.error(`Failed to create Rekognition collection for organization: ${organizationId}`);
    return null;
  } catch (error) {
    console.error(`Error creating organization collection:`, error);
    return null;
  }
};

/**
 * Delete a Rekognition collection for an organization
 */
export const deleteOrganizationCollection = async (organizationId: string): Promise<boolean> => {
  try {
    // Get the organization to find the collection ID
    const org = await getOrganization(organizationId);
    
    if (!org?.rekognition_collection_id) {
      console.warn(`No collection found for organization: ${organizationId}`);
      return true; // Consider it successful if no collection exists
    }
    
    // Delete the collection from AWS Rekognition
    const success = await deleteCollection(org.rekognition_collection_id);
    
    if (success) {
      // Remove the collection ID from the organization record
      await db
        .update(organization)
        .set({ 
          rekognition_collection_id: null,
          updated_at: new Date()
        })
        .where(eq(organization.id, organizationId));
      
      console.log(`Deleted Rekognition collection: ${org.rekognition_collection_id} for organization: ${organizationId}`);
    }
    
    return success;
  } catch (error) {
    console.error(`Error deleting organization collection:`, error);
    return false;
  }
};

/**
 * Get organization by ID with collection info
 */
export const getOrganization = async (organizationId: string): Promise<OrganizationWithCollection | null> => {
  try {
    const result = await db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    console.error(`Error fetching organization:`, error);
    return null;
  }
};

/**
 * Get organization's Rekognition collection ID
 */
export const getOrganizationCollectionId = async (organizationId: string): Promise<string | null> => {
  try {
    const org = await getOrganization(organizationId);
    return org?.rekognition_collection_id || null;
  } catch (error) {
    console.error(`Error fetching organization collection ID:`, error);
    return null;
  }
};

/**
 * Ensure organization has a Rekognition collection (create if missing)
 */
export const ensureOrganizationCollection = async (organizationId: string): Promise<string | null> => {
  try {
    const org = await getOrganization(organizationId);
    
    if (!org) {
      console.error(`Organization not found: ${organizationId}`);
      return null;
    }
    
    // If collection already exists, return it
    if (org.rekognition_collection_id) {
      return org.rekognition_collection_id;
    }
    
    // Create new collection
    return await createOrganizationCollection(organizationId);
  } catch (error) {
    console.error(`Error ensuring organization collection:`, error);
    return null;
  }
};
