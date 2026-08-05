import { useLazyQuery, useMutation, useQuery } from "@apollo/client/react";
import { useState } from "react";
import { useIntl } from "react-intl";

import {
  AdjustClassCreditsDocument,
  AdministrationClassCreditsDocument,
  ScheduleSubscriptionCancellationDocument,
  type AdministrationClassCreditsQuery,
  type StudentSubscriptionQuery,
  type StudentClassCreditsQuery,
  StudentSubscriptionDocument,
  StudentClassCreditsDocument,
  UndoSubscriptionCancellationDocument,
} from "./generated/graphql.js";

type ClassCreditAccount = NonNullable<AdministrationClassCreditsQuery["administrationClassCredits"]>;

const sourceMessageIds = {
  BOOKING_DEDUCTION: "classCredits.source.bookingDeduction",
  BOOKING_REFUND: "classCredits.source.bookingRefund",
  CREDIT_ADJUSTMENT: "classCredits.source.creditAdjustment",
  ORGANIZATION_CREDIT_GRANT: "classCredits.source.organizationGrant",
  SUBSCRIPTION_GRANT: "classCredits.source.subscriptionGrant",
} as const;

function AccountView({ account }: { account: ClassCreditAccount | StudentClassCreditsQuery["studentClassCredits"] }) {
  const intl = useIntl();
  return (
    <div className="credit-account">
      <p className="credit-balance">
        {intl.formatMessage({ id: "classCredits.balance" }, { balance: account.availableBalance })}
      </p>
      <h3>{intl.formatMessage({ id: "classCredits.ledger" })}</h3>
      {account.ledger.length === 0 ? (
        <p>{intl.formatMessage({ id: "classCredits.empty" })}</p>
      ) : (
        <ol className="credit-ledger">
          {account.ledger.map((entry) => (
            <li key={entry.id}>
              <strong>{intl.formatNumber(entry.amount, { signDisplay: "always" })}</strong>{" "}
              <span>{intl.formatMessage({ id: sourceMessageIds[entry.source] })}</span>
              {entry.reason && <span> — {entry.reason}</span>}
              <span> — {intl.formatMessage({ id: "classCredits.reference" }, { reference: entry.sourceReference })}</span>
              <time dateTime={entry.createdAt}>
                {" — "}{intl.formatDate(entry.createdAt, { dateStyle: "medium", timeStyle: "short" })}
              </time>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function StudentClassCredits() {
  const intl = useIntl();
  const { data, error, loading } = useQuery(StudentClassCreditsDocument);
  if (loading) return <p role="status">{intl.formatMessage({ id: "classCredits.loading" })}</p>;
  if (error || !data) return <p role="alert">{intl.formatMessage({ id: "classCredits.loadError" })}</p>;
  return (
    <section className="workspace-card" aria-labelledby="student-class-credits-title">
      <h2 id="student-class-credits-title">{intl.formatMessage({ id: "classCredits.studentTitle" })}</h2>
      <AccountView account={data.studentClassCredits} />
    </section>
  );
}

const subscriptionStateMessageIds = {
  ACTIVE: "subscription.state.active",
  CANCELLATION_SCHEDULED: "subscription.state.cancellationScheduled",
  CANCELLED: "subscription.state.cancelled",
} as const;

export function StudentSubscription({
  idempotencyKeyFactory = () => crypto.randomUUID(),
}: {
  idempotencyKeyFactory?: () => string;
}) {
  const intl = useIntl();
  const { data, error, loading } = useQuery(StudentSubscriptionDocument);
  const [schedule, { loading: scheduling }] = useMutation(ScheduleSubscriptionCancellationDocument);
  const [undo, { loading: undoing }] = useMutation(UndoSubscriptionCancellationDocument);
  const [subscription, setSubscription] = useState<StudentSubscriptionQuery["studentSubscription"]>();
  const [announcement, setAnnouncement] = useState<"scheduled" | "undone" | null>(null);
  const [failure, setFailure] = useState(false);
  const [pendingAttempt, setPendingAttempt] = useState<{ action: "schedule" | "undo"; key: string } | null>(null);
  const current = subscription === undefined ? data?.studentSubscription : subscription;

  async function changeSubscription(action: "schedule" | "undo") {
    setAnnouncement(null);
    setFailure(false);
    const key = pendingAttempt?.action === action ? pendingAttempt.key : idempotencyKeyFactory();
    setPendingAttempt({ action, key });
    try {
      const outcome = action === "schedule"
        ? (await schedule({ variables: { input: { idempotencyKey: key } } })).data?.scheduleSubscriptionCancellation
        : (await undo({ variables: { input: { idempotencyKey: key } } })).data?.undoSubscriptionCancellation;
      if (outcome && "subscription" in outcome) {
        setSubscription(outcome.subscription);
        setAnnouncement(action === "schedule" ? "scheduled" : "undone");
        setPendingAttempt(null);
      } else {
        setPendingAttempt(null);
        setFailure(true);
      }
    } catch {
      setFailure(true);
    }
  }

  if (loading) return <p role="status">{intl.formatMessage({ id: "subscription.loading" })}</p>;
  if (error || !data) return <p role="alert">{intl.formatMessage({ id: "subscription.loadError" })}</p>;
  return (
    <section className="workspace-card" aria-labelledby="student-subscription-title">
      <h2 id="student-subscription-title">{intl.formatMessage({ id: "subscription.title" })}</h2>
      {!current ? <p>{intl.formatMessage({ id: "subscription.none" })}</p> : <>
        <p><strong>{intl.formatMessage({ id: subscriptionStateMessageIds[current.state] })}</strong></p>
        {current.nextAnniversaryAt && <p>{intl.formatMessage({ id: "subscription.nextAnniversary" }, {
          date: intl.formatDate(current.nextAnniversaryAt, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }),
        })}</p>}
        {current.cancellationEffectiveAt && <p>{intl.formatMessage({ id: "subscription.cancellationEffective" }, {
          date: intl.formatDate(current.cancellationEffectiveAt, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }),
        })}</p>}
        {current.state === "ACTIVE" && <button disabled={scheduling} type="button" onClick={() => void changeSubscription("schedule")}>{intl.formatMessage({ id: "subscription.scheduleCancellation" })}</button>}
        {current.state === "CANCELLATION_SCHEDULED" && <button disabled={undoing} type="button" onClick={() => void changeSubscription("undo")}>{intl.formatMessage({ id: "subscription.keep" })}</button>}
      </>}
      {announcement && <p role="status">{intl.formatMessage({ id: announcement === "scheduled" ? "subscription.scheduled" : "subscription.undone" })}</p>}
      {failure && <p role="alert">{intl.formatMessage({ id: "subscription.changeError" })}</p>}
    </section>
  );
}

export function AdminClassCredits({
  idempotencyKeyFactory = () => crypto.randomUUID(),
}: {
  idempotencyKeyFactory?: () => string;
}) {
  const intl = useIntl();
  const [inspect, { error: inspectError, loading: inspecting }] = useLazyQuery(AdministrationClassCreditsDocument);
  const [adjust, { loading: adjusting }] = useMutation(AdjustClassCreditsDocument);
  const [account, setAccount] = useState<ClassCreditAccount | null>(null);
  const [studentUserId, setStudentUserId] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [pendingAttempt, setPendingAttempt] = useState<{ fingerprint: string; key: string } | null>(null);

  async function inspectAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure(null);
    setSucceeded(false);
    const result = await inspect({ variables: { studentUserId } });
    setAccount(result.data?.administrationClassCredits ?? null);
    if (!result.data?.administrationClassCredits) setFailure("STUDENT_NOT_FOUND");
  }

  async function submitAdjustment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure(null);
    setSucceeded(false);
    const values = new FormData(event.currentTarget);
    const amount = Number(values.get("amount"));
    const reason = String(values.get("reason"));
    const fingerprint = JSON.stringify({ studentUserId: account?.studentUserId, amount, reason });
    const idempotencyKey = pendingAttempt?.fingerprint === fingerprint
      ? pendingAttempt.key
      : idempotencyKeyFactory();
    setPendingAttempt({ fingerprint, key: idempotencyKey });
    try {
      const result = await adjust({ variables: { input: {
        idempotencyKey,
        studentUserId: account?.studentUserId ?? studentUserId,
        amount,
        reason,
      } } });
      const outcome = result.data?.adjustClassCredits;
      if (outcome && "account" in outcome) {
        setAccount(outcome.account);
        setSucceeded(true);
        setPendingAttempt(null);
        return;
      }
      setPendingAttempt(null);
      setFailure(outcome && "code" in outcome ? outcome.code : outcome && "conflictCode" in outcome ? outcome.conflictCode : "UNEXPECTED");
    } catch {
      setFailure("UNEXPECTED");
    }
  }

  return (
    <section className="workspace-card admin-forms" aria-labelledby="admin-class-credits-title">
      <h2 id="admin-class-credits-title">{intl.formatMessage({ id: "classCredits.adminTitle" })}</h2>
      <form onSubmit={(event) => void inspectAccount(event)}>
        <label htmlFor="credit-student-user-id">{intl.formatMessage({ id: "classCredits.studentUserId" })}</label>
        <input id="credit-student-user-id" required value={studentUserId} onChange={(event) => {
          setStudentUserId(event.target.value);
          setAccount(null);
          setFailure(null);
          setSucceeded(false);
          setPendingAttempt(null);
        }} />
        <button disabled={inspecting} type="submit">{intl.formatMessage({ id: "classCredits.inspect" })}</button>
      </form>
      {account && <>
        <AccountView account={account} />
        <form onSubmit={(event) => void submitAdjustment(event)}>
          <label htmlFor="credit-adjustment-amount">{intl.formatMessage({ id: "classCredits.amount" })}</label>
          <input id="credit-adjustment-amount" name="amount" required step="1" type="number" />
          <p className="field-help">{intl.formatMessage({ id: "classCredits.amountHelp" })}</p>
          <label htmlFor="credit-adjustment-reason">{intl.formatMessage({ id: "classCredits.reason" })}</label>
          <input id="credit-adjustment-reason" maxLength={200} minLength={3} name="reason" required />
          <button disabled={adjusting} type="submit">{intl.formatMessage({ id: "classCredits.adjust" })}</button>
        </form>
      </>}
      {succeeded && <p role="status">{intl.formatMessage({ id: "classCredits.adjusted" })}</p>}
      {(inspectError || failure) && <p role="alert">{intl.formatMessage({ id: failure === "STUDENT_NOT_FOUND" ? "classCredits.notFound" : "classCredits.error" })}</p>}
    </section>
  );
}
