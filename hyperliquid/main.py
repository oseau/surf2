import logging
import os
import signal
import statistics
import subprocess
import time

from hyperliquid.info import Info
from hyperliquid.utils import constants

COIN = "PUMP"
INTERVAL = "5m"
candles = {}  # start timestamp -> latest volume
TRACK_COUNT = 12


class ConnectionLossHandler(logging.Handler):
    def __init__(self, info):
        super().__init__()
        self.info = info

    def emit(self, record):
        if "Connection to remote host was lost. - goodbye" in record.getMessage():
            print(record.getMessage())
            for _ in range(3):
                alert("error")
            self.info.disconnect_websocket()
            os._exit(1)


def signal_handler(signum, frame):
    print("\nbye~")
    os._exit(0)


def render_candles():
    while len(candles) > TRACK_COUNT:
        oldest = sorted(candles.keys())[0]
        del candles[oldest]

    base = get_base(v for v in candles.values())
    values = ", ".join(render_number(candles[k], base) for k in sorted(candles.keys()))
    latest = sorted(candles.keys())[-1] if candles else 0
    volume = candles[latest] if latest else 0
    avg = get_avg()
    if avg > 0 and volume > 10 * avg:
        alert()
    stats = (
        f"avg: {render_number(avg, base)}, threshold: {render_number(10 * avg, base)}"
    )
    # moves cursor to the beginning of the previous line
    print("\033[F", end="")
    # clear line first then print
    print(f"\033[K{values}")
    # clear line first then print, no return at the end, and flush
    print(f"\033[K{stats}", end="", flush=True)


def render_number(num, base):
    unit = {10**0: "", 10**3: "k", 10**6: "m", 10**9: "b"}[base]
    return f"{num / base:.1f}{unit}"


def get_base(nums):
    return (
        10**9
        if all(n > 10**9 for n in nums)
        else 10**6
        if all(n > 10**6 for n in nums)
        else 10**3
        if all(n > 10**3 for n in nums)
        else 1
    )


def add_candle(c):
    timestamp, volume = str(c["data"]["t"]), float(c["data"]["v"])
    candles[timestamp] = volume
    render_candles()


def get_avg():
    latest = sorted(candles.keys())[-1] if len(candles) > 0 else 0
    return (
        statistics.fmean(v for k, v in candles.items() if k != latest) if latest else 0
    )


def init_candles(info):
    end = int(time.time() * 1000)
    unit = {"1m": 1000 * 60, "5m": 1000 * 60 * 5}[INTERVAL]
    start = end - unit * (TRACK_COUNT + 10)
    resp = info.candles_snapshot(COIN, INTERVAL, start, end)
    for c in resp:
        candles[str(c["t"])] = float(c["v"])


def alert(sound="notification"):
    procs = [
        subprocess.Popen([
            "terminal-notifier",
            "-message",
            "!!!",
            "-title",
            "💰",
        ]),
        subprocess.Popen([
            "afplay",
            "-v",
            "5" if sound == "notification" else "2",
            f"./{sound}.mp3",
        ]),  # system notification volume too low
    ]
    for proc in procs:
        proc.wait()


def main():
    signal.signal(signal.SIGINT, signal_handler)
    print("\n\n", end="")  # Print two blank lines to be overwritten later
    info = Info(constants.MAINNET_API_URL)
    init_candles(info)

    # Set up logging with info instance
    logging.basicConfig(level=logging.ERROR)
    logger = logging.getLogger("websocket")
    logger.addHandler(ConnectionLossHandler(info))

    info.subscribe(
        {"type": "candle", "coin": COIN, "interval": INTERVAL},
        add_candle,
    )


if __name__ == "__main__":
    main()
