import express from "express";
import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor
} from "../controllers/doctorcontroller.js";

const router = express.Router();

router.post("/", createDoctor);
router.get("/", getDoctors);
router.get("/:id", getDoctorById);
router.put("/:id", updateDoctor); 

export default router;
