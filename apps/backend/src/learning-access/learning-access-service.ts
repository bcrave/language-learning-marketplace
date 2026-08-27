import type { UserIdentity, UserRole } from "@marketplace/core";
import { z } from "zod";

import type { Database } from "../database/database.js";
import { classSessionProjection } from "../class-session/class-session-service.js";

export interface ClassroomProvider {
  enterClassroom(input: {
    classSessionId: string;
    lessonUnitId: string;
    teacherUserId: string;
  }): Promise<{
    classSessionId: string;
    lessonUnitId: string;
    teacherUserId: string;
    simulationStatus: "SIMULATED";
  }>;
}

export function createSimulatedClassroomProvider(): ClassroomProvider {
  return {
    async enterClassroom(input) {
      return { ...input, simulationStatus: "SIMULATED" };
    },
  };
}

export type AccessActor = { id: string; actingRole: UserRole };
const uuidSchema = z.uuid();
const TEACHER_RELATIONSHIP_AFTER_START_MILLISECONDS = 49 * 60 * 60_000;

async function accessActor(
  db: Database,
  identity: UserIdentity,
  actingRole: UserRole,
  operation: string,
  correlationId: string,
) {
  const user = await db.selectFrom("users")
    .select("id")
    .where("identity_issuer", "=", identity.issuer)
    .where("identity_subject", "=", identity.subject)
    .executeTakeFirst();
  if (!user) return { status: "UNKNOWN_USER" as const };

  const assignment = await db.selectFrom("role_assignments")
    .select("role")
    .where("user_id", "=", user.id)
    .where("role", "=", actingRole)
    .executeTakeFirst();
  if (!assignment) {
    await recordAccessAudit(db, { id: user.id, actingRole }, operation, "User", user.id, "DENIED", "ROLE_ASSIGNMENT_REQUIRED", correlationId);
    return { status: "ROLE_REQUIRED" as const };
  }
  return { status: "OK" as const, actor: { id: user.id, actingRole } };
}

/**
 * The Lesson Unit relationship scope itself, without the audited read around it.
 * Canonical fixture validation asks the same question the reader asks, and must not
 * leave denied-read Audit Entries attributed to a person who never read anything.
 */
export async function accessibleLessonUnits(
  db: Database,
  actor: AccessActor,
  now: Date,
) {
  const query = db.selectFrom("lesson_units")
    .select(["lesson_units.id", "lesson_units.title"])
    .orderBy("lesson_units.title")
    .orderBy("lesson_units.id");
  if (actor.actingRole === "TEACHER") {
    return query.where((expression) => expression.exists(
      expression.selectFrom("class_sessions")
        .select("class_sessions.id")
        .whereRef("class_sessions.lesson_unit_id", "=", "lesson_units.id")
        .where("class_sessions.teacher_user_id", "=", actor.id)
        .where("class_sessions.state", "=", "PUBLISHED")
        .where("class_sessions.starts_at", ">=", new Date(now.getTime() - TEACHER_RELATIONSHIP_AFTER_START_MILLISECONDS)),
    )).execute();
  }
  if (actor.actingRole === "STUDENT") {
    return query.where((expression) => expression.or([
      expression.exists(
        expression.selectFrom("bookings")
          .innerJoin("class_sessions", "class_sessions.id", "bookings.class_session_id")
          .select("bookings.id")
          .whereRef("class_sessions.lesson_unit_id", "=", "lesson_units.id")
          .where("class_sessions.state", "=", "PUBLISHED")
          .where("bookings.student_user_id", "=", actor.id)
          .where("bookings.state", "=", "ACTIVE"),
      ),
      expression.exists(
        expression.selectFrom("lesson_unit_completions")
          .select("lesson_unit_completions.id")
          .whereRef("lesson_unit_completions.lesson_unit_id", "=", "lesson_units.id")
          .where("lesson_unit_completions.student_user_id", "=", actor.id),
      ),
    ])).execute();
  }
  return [];
}

