import os
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

    if len(candles) > 1:
        latest = sorted(candles.keys())[-1]
        avg = statistics.fmean(v for k, v in candles.items() if k != latest) if len(candles)>1 else 0
        if avg > 0 and candles[latest] > 10 * avg:
            alert()
    else:
        avg = 0

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



def init_candles(info):
    global candles
    end = int(time.time()*1000)
    start = end - 1000*60*(TRACK_COUNT+10)
    resp = info.candles_snapshot('BTC', '1m', start, end)
    for c in resp:
        candles[str(c["t"])] = float(c["v"])


def main():
    info = Info(constants.MAINNET_API_URL)
    init_candles(info)

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
