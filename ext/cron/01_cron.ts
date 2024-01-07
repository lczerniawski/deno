// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { core, internals, primordials } from "ext:core/mod.js";
const {
  ArrayPrototypeJoin,
  NumberPrototypeToString,
  TypeError,
} = primordials;
const {
  isPromise,
} = core;
const {
  op_cron_create,
  op_cron_next,
} = core.ensureFastOps();

export function formatToCronSchedule(
  value?: number | { exact: number | number[] } | {
    start?: number;
    end?: number;
    every?: number;
  },
): string {
  if (value === undefined) {
    return "*";
  } else if (typeof value === "number") {
    return NumberPrototypeToString(value);
  } else {
    const { exact } = value as { exact: number | number[] };
    if (exact === undefined) {
      const { start, end, every } = value as {
        start?: number;
        end?: number;
        every?: number;
      };
      if (start !== undefined && end !== undefined && every !== undefined) {
        return start + "-" + end + "/" + every;
      } else if (start !== undefined && end !== undefined) {
        return start + "-" + end;
      } else if (start !== undefined && every !== undefined) {
        return start + "/" + every;
      } else if (start !== undefined) {
        return start + "/1";
      } else if (end === undefined && every !== undefined) {
        return "*/" + every;
      } else {
        throw new TypeError("Invalid cron schedule");
      }
    } else {
      if (typeof exact === "number") {
        return NumberPrototypeToString(exact);
      } else {
        return ArrayPrototypeJoin(exact, ",");
      }
    }
  }
}

export function parseScheduleToString(
  schedule: string | Deno.CronSchedule,
): string {
  if (typeof schedule === "string") {
    return schedule;
  } else {
    const {
      minute,
      hour,
      dayOfMonth,
      month,
      dayOfWeek,
    } = schedule;

    return formatToCronSchedule(minute) +
      " " + formatToCronSchedule(hour) +
      " " + formatToCronSchedule(dayOfMonth) +
      " " + formatToCronSchedule(month) +
      " " + formatToCronSchedule(dayOfWeek);
  }
}

function cron(
  name: string,
  schedule: string | Deno.CronSchedule,
  handlerOrOptions1:
    | (() => Promise<void> | void)
    | ({ backoffSchedule?: number[]; signal?: AbortSignal }),
  handlerOrOptions2?:
    | (() => Promise<void> | void)
    | ({ backoffSchedule?: number[]; signal?: AbortSignal }),
) {
  if (name === undefined) {
    throw new TypeError("Deno.cron requires a unique name");
  }
  if (schedule === undefined) {
    throw new TypeError("Deno.cron requires a valid schedule");
  }

  schedule = parseScheduleToString(schedule);

  let handler: () => Promise<void> | void;
  let options: { backoffSchedule?: number[]; signal?: AbortSignal } | undefined;

  if (typeof handlerOrOptions1 === "function") {
    handler = handlerOrOptions1;
    if (typeof handlerOrOptions2 === "function") {
      throw new TypeError("options must be an object");
    }
    options = handlerOrOptions2;
  } else if (typeof handlerOrOptions2 === "function") {
    handler = handlerOrOptions2;
    options = handlerOrOptions1;
  } else {
    throw new TypeError("Deno.cron requires a handler");
  }

  const rid = op_cron_create(
    name,
    schedule,
    options?.backoffSchedule,
  );

  if (options?.signal) {
    const signal = options?.signal;
    signal.addEventListener(
      "abort",
      () => {
        core.close(rid);
      },
      { once: true },
    );
  }

  return (async () => {
    let success = true;
    while (true) {
      const r = await op_cron_next(rid, success);
      if (r === false) {
        break;
      }
      try {
        const result = handler();
        const _res = isPromise(result) ? (await result) : result;
        success = true;
      } catch (error) {
        console.error(`Exception in cron handler ${name}`, error);
        success = false;
      }
    }
  })();
}

// For testing
internals.formatToCronSchedule = formatToCronSchedule;
internals.parseScheduleToString = parseScheduleToString;

export { cron };
