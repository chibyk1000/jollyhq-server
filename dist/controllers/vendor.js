"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorsController = void 0;
const db_1 = require("../db"); // adjust path
const vendors_1 = require("../db/schema/vendors");
const drizzle_orm_1 = require("drizzle-orm");
const upload_1 = require("../utils/upload");
const wallet_1 = require("../db/schema/wallet");
const vendorServices_1 = require("../db/schema/vendorServices");
class VendorsController {
    /**
     * CREATE vendor
     */
    static async create(req, res) {
        try {
            const userId = req.user?.id;
            const { businessName, contactName, contactEmail, contactPhone, category, description, priceRange, location, city, responseTime, } = req.body;
            let imageUrl = null;
            // Because you're using upload.single("image")
            if (req.file) {
                imageUrl = await (0, upload_1.uploadToSupabase)(req.file, "vendors");
            }
            const [vendor] = await db_1.db
                .insert(vendors_1.vendors)
                .values({
                userId: userId,
                businessName,
                contactName,
                contactEmail,
                contactPhone,
                category,
                description,
                image: imageUrl, // ✅ now defined
                priceRange,
                location,
                city,
                responseTime,
            })
                .returning();
            // Create wallet for the new event planner
            await db_1.db.insert(wallet_1.wallets).values({
                ownerId: vendor.id,
                ownerType: "vendor",
                balance: 0,
                currency: "NGN",
                isActive: true,
            });
            return res.status(201).json(vendor);
        }
        catch (error) {
            console.error("Create vendor error:", error);
            return res.status(500).json({ message: "Failed to create vendor" });
        }
    }
    /**
     * GET all vendors (active, not deleted)
     */
    static async getAll(_req, res) {
        try {
            const data = await db_1.db
                .select()
                .from(vendors_1.vendors)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendors_1.vendors.isActive, true), (0, drizzle_orm_1.isNull)(vendors_1.vendors.deletedAt)));
            return res.json(data);
        }
        catch (error) {
            console.error("Get vendors error:", error);
            return res.status(500).json({ message: "Failed to fetch vendors" });
        }
    }
    /**
     * GET vendor by ID
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;
            // Fetch vendor
            const [vendor] = await db_1.db
                .select()
                .from(vendors_1.vendors)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendors_1.vendors.id, id), (0, drizzle_orm_1.isNull)(vendors_1.vendors.deletedAt)));
            if (!vendor) {
                return res.status(404).json({ message: "Vendor not found" });
            }
            // Fetch vendor services
            const services = await db_1.db
                .select()
                .from(vendorServices_1.vendorServices)
                .where((0, drizzle_orm_1.eq)(vendorServices_1.vendorServices.vendorId, vendor.id));
            return res.json({
                ...vendor,
                services,
            });
        }
        catch (error) {
            console.error("Get vendor error:", error);
            return res.status(500).json({ message: "Failed to fetch vendor" });
        }
    }
    /**
     * GET vendor by userId
     */
    static async getByUser(req, res) {
        try {
            const { userId } = req.params;
            const [vendor] = await db_1.db
                .select()
                .from(vendors_1.vendors)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendors_1.vendors.userId, userId), (0, drizzle_orm_1.isNull)(vendors_1.vendors.deletedAt)));
            if (!vendor) {
                return res.status(404).json({ message: "Vendor not found" });
            }
            return res.json(vendor);
        }
        catch (error) {
            console.error("Get vendor by user error:", error);
            return res.status(500).json({ message: "Failed to fetch vendor" });
        }
    }
    /**
     * UPDATE vendor
     */
    static async update(req, res) {
        try {
            const { id } = req.params;
            const [vendor] = await db_1.db
                .update(vendors_1.vendors)
                .set({
                ...req.body,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendors_1.vendors.id, id), (0, drizzle_orm_1.isNull)(vendors_1.vendors.deletedAt)))
                .returning();
            if (!vendor) {
                return res.status(404).json({ message: "Vendor not found" });
            }
            return res.json(vendor);
        }
        catch (error) {
            console.error("Update vendor error:", error);
            return res.status(500).json({ message: "Failed to update vendor" });
        }
    }
    /**
     * SOFT DELETE vendor
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const [vendor] = await db_1.db
                .update(vendors_1.vendors)
                .set({
                deletedAt: new Date(),
                isActive: false,
            })
                .where((0, drizzle_orm_1.eq)(vendors_1.vendors.id, id))
                .returning();
            if (!vendor) {
                return res.status(404).json({ message: "Vendor not found" });
            }
            return res.json({ message: "Vendor deleted successfully" });
        }
        catch (error) {
            console.error("Delete vendor error:", error);
            return res.status(500).json({ message: "Failed to delete vendor" });
        }
    }
    static async getByProfile(req, res) {
        try {
            const { id } = req.params; // profileId OR userId (see note below)
            const data = await db_1.db
                .select({
                vendor: vendors_1.vendors,
                wallet: wallet_1.wallets,
            })
                .from(vendors_1.vendors)
                .leftJoin(wallet_1.wallets, (0, drizzle_orm_1.eq)(wallet_1.wallets.ownerId, vendors_1.vendors.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(vendors_1.vendors.userId, id), // 👈 vendor belongs to this user/profile
            (0, drizzle_orm_1.isNull)(vendors_1.vendors.deletedAt)));
            if (data.length === 0) {
                return res.status(404).json({ message: "Vendor not found" });
            }
            return res.status(200).json({
                vendor: {
                    ...data[0].vendor,
                    wallet: data[0].wallet ?? null,
                },
            });
        }
        catch (error) {
            console.error("Get vendor error:", error);
            return res.status(500).json({
                message: "Failed to get vendor",
                error: error.message,
            });
        }
    }
}
exports.VendorsController = VendorsController;
