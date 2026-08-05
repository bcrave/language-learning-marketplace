export function monthlySubscriptionAnniversary(
  activatedAt: Date,
  monthOffset: number,
) {
  if (!Number.isInteger(monthOffset) || monthOffset < 1) {
    throw new RangeError("Subscription anniversary offset must be a positive whole number");
  }
  const targetMonthStart = new Date(Date.UTC(
    activatedAt.getUTCFullYear(),
    activatedAt.getUTCMonth() + monthOffset,
    1,
    activatedAt.getUTCHours(),
    activatedAt.getUTCMinutes(),
    activatedAt.getUTCSeconds(),
    activatedAt.getUTCMilliseconds(),
  ));
  const daysInTargetMonth = new Date(Date.UTC(
    targetMonthStart.getUTCFullYear(),
    targetMonthStart.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  targetMonthStart.setUTCDate(Math.min(activatedAt.getUTCDate(), daysInTargetMonth));
  return targetMonthStart;
}
