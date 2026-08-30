/**
 * Standard operational calendar used by workflow analytics.
 *
 * Assumption:
 * - Monday to Friday
 * - 09:00 to 17:00 UTC
 * - 8 working hours per day
 *
 * All timestamps must include an explicit timezone offset.
 * Database timestamps are stored in UTC.
 */
const WORKDAY_START_HOUR = 9;
const WORKDAY_END_HOUR = 17;

function isWorkingDay(date: Date): boolean {
  const day = date.getUTCDay();

  return day !== 0 && day !== 6;
}

export function calculateWorkingHours(
  start: string,
  end: string | null
): number {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return 0;
  }

  if (endDate <= startDate) {
    return 0;
  }

  let currentDate = new Date(startDate);
  let workingMilliseconds = 0;

  while (currentDate < endDate) {
    if (isWorkingDay(currentDate)) {
      const year = currentDate.getUTCFullYear();
      const month = currentDate.getUTCMonth();
      const day = currentDate.getUTCDate();

      const workdayStart = new Date(
        Date.UTC(year, month, day, WORKDAY_START_HOUR)
      );

      const workdayEnd = new Date(
        Date.UTC(year, month, day, WORKDAY_END_HOUR)
      );

      const overlapStart =
        currentDate > workdayStart ? currentDate : workdayStart;

      const overlapEnd =
        endDate < workdayEnd ? endDate : workdayEnd;

      if (overlapEnd > overlapStart) {
        workingMilliseconds +=
          overlapEnd.getTime() - overlapStart.getTime();
      }
    }

    currentDate = new Date(
      Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate() + 1
      )
    );
  }

  return workingMilliseconds / (1000 * 60 * 60);
}