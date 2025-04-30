import json
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
info = None


def render_candles():
    while len(candles) > TRACK_COUNT:
        oldest = sorted(candles.keys())[0]
        del candles[oldest]

    latest = sorted(candles.keys())[-1]
    avg = statistics.fmean(v for k, v in candles.items() if k != latest)
    if candles[latest] > 10 * avg:
        alert()

    # Create a table for better formatting
    table = Table(show_header=False, box=None)
    table.add_column("Data")

    # Format the candles values
    values = ", ".join(f"{candles[k]:.1f}" for k in sorted(candles.keys()))
    stats = f"avg: {avg:.1f}, threshold: {10 * avg:.1f}"

    table.add_row(f"[cyan]{values}[/cyan]")
    table.add_row(f"[magenta]{stats}[/magenta]")
    return table


def add_candle(c):
    timestamp, volume = str(c["data"]["t"]), float(c["data"]["v"])
    candles[timestamp] = volume


def save_and_exit(signum, frame):
    with open("latest.json", "w") as fp:
        json.dump(candles, fp)
    os._exit(0)  # Force immediate exit


def main():
    global candles, info
    with open("latest.json", "r") as f:
        candles = json.load(f)

    info = Info(constants.MAINNET_API_URL)
    signal.signal(signal.SIGINT, save_and_exit)

    def update_display(c):
        add_candle(c)
        live.update(render_candles())

    info.subscribe(
        {"type": "candle", "coin": "BTC", "interval": "1m"},
        update_display,
    )

    with Live(render_candles(), refresh_per_second=4, console=console) as live:
        while True:
            time.sleep(0.1)


def alert():
    subprocess.Popen([
        "terminal-notifier",
        "-message",
        "!!!",
        "-title",
        "💰",
        "-sound",
        "Frog",
    ])


if __name__ == "__main__":
    main()
