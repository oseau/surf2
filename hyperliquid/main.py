import logging
import os
import signal
import statistics
import subprocess
import sys
import time

from hyperliquid.info import Info
from hyperliquid.utils import constants

candles = {}  # start timestamp -> latest volume
TRACK_COUNT = 18


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

    values = ", ".join(f"{candles[k]:.1f}" for k in sorted(candles.keys()))
    latest = sorted(candles.keys())[-1] if candles else 0
    volume = candles[latest] if latest else 0
    avg = get_avg()
    if avg > 0 and volume > 10 * avg:
        alert()
    stats = f"avg: {avg:.1f}, threshold: {10 * avg:<10.1f}"
    print("\033[F\033[K", end="")  # Move up and clear both lines
    print(f"{values}\n{stats}", end="", flush=True)


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
    start = end - 1000 * 60 * (TRACK_COUNT + 10)
    resp = info.candles_snapshot("BTC", "1m", start, end)
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
        {"type": "candle", "coin": "BTC", "interval": "1m"},
        add_candle,
    )


if __name__ == "__main__":
    main()
