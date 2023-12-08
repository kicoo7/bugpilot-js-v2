const BUGPILOT_CHECK_INTERVAL_MS = 1.5 * 1000;
const BUGPILOT_CHECK_MAX_ATTEMPTS = 3;

import logger from "./logger.mjs";

export const waitUntilBugpilotAvailable = (cb, attempts_ = 0) => {
  if (typeof window === "undefined") {
    return;
  }

  if (attempts_ >= BUGPILOT_CHECK_MAX_ATTEMPTS) {
    logger.warn(
      `Bugpilot not available after ${attempts_} attempts. Giving up.`
    );
    return;
  }

  if (!window.Bugpilot) {
    logger.debug(
      `Bugpilot not available yet. Waiting ${BUGPILOT_CHECK_INTERVAL_MS}ms...`
    );

    setTimeout(
      () => waitUntilBugpilotAvailable(cb, attempts_ + 1),
      BUGPILOT_CHECK_INTERVAL_MS
    );

    return;
  }

  cb();
};

export const sendReport = ({ email, description }) => {
  const msg = {
    type: "io.bugpilot.events.send-report",
    data: { email, description },
  };

  // @TODO: also send widgetStartTime, widgetFinishTime,
  // and add them to metadata (see Bugpilot.ts)

  window.postMessage(msg, "*");
};

export function hasArrayChanged(a = [], b = []) {
  return (
    a.length !== b.length || a.some((item, index) => !Object.is(item, b[index]))
  );
}
