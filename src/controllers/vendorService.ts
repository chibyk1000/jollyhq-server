import { Request, Response } from "express";
import { db } from "../db"; // adjust path
import { vendorServices } from "../db/schema/vendorServices";
import { eq, and, isNull } from "drizzle-orm";
import { vendors } from "../db/schema/vendors";
import { uploadToSupabase } from "../utils/upload";

/**
 * CREATE vendor service
 */
export const createVendorService = async (req: Request, res: Response) => {
  try {
    const {
      
      title,
      description,
      category,
      price,
      priceType,
      durationMinutes,
      deliveryTime,
    } = req.body;

      const userId = req.user?.id
    
      
      if (!req.file) {
          return res.status(400).json({message:"image upload is needed"})
      }

    if (  !title || !category || !price) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }
      
      const image = await uploadToSupabase(req.file, "vendor-services")
      
      
      
   const [vendor] = await db
        .select()
        .from(vendors)
        .where(and(eq(vendors.userId, parseInt(userId as string)), isNull(vendors.deletedAt)));

    const [service] = await db
      .insert(vendorServices)
      .values({
        vendorId:vendor.id,
        title,
        description,
        category,
        price,
        priceType,
        durationMinutes,
        deliveryTime,
        image,
      })
      .returning();

    res.status(201).json({
      message: "Service created successfully",
      service,
    });
  } catch (error) {
    console.error("CREATE SERVICE ERROR:", error);
    res.status(500).json({ message: "Failed to create service" });
  }
};

/**
 * GET all services (admin / public)
 */
export const getAllVendorServices = async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        service: vendorServices,
        vendor: {
          id: vendors.id,
          businessName: vendors.businessName,
          logo: vendors.image,
          phone: vendors.contactPhone,
          userId:vendors.userId
          
        },
      })
      .from(vendorServices)
      .innerJoin(vendors, eq(vendorServices.vendorId, vendors.id));

    // flatten response
    const services = rows.map((row) => ({
      ...row.service,
      vendor: row.vendor,
    }));
console.log(services);

    res.json({ services });
  } catch (error) {
    console.error("GET SERVICES ERROR:", error);
    res.status(500).json({ message: "Failed to fetch services" });
  }
};

/**
 * GET services by vendor
 */
export const getVendorServicesByVendor = async (
  req: Request,
  res: Response
) => {
  try {
    const { vendorId } = req.params;
    const vendorIdStr = Array.isArray(vendorId) ? vendorId[0] : vendorId;

    const services = await db
      .select()
      .from(vendorServices)  
      .where(eq(vendorServices.vendorId, parseInt(vendorIdStr)));

    res.json({ services });  
  } catch (error) {
    console.error("GET VENDOR SERVICES ERROR:", error);
    res.status(500).json({ message: "Failed to fetch vendor services" });
  }
}; 

/**
 * GET single service
 */
export const getVendorServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;

    const [service] = await db
      .select()
      .from(vendorServices)
      .where(eq(vendorServices.id, parseInt(idStr)));

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({ service });
  } catch (error) {
    console.error("GET SERVICE ERROR:", error);
    res.status(500).json({ message: "Failed to fetch service" });
  }
};

/**
 * UPDATE vendor service
 */
export const updateVendorService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
console.log(req.body, req.file);

    let image = req.body.image;

      if (req.file) {
          const image = await uploadToSupabase(req.file, "vendor-services")  
      }

    const updateData = {
      ...req.body,
      ...(image && { image }),
    };

    const [service] = await db
      .update(vendorServices)
      .set(updateData)
      .where(eq(vendorServices.id, parseInt(idStr)))
      .returning();

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({
      message: "Service updated successfully",
      service,
    });
  } catch (error) {
    console.error("UPDATE SERVICE ERROR:", error);
    res.status(500).json({ message: "Failed to update service" });
  }
};

/**
 * TOGGLE service active status
 */
export const toggleVendorServiceStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const { isActive } = req.body;

    const [service] = await db
      .update(vendorServices)
      .set({ isActive })
      .where(eq(vendorServices.id, parseInt(idStr)))
      .returning();

    res.json({
      message: "Service status updated",
      service,
    });
  } catch (error) {
    console.error("TOGGLE SERVICE ERROR:", error);
    res.status(500).json({ message: "Failed to toggle service status" });
  }
};

/**
 * DELETE vendor service
 */
export const deleteVendorService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;

    await db.delete(vendorServices).where(eq(vendorServices.id, parseInt(idStr)));

    res.json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("DELETE SERVICE ERROR:", error);
    res.status(500).json({ message: "Failed to delete service" });
  }
};
