import json
import os
import signal
import sys

from hyperliquid.info import Info
from hyperliquid.utils import constants

candles = {}  # start timestamp -> latest volume
TRACK_COUNT = 18


def print_candle():
    print(
        ", ".join(f"{candles[k]:.1f}" for k in sorted(candles.keys())[-TRACK_COUNT:]),
        end="\r",
        flush=True,
    )


def add_candle(c):
    timestamp, volume = str(c["data"]["t"]), float(c["data"]["v"])
    if len(candles) > TRACK_COUNT:
        oldest = sorted(candles.keys())[0]
        del candles[oldest]
    candles[timestamp] = volume
    avg = sum(v for v in candles.values()) / TRACK_COUNT
    if volume > 20 * avg:
        alert()
    print_candle()


def before_exit(signum, frame):
    signame = signal.Signals(signum).name
    print(f"Signal handler called with signal {signame} ({signum})")
    with open("latest.json", "w") as fp:
        json.dump(candles, fp)
    sys.exit(0)


def main():
    global candles
    with open("latest.json", "r") as f:
        candles = json.load(f)
    info = Info(constants.MAINNET_API_URL)
    info.subscribe(
        {"type": "candle", "coin": "BTC", "interval": "1m"},
        add_candle,
    )
    signal.signal(signal.SIGINT, before_exit)


def alert():
    os.system("afplay /System/Library/Sounds/Frog.aiff")


if __name__ == "__main__":
    main()
