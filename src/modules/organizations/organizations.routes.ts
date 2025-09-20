import { Hono } from "hono";
import { 
  handleOrganizationCreated,
  handleOrganizationDeleted,
  getOrganizationDetails,
  ensureCollection
} from "./organizations.controller";

const organizationsRouter = new Hono();

// Webhook endpoints for Better Auth organization events
organizationsRouter.post("/webhook/created", handleOrganizationCreated);
organizationsRouter.post("/webhook/deleted", handleOrganizationDeleted);

// Management endpoints
organizationsRouter.get("/:organizationId", getOrganizationDetails);
organizationsRouter.post("/:organizationId/ensure-collection", ensureCollection);

export default organizationsRouter;
