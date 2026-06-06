export type SchedulerConfig = {
  enabled: boolean;
  intervalMs: number;
};

export type ScheduledJob = {
  name: string;
  run: () => Promise<void>;
};

type TimerHandle = ReturnType<typeof setInterval>;

type TimerApi = {
  setInterval: (callback: () => void, intervalMs: number) => TimerHandle;
  clearInterval: (handle: TimerHandle) => void;
};

const defaultIntervalMs = 15 * 60 * 1000;
const minimumSafeIntervalMs = 30_000;

export function parseSchedulerConfig(env: NodeJS.ProcessEnv): SchedulerConfig {
  const enabled = env.WORKER_SCHEDULER_ENABLED === "true" || env.WORKER_SCHEDULER_ENABLED === "1";
  const parsedIntervalMs = Number(env.WORKER_SCHEDULER_INTERVAL_MS ?? defaultIntervalMs);
  const intervalMs = Number.isFinite(parsedIntervalMs)
    ? Math.max(parsedIntervalMs, minimumSafeIntervalMs)
    : defaultIntervalMs;

  return {
    enabled,
    intervalMs
  };
}

export function createScheduler(
  config: SchedulerConfig,
  jobs: ScheduledJob[],
  timerApi: TimerApi = {
    setInterval,
    clearInterval
  }
) {
  let handle: TimerHandle | null = null;
  let running = false;

  async function runOnce(): Promise<void> {
    if (running) {
      return;
    }

    running = true;

    try {
      for (const job of jobs) {
        await job.run();
      }
    } finally {
      running = false;
    }
  }

  return {
    async runOnce() {
      await runOnce();
    },

    start() {
      if (!config.enabled || handle) {
        return;
      }

      handle = timerApi.setInterval(() => {
        void runOnce();
      }, config.intervalMs);
    },

    stop() {
      if (!handle) {
        return;
      }

      timerApi.clearInterval(handle);
      handle = null;
    },

    isRunning() {
      return running || handle !== null;
    }
  };
}
