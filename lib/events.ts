/*
 * Copyright © 2020 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
	childProcess,
	EventHandler,
	github,
	project,
	repository,
	secret,
	slack,
	status,
	subscription,
} from "@atomist/skill";
import * as fs from "fs-extra";
import * as _ from "lodash";

import { DepCheckConfiguration } from "./configuration";

interface DepCheckReport {
	dependencies: string[];
	devDependencies: string[];
	missing: Record<string, string[]>;
}

export const onPush: EventHandler<
	subscription.types.OnPushSubscription,
	DepCheckConfiguration
> = async ctx => {
	const push = ctx.data.Push[0];
	const repo = push.repo;
	const cfg = ctx.configuration.parameters;

	// Check branch to not be autogenerated
	if (push.branch.startsWith("atomist/")) {
		return status.success(`Ignore generated branch`).hidden().abort();
	}

	// Load repository
	const credential = await ctx.credential.resolve(
		secret.gitHubAppToken({
			owner: repo.owner,
			repo: repo.name,
			apiUrl: repo.org.provider.apiUrl,
		}),
	);
	const p = await ctx.project.clone(
		repository.gitHub({
			owner: repo.owner,
			repo: repo.name,
			credential,
			branch: push.branch,
		}),
	);

	// Check if project has package.json
	if (!(await fs.pathExists(p.path("package.json")))) {
		return status.success("Ignore non-npm project").hidden().abort();
	}

	// Create GitHub check
	const check = await github.createCheck(ctx, p.id, {
		sha: push.after.sha,
		name: ctx.skill.name,
		title: "depcheck",
		body: `Running \`depcheck\``,
	});

	// Run npm install
	let result;
	const opts = { env: { ...process.env, NODE_ENV: "development" } };
	if (await fs.pathExists(p.path("package-lock.json"))) {
		result = await p.spawn(
			"npm",
			["ci", "--ignore-scripts", "--no-audit", "--no-fund"],
			opts,
		);
	} else {
		result = await p.spawn(
			"npm",
			["install", "--ignore-scripts", "--no-audit", "--no-fund"],
			opts,
		);
	}

	if (result.status !== 0) {
		return status.failure("`npm install` failed");
	}

	// Run depcheck
	const args = [];
	if (cfg.config && (await fs.pathExists(p.path(cfg.config)))) {
		args.push(`--config=${p.path(cfg.config)}`);
	} else {
		if (!cfg.scanBin) {
			args.push("--ignore-bin-package=true");
		}
		if (!cfg.scanMissing) {
			args.push("--skip-missing=true");
		}
		if (cfg.ignores?.length > 0) {
			args.push(`--ignores=${cfg.ignores.join(",")}`);
		}
		if (cfg.ignorePatterns?.length > 0) {
			args.push(`--ignore-patterns=${cfg.ignorePatterns.join(",")}`);
		}
	}

	const captureLog = childProcess.captureLog();
	result = await p.spawn("depcheck", [".", ...args, "--json"], {
		log: captureLog,
		logCommand: false,
	});

	if (result.status !== 0) {
		const report: DepCheckReport = JSON.parse(sliceReport(captureLog.log));
		const devFiles = (
			await project.globFiles(p, cfg.testGlobs || [])
		).map(f => p.path(f));
		const missingPackages = _.map(report.missing, (v, k) => {
			return {
				name: k,
				isDev: !v.some(f => !devFiles.includes(f)),
			};
		});

		const depcount =
			report.devDependencies.length +
			report.dependencies.length +
			missingPackages.length;
		let prBody = "";
		let commitMessage = "";
		const actions = [];
		if (
			report.dependencies.length > 0 ||
			report.devDependencies.length > 0
		) {
			actions.push(
				`uninstall ${
					report.devDependencies.length + report.dependencies.length
				} unused`,
			);
			const mapped = mapCommitMessageAndPrBody("Unused ", [
				...(report.dependencies || []),
				...(report.devDependencies || []),
			]);
			prBody = `${prBody}${mapped.prBody}`;
			commitMessage = `${commitMessage}${mapped.commitMessage}`;
		}
		if (missingPackages.length > 0) {
			actions.push(`install ${missingPackages.length} missing`);
			const mapped = mapCommitMessageAndPrBody(
				"Missing ",
				missingPackages.map(mp => mp.name),
			);
			prBody = `${prBody}${mapped.prBody}`;
			commitMessage = `${commitMessage}${mapped.commitMessage}`;
		}

		// Update status
		await check.update({
			conclusion: "neutral",
			annotations: await mapDepCheckReportToAnnotations(report, p),
			body: `\`depcheck\` found unused or missing dependencies

\`$ depcheck . ${args.join(" ")}\`

---

${prBody.trim()}`,
		});

		if (cfg.push !== "none") {
			// Make changes
			if (
				report.dependencies?.length > 0 ||
				report.devDependencies?.length > 0
			)
				await p.spawn("npm", [
					"uninstall",
					...(report.dependencies || []),
					...(report.devDependencies || []),
					"--ignore-scripts",
					"--no-audit",
					"--no-fund",
				]);
			if (missingPackages.filter(mp => !mp.isDev).length > 0) {
				await p.spawn("npm", [
					"install",
					...missingPackages
						.filter(mp => !mp.isDev)
						.map(mp => mp.name),
					"--ignore-scripts",
					"--no-audit",
					"--no-fund",
				]);
			}
			if (missingPackages.filter(mp => mp.isDev).length > 0) {
				await p.spawn("npm", [
					"install",
					...missingPackages
						.filter(mp => mp.isDev)
						.map(mp => mp.name),
					"--ignore-scripts",
					"--no-audit",
					"--no-fund",
					"--save-dev",
				]);
			}
			const message = `This pull request updates \`package.json\` to ${actions.join(
				" and ",
			)} ${depcount === 1 ? "dependency" : "dependencies"}`;

			const title = _.upperFirst(
				`${actions.join(", ")} npm ${
					depcount === 1 ? "dependency" : "dependencies"
				}`,
			);

			// Push changes
			await github.persistChanges(
				ctx,
				p,
				cfg.push,
				{
					branch: push.branch,
					author: {
						name: push.after.author?.person?.name,
						email: push.after.author?.person?.emails?.[0]?.address,
						login: push.after.author?.login,
					},
					defaultBranch: repo.defaultBranch,
				},
				{
					branch: `atomist/depcheck-${push.branch}`,
					labels: cfg.labels,
					title,
					body: `${message}
					
${prBody.trim()}`,
				},
				{
					message: `${title}\n\n${commitMessage.trim()}\n\n[atomist:generated]\n[atomist-skill:${
						ctx.skill.namespace
					}/${ctx.skill.name}]`,
				},
			);
		}

		return status.success(
			`\`depcheck\` found unused or missing dependencies on [${repo.owner}/${repo.name}](${repo.url})`,
		);
	} else {
		// Close potentially open PRs
		await github.closePullRequests(
			ctx,
			p,
			push.branch,
			`atomist/depcheck-${push.branch}`,
			"Closing pull request because all dependencies have been fixed in base branch",
		);

		// Update status
		await check.update({
			conclusion: "success",
			body: `\`depcheck\` found no unused or missing dependencies.

\`$ depcheck . ${args.join(" ")}\``,
		});
		return status.success(
			`\`depcheck\` found no unused or missing dependencies on [${repo.owner}/${repo.name}](${repo.url})`,
		);
	}
};

export function sliceReport(report: string): string {
	let tmp = report;
	tmp = tmp.slice(tmp.indexOf("{"));
	tmp = tmp.slice(0, tmp.lastIndexOf("}") + 1);
	return tmp;
}

async function mapDepCheckReportToAnnotations(
	report: DepCheckReport,
	project: project.Project,
): Promise<Array<github.UpdateCheck["annotations"][0]>> {
	const annotations: Array<github.UpdateCheck["annotations"][0]> = [];
	const pj = (await fs.readFile(project.path("package.json"))).toString();
	[...report.dependencies, ...report.devDependencies].forEach(d => {
		const ix = pj.indexOf(`"${d}"`);
		if (ix > 0) {
			const lineNumber = pj.substring(0, ix).split("\n").length;
			annotations.push({
				path: "package.json",
				startLine: lineNumber,
				endLine: lineNumber,
				message: `Unused dependency ${d}`,
				annotationLevel: "notice",
			});
		}
	});
	_.forEach(report.missing, (v, k) => {
		v.forEach(p => {
			const f = fs.readFileSync(p).toString();
			const ix = f.indexOf(`"${k}`);
			if (ix > 0) {
				const lineNumber = f.substring(0, ix).split("\n").length;
				annotations.push({
					path: p.replace(project.path() + "/", ""),
					startLine: lineNumber,
					endLine: lineNumber,
					message: `Missing dependency ${k}`,
					annotationLevel: "warning",
				});
			}
		});
	});

	return _.sortBy(annotations, "startLine");
}

function mapCommitMessageAndPrBody(
	label: string,
	dependencies: string[],
): {
	commitMessage: string;
	prBody: string;
} {
	const prBody = `### ${label}${
		dependencies.length === 1 ? "Dependency" : "Dependencies"
	}

${dependencies
	.sort()
	.map(d => ` * ${slack.codeLine(d)}`)
	.join("\n")}

`;

	const commitMessage = `${label}${
		dependencies.length === 1 ? "Dependency" : "Dependencies"
	}
${dependencies
	.sort()
	.map(d => ` * ${d}`)
	.join("\n")}					
`;
	return {
		prBody,
		commitMessage,
	};
}
