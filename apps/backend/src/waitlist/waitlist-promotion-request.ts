import { sql } from "kysely";

import type { Database } from "../database/database.js";

export async function requestWaitlistPromotion(db: Database, classSessionId: string) {
  await db.insertInto("waitlist_promotion_requests").values({
    class_session_id: classSessionId,
    processed_at: null,
  }).onConflict((conflict) => conflict.column("class_session_id").doUpdateSet({
    requested_at: sql<Date>`now()`,
    request_version: sql<number>`waitlist_promotion_requests.request_version + 1`,
    processed_at: null,
  })).execute();
}
