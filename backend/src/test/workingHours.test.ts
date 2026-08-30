// import { calculateWorkingHours } from "../utils/workingTime";


// const start = "2026-07-20T09:00:00Z";
// const end = "2026-07-20T17:00:00Z";

// console.log("start:", start);
// console.log("end:", end);

// const startDate = new Date(start);
// const endDate = new Date(end);

// console.log("Parsed start:", startDate.toString());
// console.log("Parsed end:", endDate.toString());

// console.log("UTC start hour:", startDate.getUTCHours());
// console.log("UTC end hour:", endDate.getUTCHours());

// console.log("Local start hour:", startDate.getHours());
// console.log("Local end hour:", endDate.getHours());

// console.log("Expected: 8");
// console.log("Actual:", calculateWorkingHours(start, end));








import { calculateWorkingHours } from "../utils/workingTime";

function runTest(
  description: string,
  start: string,
  end: string,
  expected: number
) {
  const result = calculateWorkingHours(start, end);

  const passed = result === expected;

  console.log(
    `${passed ? "✓" : "✗"} ${description} | expected: ${expected}, got: ${result}`
  );

  if (!passed) {
    throw new Error(
      `${description}: expected ${expected}, got ${result}`
    );
  }
}

console.log("\n=== Working Hours Tests ===\n");

// Monday: completely inside working hours
runTest(
  "One full working day",
  "2026-07-20T09:00:00Z",
  "2026-07-20T17:00:00Z",
  8
);

// Monday: partial working day
runTest(
  "Partial working day",
  "2026-07-20T10:30:00Z",
  "2026-07-20T14:30:00Z",
  4
);

// Before working hours
runTest(
  "Time before work starts",
  "2026-07-20T06:00:00Z",
  "2026-07-20T11:00:00Z",
  2
);

// After working hours
runTest(
  "Time after work ends",
  "2026-07-20T15:00:00Z",
  "2026-07-20T20:00:00Z",
  2
);

// Overnight
runTest(
  "Overnight period",
  "2026-07-20T16:00:00Z",
  "2026-07-21T10:00:00Z",
  2
);

// Friday → Monday
runTest(
  "Weekend excluded",
  "2026-07-24T16:00:00Z",
  "2026-07-27T10:00:00Z",
  2
);

// Entire weekend
runTest(
  "Weekend only",
  "2026-07-25T09:00:00Z",
  "2026-07-26T17:00:00Z",
  0
);

// Multiple working days
runTest(
  "Three working days",
  "2026-07-20T09:00:00Z",
  "2026-07-22T17:00:00Z",
  24
);

// Exact boundary
runTest(
  "Exactly outside working hours",
  "2026-07-20T17:00:00Z",
  "2026-07-21T09:00:00Z",
  0
);

console.log("\nAll working-hours tests passed.\n");