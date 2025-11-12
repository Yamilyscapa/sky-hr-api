import type { Context } from "hono";
import { successResponse, errorResponse } from "../../core/http";
import {
  listVisitors,
  getVisitorById,
  createVisitor,
  updateVisitor,
  approveVisitor,
  rejectVisitor,
  cancelVisitor,
} from "./visitors.service";

function getOrgId(c: Context) {
  const org = c.get("organization");
  return (org?.id as string | undefined) || c.req.header("x-organization-id") || undefined;
}

export const list = async (c: Context) => {
  try {
    const orgId = getOrgId(c);
    if (!orgId) return errorResponse(c, "organizationId is required", 400);

    const url = new URL(c.req.url);
    const status = (url.searchParams.get("status") || undefined) as any;
    const q = url.searchParams.get("q") || undefined;
    const page = Number(url.searchParams.get("page") || 1);
    const pageSize = Math.min(50, Number(url.searchParams.get("pageSize") || 20));

    const { rows, meta } = await listVisitors({ organizationId: orgId, status, q, page, pageSize });
    return successResponse(c, { message: "Visitors retrieved", data: rows, meta });
  } catch (e: any) {
    return errorResponse(c, e.message ?? "Internal error", 500);
  }
};

export const getOne = async (c: Context) => {
  try {
    const orgId = getOrgId(c);
    if (!orgId) return errorResponse(c, "organizationId is required", 400);
    const id = c.req.param("id");
    const row = await getVisitorById(orgId, id);
    if (!row) return errorResponse(c, "Not found", 404);
    return successResponse(c, { message: "Visitor retrieved", data: row });
  } catch (e: any) {
    return errorResponse(c, e.message ?? "Internal error", 500);
  }
};

export const create = async (c: Context) => {
  try {
    const orgId = getOrgId(c);
    if (!orgId) return errorResponse(c, "organizationId is required", 400);
    const user = c.get("user");
    const role = c.get("role");
    const body = await c.req.json();

    const inserted = await createVisitor({
      organizationId: orgId,
      userId: user.id,
      name: String(body.name),
      accessAreas: String(body.accessAreas ?? ""),
      entryDate: new Date(body.entryDate),
      exitDate: new Date(body.exitDate),
      approveNow: Boolean(body.approveNow),
      isPrivileged: role === "owner" || role === "admin",
    });

    return successResponse(c, { message: "Visitor created", data: inserted });
  } catch (e: any) {
    const msg = e.message ?? "Internal error";
    const code = msg.includes("Forbidden") ? 403 : msg.includes("entryDate") ? 400 : 500;
    return errorResponse(c, msg, code);
  }
};

export const update = async (c: Context) => {
  try {
    const orgId = getOrgId(c);
    if (!orgId) return errorResponse(c, "organizationId is required", 400);
    const user = c.get("user");
    const role = c.get("role");
    const id = c.req.param("id");
    const body = await c.req.json();

    const updated = await updateVisitor({
      organizationId: orgId,
      id,
      userId: user.id,
      isPrivileged: role === "owner" || role === "admin",
      patch: {
        name: body.name,
        accessAreas: body.accessAreas,
        entryDate: body.entryDate ? new Date(body.entryDate) : undefined,
        exitDate: body.exitDate ? new Date(body.exitDate) : undefined,
      },
    });

    if (!updated) return errorResponse(c, "Not found", 404);
    return successResponse(c, { message: "Visitor updated", data: updated });
  } catch (e: any) {
    const msg = e.message ?? "Internal error";
    const code = msg.includes("Forbidden") ? 403 : msg.includes("entryDate") ? 400 : 500;
    return errorResponse(c, msg, code);
  }
};

export const approve = async (c: Context) => {
  try {
    const orgId = getOrgId(c);
    if (!orgId) return errorResponse(c, "organizationId is required", 400);
    const user = c.get("user");
    const id = c.req.param("id");
    const updated = await approveVisitor(orgId, id, user.id);
    if (!updated) return errorResponse(c, "Not found", 404);
    return successResponse(c, { message: "Visitor approved", data: updated });
  } catch (e: any) {
    return errorResponse(c, e.message ?? "Internal error", 500);
  }
};

export const reject = async (c: Context) => {
  try {
    const orgId = getOrgId(c);
    if (!orgId) return errorResponse(c, "organizationId is required", 400);
    const id = c.req.param("id");
    const updated = await rejectVisitor(orgId, id);
    if (!updated) return errorResponse(c, "Not found", 404);
    return successResponse(c, { message: "Visitor rejected", data: updated });
  } catch (e: any) {
    return errorResponse(c, e.message ?? "Internal error", 500);
  }
};

export const cancel = async (c: Context) => {
  try {
    const orgId = getOrgId(c);
    if (!orgId) return errorResponse(c, "organizationId is required", 400);
    const user = c.get("user");
    const role = c.get("role");
    const id = c.req.param("id");
    const updated = await cancelVisitor(orgId, id, user.id, role === "owner" || role === "admin");
    if (!updated) return errorResponse(c, "Not found", 404);
    return successResponse(c, { message: "Visitor cancelled", data: updated });
  } catch (e: any) {
    const msg = e.message ?? "Internal error";
    const code = msg.includes("Forbidden") ? 403 : 500;
    return errorResponse(c, msg, code);
  }
};