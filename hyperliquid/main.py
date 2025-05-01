import os
import signal
import statistics
import subprocess
import time

from hyperliquid.info import Info
from hyperliquid.utils import constants
from rich.console import Console
from rich.live import Live
from rich.table import Table

candles = {}  # start timestamp -> latest volume
TRACK_COUNT = 18
console = Console()


def render_candles():
    while len(candles) > TRACK_COUNT:
        oldest = sorted(candles.keys())[0]
        del candles[oldest]

    # Create a table for better formatting
    table = Table(show_header=False, box=None)
    table.add_column("Data")

    # Format the candles values
    values = ", ".join(f"{candles[k]:.1f}" for k in sorted(candles.keys()))
    avg = get_avg()
    stats = f"avg: {avg:.1f}, threshold: {10 * avg:.1f}"

    table.add_row(f"[cyan]{values}[/cyan]")
    table.add_row(f"[magenta]{stats}[/magenta]")
    return table


def add_candle(c):
    timestamp, volume = str(c["data"]["t"]), float(c["data"]["v"])
    candles[timestamp] = volume
    avg = get_avg()
    if avg > 0 and volume > 10 * avg:
        alert()


def get_avg():
    latest = sorted(candles.keys())[-1] if len(candles) > 0 else 0
    return (
        statistics.fmean(v for k, v in candles.items() if k != latest) if latest else 0
    )


def init_candles(info):
    global candles
    end = int(time.time() * 1000)
    start = end - 1000 * 60 * (TRACK_COUNT + 10)
    resp = info.candles_snapshot("BTC", "1m", start, end)
    for c in resp:
        candles[str(c["t"])] = float(c["v"])


def main():
    info = Info(constants.MAINNET_API_URL)
    init_candles(info)

    def handle_exit(signum, frame):
        print("Exiting...")
        os._exit(0)  # Force immediate exit

    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)

    with Live(render_candles(), refresh_per_second=4, console=console) as live:

        def update_display(c):
            add_candle(c)
            live.update(render_candles())

        info.subscribe(
            {"type": "candle", "coin": "BTC", "interval": "1m"},
            update_display,
        )

        signal.pause()  # Block until Ctrl+C


def alert():
    subprocess.run(
        [
            "terminal-notifier",
            "-message",
            "!!!",
            "-title",
            "💰",
            "-sound",
            "Frog",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )


if __name__ == "__main__":
    main()
