import assert from "node:assert/strict";
import { test } from "node:test";
import { createScheduler, parseSchedulerConfig, type ScheduledJob } from "./scheduler.ts";

test("parseSchedulerConfig keeps scheduling disabled by default", () => {
  assert.deepEqual(parseSchedulerConfig({}), {
    enabled: false,
    intervalMs: 15 * 60 * 1000
  });
});

test("parseSchedulerConfig reads enabled flag and interval from environment", () => {
  assert.deepEqual(
    parseSchedulerConfig({
      WORKER_SCHEDULER_ENABLED: "true",
      WORKER_SCHEDULER_INTERVAL_MS: "60000"
    }),
    {
      enabled: true,
      intervalMs: 60000
    }
  );
});

test("parseSchedulerConfig clamps unsafe short intervals", () => {
  assert.deepEqual(
    parseSchedulerConfig({
      WORKER_SCHEDULER_ENABLED: "1",
      WORKER_SCHEDULER_INTERVAL_MS: "100"
    }),
    {
      enabled: true,
      intervalMs: 30_000
    }
  );
});

test("scheduler runOnce executes scheduled jobs in order", async () => {
  const calls: string[] = [];
  const jobs: ScheduledJob[] = [
    {
      name: "discover-listings",
      run: async () => {
        calls.push("discover-listings");
      }
    },
    {
      name: "extract-pending-listings",
      run: async () => {
        calls.push("extract-pending-listings");
      }
    }
  ];

  const scheduler = createScheduler({ enabled: false, intervalMs: 30_000 }, jobs);

  await scheduler.runOnce();

  assert.deepEqual(calls, ["discover-listings", "extract-pending-listings"]);
});

test("scheduler does not start an interval when disabled", () => {
  let intervalStarted = false;
  const scheduler = createScheduler(
    { enabled: false, intervalMs: 30_000 },
    [],
    {
      setInterval: () => {
        intervalStarted = true;
        return 1;
      },
      clearInterval: () => undefined
    }
  );

  scheduler.start();

  assert.equal(intervalStarted, false);
  assert.equal(scheduler.isRunning(), false);
});

test("scheduler starts and stops an enabled interval", () => {
  const handles: number[] = [];
  const clearedHandles: number[] = [];
  const scheduler = createScheduler(
    { enabled: true, intervalMs: 30_000 },
    [],
    {
      setInterval: () => {
        handles.push(1);
        return 1;
      },
      clearInterval: (handle) => {
        clearedHandles.push(handle as number);
      }
    }
  );

  scheduler.start();
  scheduler.stop();

  assert.deepEqual(handles, [1]);
  assert.deepEqual(clearedHandles, [1]);
  assert.equal(scheduler.isRunning(), false);
});
