"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const usersRoutes_1 = __importDefault(require("./usersRoutes"));
const eventPlanner_1 = __importDefault(require("./eventPlanner"));
const event_1 = __importDefault(require("./event"));
const tickets_1 = __importDefault(require("./tickets"));
const router = (0, express_1.Router)();
router.use("/users", usersRoutes_1.default);
router.use("/tickets", tickets_1.default);
router.use("/events", event_1.default);
router.use("/event-planners", eventPlanner_1.default);
exports.default = router;
