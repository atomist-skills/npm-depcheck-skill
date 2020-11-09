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
	Category,
	parameter,
	ParameterType,
	ParameterVisibility,
	resourceProvider,
	skill,
} from "@atomist/skill";
import { DepCheckConfiguration } from "./lib/configuration";

export const Skill = skill<DepCheckConfiguration & { repos: any }>({
	name: "npm-depcheck-skill",
	namespace: "atomist",
	description: "Find unused or missing dependencies in your JavaScript code",
	displayName: "npm Dependency Checker",
	author: "Atomist",
	categories: [Category.CodeMaintenance, Category.Security],
	license: "Apache-2.0",
	iconUrl:
		"https://raw.githubusercontent.com/atomist-skills/npm-depcheck-skill/main/docs/images/icon.jpeg",

	containers: {
		npm: {
			image: "gcr.io/atomist-container-skills/npm-depcheck-skill",
			resources: {
				limit: {
					cpu: 2,
					memory: 2000,
				},
				request: {
					cpu: 2,
					memory: 2000,
				},
			},
		},
	},

	resourceProviders: {
		github: resourceProvider.gitHub({ minRequired: 1 }),
	},

	parameters: {
		skipMissing: {
			type: ParameterType.Boolean,
			displayName: "Skip missing",
			description:
				"indicate if `depcheck` should skip calculation of missing dependencies",
			required: false,
		},
		ignoreBin: {
			type: ParameterType.Boolean,
			displayName: "Ignore bin packages",
			description:
				"Indicate if `depcheck` ignores packages containing bin entries",
			required: false,
		},
		ignores: {
			type: ParameterType.StringArray,
			displayName: "Ignore packages",
			description:
				"Specify package names to ignore (can be glob expressions)",
			required: false,
		},
		ignorePatterns: {
			type: ParameterType.StringArray,
			displayName: "Ignore paths",
			description: "Specify files to ignore (can be glob expressions)",
			required: false,
		},
		config: {
			type: ParameterType.String,
			displayName: "Config file",
			description: "Path to config file in repository",
			required: false,
			visibility: ParameterVisibility.Advanced,
		},
		testGlobs: {
			type: ParameterType.StringArray,
			displayName: "Test files",
			description: "Glob patterns to identify test resources",
			required: false,
			visibility: ParameterVisibility.Advanced,
		},
		push: parameter.pushStrategy({
			displayName: "Fix dependencies",
			description:
				"Run `depcheck` and add used and remove unused dependencies",
			options: [
				{
					text: "Do not fix dependencies",
					value: "none",
				},
			],
		}),
		labels: {
			type: ParameterType.StringArray,
			displayName: "Pull request labels",
			description:
				"Add additional labels to pull requests raised by this skill, e.g. to configure the [auto-merge](https://go.atomist.com/catalog/skills/atomist/github-auto-merge-skill) behavior.",
			required: false,
		},
		repos: parameter.repoFilter(),
	},

	subscriptions: ["@atomist/skill/github/onPush"],
});
