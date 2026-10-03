import * as path from "node:path";
import { $ } from "execa";
import { expect, test } from "vitest";
import { formatDuration, renderHistogram } from "../index.js";

const indexJs = path.resolve("index.js");

test("basic", async () => {
	const cwd = path.join(import.meta.dirname, "workspaces/basic");
	const { stdout, stderr } = await $({ cwd, reject: false })`node ${indexJs}`;
	expect(stdout).toMatchSnapshot();
	expect(stderr).toMatchInlineSnapshot(`"Some tasks failed. Please check the output above."`);
});

test("no-tasks", async () => {
	const cwd = path.join(import.meta.dirname, "workspaces/no-tasks");
	const { stdout, stderr } = await $({ cwd })`node ${indexJs}`;
	expect(stdout).toMatchSnapshot();
	expect(stderr).toMatchInlineSnapshot(`""`);
});

test("run-report", async () => {
	const cwd = path.join(import.meta.dirname, "workspaces/run-report");
	const { stdout, stderr } = await $({ cwd })`node ${indexJs}`;
	expect(stdout).toContain("demo:build");
	expect(stdout).toContain("(1s 250ms)");
	expect(stdout).toContain("$ npm run build");
	expect(stdout).toContain("REMOTE CACHED");
	expect(stdout).toContain("demo:cached");
	expect(stderr).toBe("");
});

test("formatDuration", () => {
	// Zero duration
	expect(formatDuration({ secs: 0, nanos: 0 })).toBe("0ms)");

	// Fractional milliseconds
	expect(formatDuration({ secs: 0, nanos: 1_000_000 })).toBe("1ms)");
	expect(formatDuration({ secs: 0, nanos: 9_000_000 })).toBe("9ms)");
	expect(formatDuration({ secs: 0, nanos: 10_000_000 })).toBe("10ms)");
	expect(formatDuration({ secs: 0, nanos: 99_000_000 })).toBe("99ms)");
	expect(formatDuration({ secs: 0, nanos: 100_000_000 })).toBe("100ms)");
	expect(formatDuration({ secs: 0, nanos: 999_000_000 })).toBe("999ms)");

	// Exactly 1 second
	expect(formatDuration({ secs: 1, nanos: 0 })).toBe("1s 0ms)");

	// Multiple seconds with milliseconds
	expect(formatDuration({ secs: 1, nanos: 500_000_000 })).toBe("1s 500ms)");
	expect(formatDuration({ secs: 2, nanos: 50_000_000 })).toBe("2s 50ms)");
	expect(formatDuration({ secs: 10, nanos: 5_000_000 })).toBe("10s 5ms)");

	// From real test data: 27.328ms
	expect(formatDuration({ secs: 0, nanos: 27_328_000 })).toBe("27ms)");

	// Fractional edge cases
	expect(formatDuration({ secs: 0, nanos: 500_000 })).toBe("1ms)"); // 0.5ms rounds up
	expect(formatDuration({ secs: 0, nanos: 999_999 })).toBe("1ms)"); // <1ms rounds up
	expect(formatDuration({ secs: 0, nanos: 999_500_000 })).toBe("1s 0ms)"); // 999.5ms rounds to 1000ms = 1s

	// Minutes and seconds (>= 60s)
	expect(formatDuration({ secs: 60, nanos: 0 })).toBe("1m 0s)");
	expect(formatDuration({ secs: 65, nanos: 0 })).toBe("1m 5s)");
	expect(formatDuration({ secs: 90, nanos: 500_000_000 })).toBe("1m 30s)");
	expect(formatDuration({ secs: 315, nanos: 64_000_000 })).toBe("5m 15s)"); // 315s = 5m 15s
	expect(formatDuration({ secs: 600, nanos: 0 })).toBe("10m 0s)");
	expect(formatDuration({ secs: 3599, nanos: 999_000_000 })).toBe("59m 59s)");
});

test("renderHistogram", () => {
	// Edge case: zero max duration
	expect(renderHistogram({ secs: 0, nanos: 0 }, 0)).toBe("\u001b[38;5;240m⣿⣿⣿⣿⣿\u001b[39m");

	// 0% (0ms / 100ms = 0%)
	expect(renderHistogram({ secs: 0, nanos: 0 }, 100)).toBe("\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m");

	// 12.5% (12.5ms / 100ms) → 62.5% through first slot
	expect(renderHistogram({ secs: 0, nanos: 12_500_000 }, 100)).toBe("⣇\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m");

	// 20% (20ms / 100ms) → exactly one full slot
	expect(renderHistogram({ secs: 0, nanos: 20_000_000 }, 100)).toBe("⣿\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m");

	// 25% (25ms / 100ms) → 1.25 slots filled
	expect(renderHistogram({ secs: 0, nanos: 25_000_000 }, 100)).toBe("⣿⡄\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m");

	// 40% (40ms / 100ms) → 2 full slots
	expect(renderHistogram({ secs: 0, nanos: 40_000_000 }, 100)).toBe("⣿⣿\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m");

	// 50% (50ms / 100ms) → 2.5 slots filled
	expect(renderHistogram({ secs: 0, nanos: 50_000_000 }, 100)).toBe("⣿⣿⡇\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m");

	// 60% (60ms / 100ms) → 3 full slots
	expect(renderHistogram({ secs: 0, nanos: 60_000_000 }, 100)).toBe("⣿⣿⣿\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m");

	// 75% (75ms / 100ms) → 3.75 slots filled
	expect(renderHistogram({ secs: 0, nanos: 75_000_000 }, 100)).toBe("⣿⣿⣿⣧\u001b[38;5;240m⣿\u001b[39m");

	// 80% (80ms / 100ms) → 4 full slots
	expect(renderHistogram({ secs: 0, nanos: 80_000_000 }, 100)).toBe("⣿⣿⣿⣿\u001b[38;5;240m⣿\u001b[39m");

	// 100% (100ms / 100ms) → all 5 slots full
	expect(renderHistogram({ secs: 0, nanos: 100_000_000 }, 100)).toBe("⣿⣿⣿⣿⣿");

	// 27% (27ms / 100ms) → 1.35 slots → slot 1 gets 35% = level 3
	expect(renderHistogram({ secs: 0, nanos: 27_000_000 }, 100)).toBe("⣿⡆\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m");

	// 34% (34ms / 100ms) → 1.7 slots → slot 1 gets 70% = level 6
	expect(renderHistogram({ secs: 0, nanos: 34_000_000 }, 100)).toBe("⣿⣧\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m");

	// Different max duration: 1 second with max 2 seconds → 50%
	expect(renderHistogram({ secs: 1, nanos: 0 }, 2000)).toBe("⣿⣿⡇\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m");

	// Very fast task: 5ms with max 100ms → 5% → 0.25 slots = level 2
	expect(renderHistogram({ secs: 0, nanos: 5_000_000 }, 100)).toBe("⡄\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m\u001b[38;5;240m⣿\u001b[39m");

	// Slowest task compared to itself → 100%
	expect(renderHistogram({ secs: 0, nanos: 34_000_000 }, 34)).toBe("⣿⣿⣿⣿⣿");
});