function lessonMaterialProjection(material: {
  id: string;
  kind: "STRUCTURED_TEXT" | "HTTPS_REFERENCE";
  title: string;
  structured_content: Array<Record<string, unknown>> | null;
  https_url: string | null;
  publisher: string | null;
}) {
  return {
    id: material.id,
    kind: material.kind,
    title: material.title,
    structuredContent: material.structured_content === null ? null : JSON.stringify(material.structured_content),
    httpsUrl: material.https_url,
    publisher: material.publisher,
  };
}

export async function lessonMaterialsForViewer(
  db: Database,
  identity: UserIdentity,
  actingRole: UserRole,
  lessonUnitId: string,
  correlationId: string,
  now: Date,
) {
  const resolved = await accessActor(db, identity, actingRole, "lesson-materials.read", correlationId);
  if (resolved.status !== "OK") return resolved;
  const { actor } = resolved;
  if (!uuidSchema.safeParse(lessonUnitId).success) {
    await recordAccessAudit(db, actor, "lesson-materials.read", "User", actor.id, "DENIED", "LESSON_MATERIALS_NOT_FOUND", correlationId);
    return { status: "NOT_FOUND" as const };
  }
  const authorized = (await accessibleLessonUnits(db, actor, now)).some(({ id }) => id === lessonUnitId);
  if (!authorized) {
    await recordAccessAudit(db, actor, "lesson-materials.read", "LessonUnit", lessonUnitId, "DENIED", "LESSON_MATERIALS_NOT_FOUND", correlationId);
    return { status: "NOT_FOUND" as const };
  }

  const materials = await db.selectFrom("lesson_materials")
    .select(["id", "kind", "title", "structured_content", "https_url", "publisher"])
    .where("lesson_unit_id", "=", lessonUnitId)
    .orderBy("created_at")
    .orderBy("id")
    .execute();
  return { status: "OK" as const, materials: materials.map(lessonMaterialProjection) };
}

export async function learningAccessClassSessionsForViewer(
  db: Database,
  identity: UserIdentity,
  actingRole: UserRole,
  correlationId: string,
  now: Date,
) {
  const resolved = await accessActor(db, identity, actingRole, "learning-access-class-sessions.read", correlationId);
  if (resolved.status !== "OK") return resolved;
  const { actor } = resolved;
  const query = db.selectFrom("class_sessions")
    .selectAll("class_sessions")
    .where("class_sessions.state", "=", "PUBLISHED")
    .orderBy("class_sessions.starts_at")
    .orderBy("class_sessions.id");
  const sessions = actingRole === "TEACHER"
    ? await query.where("class_sessions.teacher_user_id", "=", actor.id)
      .where("class_sessions.starts_at", ">=", new Date(now.getTime() - TEACHER_RELATIONSHIP_AFTER_START_MILLISECONDS)).execute()
    : actingRole === "STUDENT"
      ? await query.where((expression) => expression.exists(
        expression.selectFrom("bookings")
          .select("bookings.id")
          .whereRef("bookings.class_session_id", "=", "class_sessions.id")
          .where("bookings.student_user_id", "=", actor.id)
          .where("bookings.state", "=", "ACTIVE"),
      )).execute()
      : [];
  return { status: "OK" as const, sessions: sessions.map(classSessionProjection) };
}

export async function learningAccessLessonUnitsForViewer(
  db: Database,
  identity: UserIdentity,
  actingRole: UserRole,
  correlationId: string,
  now: Date,
) {
  const resolved = await accessActor(db, identity, actingRole, "learning-access-lesson-units.read", correlationId);
  if (resolved.status !== "OK") return resolved;
  const { actor } = resolved;
  return { status: "OK" as const, lessonUnits: await accessibleLessonUnits(db, actor, now) };
}

const classroomError = (code: "CLASS_SESSION_NOT_FOUND" | "CLASSROOM_NOT_OPEN" | "CLASSROOM_CLOSED", message: string) => ({
  __typename: "ClassroomAccessError" as const,
  code,
  message,
});

