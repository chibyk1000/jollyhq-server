"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageReads = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const messages_1 = require("./messages");
const profiles_1 = require("./profiles");
exports.messageReads = (0, pg_core_1.pgTable)("message_reads", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    messageId: (0, pg_core_1.uuid)("message_id")
        .notNull()
        .references(() => messages_1.messages.id, { onDelete: "cascade" }),
    profileId: (0, pg_core_1.uuid)("profile_id")
        .notNull()
        .references(() => profiles_1.profiles.id, { onDelete: "cascade" }),
    readAt: (0, pg_core_1.timestamp)("read_at").defaultNow(),
});
