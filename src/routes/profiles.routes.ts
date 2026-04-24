import { Router } from "express";
import { getProfiles, searchProfiles }              from "../controllers/profiles.controller";
import { validateProfileQuery, validateSearchQuery } from "../middleware/validate";

const router = Router();

// /search must be registered BEFORE any /:param routes to avoid shadowing
router.get("/search", validateSearchQuery, searchProfiles);
router.get("/",       validateProfileQuery, getProfiles);

export default router;