export async function enterClassroom(
  db: Database,
  provider: ClassroomProvider,
  identity: UserIdentity,
  actingRole: UserRole,
  classSessionId: string,
  correlationId: string,
  now: Date,
) {
  const resolved = await accessActor(db, identity, actingRole, "classroom.entered", correlationId);
  if (resolved.status !== "OK") return resolved;
  const { actor } = resolved;
  if (!uuidSchema.safeParse(classSessionId).success) {
    await recordAccessAudit(db, actor, "classroom.entered", "User", actor.id, "DENIED", "CLASS_SESSION_NOT_FOUND", correlationId);
    return { status: "OK" as const, result: classroomError("CLASS_SESSION_NOT_FOUND", "Choose an available Class Session.") };
  }
  try {
    return await inTransaction(db, async (transaction) => {
      const session = await transaction.selectFrom("class_sessions")
        .select(["id", "lesson_unit_id", "teacher_user_id", "starts_at", "state"])
        .where("id", "=", classSessionId)
        .forShare()
        .executeTakeFirst();
      const studentBooking = actingRole === "STUDENT" && session
        ? await transaction.selectFrom("bookings")
          .select("id")
          .where("class_session_id", "=", classSessionId)
          .where("student_user_id", "=", actor.id)
          .where("state", "=", "ACTIVE")
          .forShare()
          .executeTakeFirst()
        : undefined;
      const hasRelationship = session?.state === "PUBLISHED" && (
        (actingRole === "TEACHER" && session.teacher_user_id === actor.id)
        || (actingRole === "STUDENT" && Boolean(studentBooking))
      );
      if (!session || !hasRelationship) {
        await recordAccessAudit(transaction, actor, "classroom.entered", "ClassSession", classSessionId, "DENIED", "CLASS_SESSION_NOT_FOUND", correlationId);
        return { status: "OK" as const, result: classroomError("CLASS_SESSION_NOT_FOUND", "Choose an available Class Session.") };
      }
      const opensAt = new Date(session.starts_at.getTime() - (actingRole === "TEACHER" ? 15 : 10) * 60_000);
      const endsAt = new Date(session.starts_at.getTime() + 60 * 60_000);
      if (now < opensAt) {
        await recordAccessAudit(transaction, actor, "classroom.entered", "ClassSession", session.id, "DENIED", "CLASSROOM_NOT_OPEN", correlationId);
        return { status: "OK" as const, result: classroomError("CLASSROOM_NOT_OPEN", `Classroom Access opens ${actingRole === "TEACHER" ? "15" : "10"} minutes before the Class Session.`) };
      }
      if (now > endsAt) {
        await recordAccessAudit(transaction, actor, "classroom.entered", "ClassSession", session.id, "DENIED", "CLASSROOM_CLOSED", correlationId);
        return { status: "OK" as const, result: classroomError("CLASSROOM_CLOSED", "Classroom Access ended with the Class Session.") };
      }
      const classroom = await provider.enterClassroom({ classSessionId: session.id, lessonUnitId: session.lesson_unit_id, teacherUserId: session.teacher_user_id });
      await recordAccessAudit(transaction, actor, "classroom.entered", "ClassSession", session.id, "SUCCEEDED", "CLASSROOM_ENTERED", correlationId);
      return { status: "OK" as const, result: { __typename: "EnterClassroomSuccess" as const, classroom } };
    });
  } catch (error) {
    await recordAccessAudit(db, actor, "classroom.entered", "ClassSession", classSessionId, "FAILED", "CLASSROOM_PROVIDER_FAILED", correlationId);
    throw error;
  }
}

async function inTransaction<T>(db: Database, perform: (transaction: Database) => Promise<T>): Promise<T> {
  if (db.isTransaction) return perform(db);
  return db.transaction().execute((transaction) => perform(transaction as Database));
}

async function recordAccessAudit(
  db: Database,
  actor: AccessActor,
  operation: string,
  targetType: string,
  targetId: string,
  outcome: "SUCCEEDED" | "DENIED" | "FAILED",
  reasonCode: string,
  correlationId: string,
) {
  await db.insertInto("audit_entries").values({
    actor_user_id: actor.id,
    acting_role: actor.actingRole,
    operation,
    target_type: targetType,
    target_id: targetId,
    outcome,
    reason_code: reasonCode,
    correlation_id: correlationId,
  }).execute();
}
