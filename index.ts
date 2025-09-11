import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import * as core from "@actions/core";

import { parseJson } from "@moonrepo/dev";

import type { Action, ActionStatus, OperationMetaTaskExecution, RunReport } from "@moonrepo/types";

async function loadReport(workspaceRoot: string): Promise<RunReport | null> {
	for (const fileName of ["ciReport.json", "runReport.json"]) {
		const localPath = path.join(".moon/cache", fileName);

		const reportPath = path.join(workspaceRoot, localPath);

		core.debug(`Finding run report at ${localPath}`);

		if (await fileExists(reportPath)) {
			core.debug("Found!");

			return parseJson<RunReport>(reportPath);
		}
	}

	return null;
}

async function main(): Promise<void> {
	const root = process.cwd();

	const report = await loadReport(root);

	if (!report) {
		core.warning("Run report does not exist, has `moon ci` or `moon run` ran?");

		return;
	}

	for (const action of report.actions) {
		if (action.node.action !== "run-task") {
			continue;
		}

		const { project, task } = parseTarget(action.node.params.target);
		const target = `${project}:${task}`;

		const command = commandOf(action);

		const { stdout, stderr } = await readStatus(root, { project, task });

		const hasStdout = stdout.trim() !== "";
		const hasStderr = stderr.trim() !== "";

		core.startGroup(`${statusBadges[action.status]} ${bold(target)}`);

		if (typeof command === "string") {
			console.log(blue(`$ ${command}`));
		}

		if (hasStdout) {
			console.log(stdBadges.out);
			console.log(stdout);
		}

		if (hasStderr) {
			console.log(stdBadges.err);
			console.log(stderr);
		}

		core.endGroup();
	}
}

interface TargetIdentity {
	task: (string & {}) | "unknown";
	project: (string & {}) | "unknown";
}

function parseTarget(target: string): TargetIdentity {
	const parts = target.split(":");

	const project = parts[0] ?? "unknown";
	const task = parts[1] ?? "unknown";

	return { project, task };
}

function commandOf(action: Action): OperationMetaTaskExecution["command"] {
	for (const operation of action.operations) {
		if (operation.meta.type === "task-execution") {
			return operation.meta.command;
		}
	}

	return undefined;
}

async function readStatus(
	workspaceRoot: string,
	{ project, task }: TargetIdentity,
): Promise<{ stdout: string; stderr: string }> {
	const statusDir = `${workspaceRoot}/.moon/cache/states/${project}/${task}`;

	const stdoutPath = `${statusDir}/stdout.log`;
	const stderrPath = `${statusDir}/stderr.log`;

	const stdout = (await fileExists(stdoutPath)) ? await readFile(stdoutPath, { encoding: "utf8" }) : "";

	const stderr = (await fileExists(stderrPath)) ? await readFile(stderrPath, { encoding: "utf8" }) : "";

	return { stdout, stderr };
}

async function fileExists(path: string): Promise<boolean> {
	try {
		await stat(path);

		return true;
	} catch {
		return false;
	}
}

const statusBadges: Record<ActionStatus, string> = {
	running: bgGreen(" RUNNING "),
	passed: bgGreen(" PASS "),

	failed: bgRed(" FAIL "),
	"timed-out": bgRed(" TIMED OUT "),
	aborted: bgRed(" ABORTED "),
	invalid: bgRed(" INVALID "),
	"failed-and-abort": bgRed(" FAILED AND ABORT "),

	skipped: bgBlue(" SKIP "),
	cached: bgBlue(" CACHED "),
	"cached-from-remote": bgBlue(" REMOTE CACHED "),
};

function bgGreen(text: string): string {
	return `\u001b[42m${text}\u001b[49m`;
}

function bgRed(text: string): string {
	return `\u001b[41m${text}\u001b[49m`;
}

function bgBlue(text: string): string {
	return `\u001b[44m${text}\u001b[49m`;
}

function bgDarkGray(text: string): string {
	return `\u001b[48;5;236m${text}\u001b[49m`;
}

function bold(text: string): string {
	return `\u001b[1m${text}\u001b[22m`;
}

function green(text: string): string {
	return `\u001b[32m${text}\u001b[39m`;
}

function red(text: string): string {
	return `\u001b[31m${text}\u001b[39m`;
}

function blue(text: string): string {
	return `\u001b[34m${text}\u001b[39m`;
}

const stdBadges = {
	out: bgDarkGray(`　${green("⏺")} STDOUT　`),
	err: bgDarkGray(`　${red("⏺")} STDERR　`),
} as const;

try {
	await main();
} catch (error) {
	console.error(error);
	process.exit(0);
}
