"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageReads = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const messages_1 = require("./messages");
const profiles_1 = require("./profiles");
exports.messageReads = (0, pg_core_1.pgTable)("message_reads", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    messageId: (0, pg_core_1.integer)("message_id")
        .notNull()
        .references(() => messages_1.messages.id, { onDelete: "cascade" }),
    profileId: (0, pg_core_1.integer)("profile_id")
        .notNull()
        .references(() => profiles_1.user.id, { onDelete: "cascade" }),
    readAt: (0, pg_core_1.timestamp)("read_at").defaultNow(),
}, (table) => ({
    messageIdx: (0, pg_core_1.index)("message_reads_message_id_idx").on(table.messageId),
    profileIdx: (0, pg_core_1.index)("message_reads_profile_id_idx").on(table.profileId),
}));
