import { Hono } from "hono";
import { requireAuth, requireOrganization } from "../../middleware/auth-middleware";
import { 
  handleOrganizationCreated,
  handleOrganizationDeleted,
  getOrganizationDetails,
  ensureCollection,
  getSettings,
  updateSettings,
} from "./organizations.controller";

const organizationsRouter = new Hono();

// Webhook endpoints for Better Auth organization events
organizationsRouter.post("/webhook/created", handleOrganizationCreated);
organizationsRouter.post("/webhook/deleted", handleOrganizationDeleted);

// Management endpoints
organizationsRouter.get("/:organizationId", getOrganizationDetails);
organizationsRouter.post("/:organizationId/ensure-collection", ensureCollection);

// Settings endpoints (requires auth)
organizationsRouter.get("/:organizationId/settings", requireAuth, requireOrganization, getSettings);
organizationsRouter.put("/:organizationId/settings", requireAuth, requireOrganization, updateSettings);

export default organizationsRouter; 
