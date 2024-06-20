import { readFile, stat } from "node:fs/promises";

async function main(): Promise<void> {
	const workspaceRoot = await getWorkspaceRoot();
	const ciReport = await readCiReport(workspaceRoot);
	for (const action of ciReport.actions) {
		const taskInfo = taskInfoOf(action);
		if (!taskInfo) {
			continue;
		}
		const { stdout, stderr } = await readStatus({ workspaceRoot, taskInfo });
		const { project, task, command, status } = taskInfo;
		const target = `${project}:${task}`;
		writeGroup(`${statusBadges[status]} ${bold(target)}`, ({ println }) => {
			if (command) {
				println(blue(`$ ${command}`));
			}
			const hasStdout = stdout.trim() !== "";
			const hasStderr = stderr.trim() !== "";
			if (hasStdout) {
				println(stdoutBadge);
				println(stdout);
			}
			if (hasStderr) {
				println(stderrBadge);
				println(stderr);
			}
		});
	}
}

async function getWorkspaceRoot(): Promise<string> {
	return process.cwd();
}

async function readCiReport(workspaceRoot: string): Promise<CiReport> {
	const ciReportPath = `${workspaceRoot}/.moon/cache/ciReport.json`;
	const ciReportFile = await readFileContent(ciReportPath);
	return JSON.parse(ciReportFile) as CiReport;
}

function taskInfoOf(action: Action): undefined | TaskInfo {
	if (action.node.action !== "run-task") {
		return undefined;
	}
	const { project, task } = parseTarget(action.node.params.target);
	return {
		project,
		task,
		command: commandOf(action),
		status: action.status,
	};
}

type TaskInfo = {
	project: string;
	task: string;
	command: undefined | string;
	status: "failed" | "passed" | "skipped";
};

function parseTarget(target: string): { project: string; task: string } {
	const parts = target.split(":");
	const project = parts[0] ?? "unknown";
	const task = parts[1] ?? "unknown";
	return { project, task };
}

function commandOf(action: Action): string | undefined {
	for (const operation of action.operations) {
		if (operation.meta.type === "task-execution") {
			return operation.meta.command;
		}
	}
	return undefined;
}

async function readStatus({
	workspaceRoot,
	taskInfo,
}: { workspaceRoot: string; taskInfo: TaskInfo }): Promise<{ stdout: string; stderr: string }> {
	const { project, task } = taskInfo;
	const statusDir = `${workspaceRoot}/.moon/cache/states/${project}/${task}`;
	const stdoutPath = `${statusDir}/stdout.log`;
	const stderrPath = `${statusDir}/stderr.log`;
	const stdout = (await fileExists(stdoutPath)) ? await readFileContent(stdoutPath) : "";
	const stderr = (await fileExists(stderrPath)) ? await readFileContent(stderrPath) : "";
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

async function readFileContent(path: string): Promise<string> {
	return await readFile(path, { encoding: "utf8" });
}

function writeGroup(title: string, inner: (params: { println: (output: string) => void }) => void): void {
	console.log(`::group::${title}`);
	inner({
		println(output) {
			console.log(output);
		},
	});
	console.log("::endgroup::");
}

const statusBadges: Record<Action["status"], string> = {
	passed: bgGreen(" PASS "),
	failed: bgRed(" FAIL "),
	skipped: bgBlue(" SKIP "),
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

const stdoutBadge = bgDarkGray(`　${green("⏺")} STDOUT　`);
const stderrBadge = bgDarkGray(`　${red("⏺")} STDERR　`);

type CiReport = {
	actions: Action[];
};

type Action = {
	label: string;
	nodeIndex: number;
	status: "failed" | "passed" | "skipped";
	node: Node;
	operations: Operation[];
};

type Node =
	| {
			action: "run-task";
			params: {
				target: string;
			};
	  }
	| {
			action: "sync-workspace" | "setup-tool" | "install-deps" | "sync-project" | "install-project-deps";
	  };

type Operation = {
	meta: Meta;
};

type Meta =
	| {
			type: "task-execution";
			command: string;
	  }
	| {
			type: "archive-creation" | "hash-generation" | "no-operation" | "output-hydration";
	  };

try {
	await main();
} catch (error) {
	console.error(error);
	process.exit(0);
}
