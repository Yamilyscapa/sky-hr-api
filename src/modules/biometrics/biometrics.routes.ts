import { Hono } from "hono";
import { 
  compareFaces, 
  detectFaces, 
  indexFace, 
  indexFaceForOrganization,
  searchFaces, 
  searchFacesForOrganization,
  testConnection 
} from "./biometrics.controller";

const biometricsRouter = new Hono();

biometricsRouter.post("/compare-faces", compareFaces);

biometricsRouter.post("/detect-faces", detectFaces);

biometricsRouter.post("/index-face", indexFace);

biometricsRouter.post("/search-faces", searchFaces);

// Organization-specific biometric endpoints
biometricsRouter.post("/organization/index-face", indexFaceForOrganization);
biometricsRouter.post("/organization/search-faces", searchFacesForOrganization);

// Test Rekognition connection
biometricsRouter.get("/test-connection", testConnection);

export default biometricsRouter;