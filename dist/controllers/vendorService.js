"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVendorService = exports.toggleVendorServiceStatus = exports.updateVendorService = exports.getVendorServiceById = exports.getVendorServicesByVendor = exports.getAllVendorServices = exports.createVendorService = void 0;
const db_1 = require("../db"); // adjust path
const vendorServices_1 = require("../db/schema/vendorServices");
const drizzle_orm_1 = require("drizzle-orm");
const vendors_1 = require("../db/schema/vendors");
const upload_1 = require("../utils/upload");
/**
 * CREATE vendor service
 */
const createVendorService = async (req, res) => {
    try {
        const { title, description, category, price, priceType, durationMinutes, deliveryTime, } = req.body;
        const userId = req.user?.id;
        if (!req.file) {
            return res.status(400).json({ message: "image upload is needed" });
        }
        if (!title || !category || !price) {
            return res.status(400).json({
                message: "Missing required fields",
            });
        }
        const image = await (0, upload_1.uploadToSupabase)(req.file, "vendor-services");
        const [vendor] = await db_1.db
            .select()
            .from(vendors_1.vendors)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendors_1.vendors.userId, userId), (0, drizzle_orm_1.isNull)(vendors_1.vendors.deletedAt)));
        const [service] = await db_1.db
            .insert(vendorServices_1.vendorServices)
            .values({
            vendorId: vendor.id,
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
    }
    catch (error) {
        console.error("CREATE SERVICE ERROR:", error);
        res.status(500).json({ message: "Failed to create service" });
    }
};
exports.createVendorService = createVendorService;
/**
 * GET all services (admin / public)
 */
const getAllVendorServices = async (_req, res) => {
    try {
        const services = await db_1.db.select().from(vendorServices_1.vendorServices);
        res.json({ services });
    }
    catch (error) {
        console.error("GET SERVICES ERROR:", error);
        res.status(500).json({ message: "Failed to fetch services" });
    }
};
exports.getAllVendorServices = getAllVendorServices;
/**
 * GET services by vendor
 */
const getVendorServicesByVendor = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const services = await db_1.db
            .select()
            .from(vendorServices_1.vendorServices)
            .where((0, drizzle_orm_1.eq)(vendorServices_1.vendorServices.vendorId, vendorId));
        res.json({ services });
    }
    catch (error) {
        console.error("GET VENDOR SERVICES ERROR:", error);
        res.status(500).json({ message: "Failed to fetch vendor services" });
    }
};
exports.getVendorServicesByVendor = getVendorServicesByVendor;
/**
 * GET single service
 */
const getVendorServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const [service] = await db_1.db
            .select()
            .from(vendorServices_1.vendorServices)
            .where((0, drizzle_orm_1.eq)(vendorServices_1.vendorServices.id, id));
        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }
        res.json({ service });
    }
    catch (error) {
        console.error("GET SERVICE ERROR:", error);
        res.status(500).json({ message: "Failed to fetch service" });
    }
};
exports.getVendorServiceById = getVendorServiceById;
/**
 * UPDATE vendor service
 */
const updateVendorService = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(req.body, req.file);
        let image = req.body.image;
        if (req.file) {
            const image = await (0, upload_1.uploadToSupabase)(req.file, "vendor-services");
        }
        const updateData = {
            ...req.body,
            ...(image && { image }),
        };
        const [service] = await db_1.db
            .update(vendorServices_1.vendorServices)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(vendorServices_1.vendorServices.id, id))
            .returning();
        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }
        res.json({
            message: "Service updated successfully",
            service,
        });
    }
    catch (error) {
        console.error("UPDATE SERVICE ERROR:", error);
        res.status(500).json({ message: "Failed to update service" });
    }
};
exports.updateVendorService = updateVendorService;
/**
 * TOGGLE service active status
 */
const toggleVendorServiceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const [service] = await db_1.db
            .update(vendorServices_1.vendorServices)
            .set({ isActive })
            .where((0, drizzle_orm_1.eq)(vendorServices_1.vendorServices.id, id))
            .returning();
        res.json({
            message: "Service status updated",
            service,
        });
    }
    catch (error) {
        console.error("TOGGLE SERVICE ERROR:", error);
        res.status(500).json({ message: "Failed to toggle service status" });
    }
};
exports.toggleVendorServiceStatus = toggleVendorServiceStatus;
/**
 * DELETE vendor service
 */
const deleteVendorService = async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.db.delete(vendorServices_1.vendorServices).where((0, drizzle_orm_1.eq)(vendorServices_1.vendorServices.id, id));
        res.json({ message: "Service deleted successfully" });
    }
    catch (error) {
        console.error("DELETE SERVICE ERROR:", error);
        res.status(500).json({ message: "Failed to delete service" });
    }
};
exports.deleteVendorService = deleteVendorService;
