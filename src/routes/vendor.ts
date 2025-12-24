import { Router } from "express";
import { VendorsController } from "../controllers/vendor";
import { verifySupabaseToken } from "../middlewares/verify";
import { upload } from "../middlewares/upload";


const router = Router();

router.post("/", verifySupabaseToken ,  upload.single("image") ,VendorsController.create);
router.get("/", verifySupabaseToken ,VendorsController.getAll);
router.get("/:id",verifySupabaseToken , VendorsController.getById);
router.get("/user/:userId",verifySupabaseToken , VendorsController.getByUser);
router.patch("/:id",verifySupabaseToken , VendorsController.update);
router.delete("/:id",verifySupabaseToken , VendorsController.delete);

export default router;
