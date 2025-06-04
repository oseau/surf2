const sleep = (seconds = 1) =>
  new Promise((resolve) => setTimeout(resolve, 1000 * seconds));

const throttle = (func: CallableFunction, seconds = 1) => {
  let inThrottle = false;
  return async (...args: any[]) => {
    if (!inThrottle) {
      inThrottle = true;
      func(...args);
      await sleep(seconds);
      inThrottle = false;
    }
  };
};

const randomInt = (
  min: number,
  max: number, // [min, max] both inclusive
) => Math.floor(Math.random() * (max - min + 1) + min);

const locker = () => {
  let locked = false;
  return {
    lock: () => {
      if (locked) {
        return false;
      }
      locked = true;
      return true;
    },
    unlock: () => {
      locked = false;
    },
  };
};

const refresher = (() => {
  // refresh if we did not receive data within last 10 seconds
  let latest = Date.now();
  return {
    update: () => (latest = Date.now()),
    refresh: () => {
      if ((Date.now() - latest) / 1000 >= 10) {
        window.location.reload();
      }
    },
  };
})();

export { sleep, throttle, randomInt, locker, refresher };
