/*
 * Copyright © 2021 Atomist, Inc.
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
	categories: [Category.CodeMaintenance, Category.DevSecOps],
	license: "Apache-2.0",
	iconUrl:
		"https://raw.githubusercontent.com/atomist-skills/npm-depcheck-skill/main/docs/images/icon.svg",

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
		scanMissing: {
			type: ParameterType.Boolean,
			displayName: "Missing dependencies",
			description:
				"Select to scan the source code for missing dependencies.",
			required: false,
			defaultValue: true,
		},
		scanBin: {
			type: ParameterType.Boolean,
			displayName: "Bin packages",
			description:
				"Select to include packages containing [bin entries](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#bin).",
			required: false,
			defaultValue: true,
		},
		ignores: {
			type: ParameterType.StringArray,
			displayName: "Packages to ignore",
			description:
				"Enter the npm package names you want to ignore as glob expressions.",
			required: false,
		},
		ignorePatterns: {
			type: ParameterType.StringArray,
			displayName: "Files to ignore",
			description:
				"Enter the file names you want to ignore as glob expressions.",
			required: false,
		},
		config: {
			type: ParameterType.String,
			displayName: "Configuration file",
			description:
				"Enter a configuration file name to specify custom overrides.",
			required: false,
			visibility: ParameterVisibility.Advanced,
		},
		testGlobs: {
			type: ParameterType.StringArray,
			displayName: "Test files",
			description:
				"Enter the file names in the selected repositories of your unit tests as glob expressions.",
			required: false,
			visibility: ParameterVisibility.Advanced,
		},
		push: parameter.pushStrategy({
			displayName: "Dependency fixes",
			description:
				"Select how and when fixes should be committed back into the repository.",
			options: [
				{
					text: "Do not fix dependencies",
					value: "none",
				},
			],
			required: true,
		}),
		labels: {
			type: ParameterType.StringArray,
			displayName: "Pull request labels",
			description:
				"Add additional labels to pull requests raised by this skill.",
			required: false,
		},
		repos: parameter.repoFilter(),
	},

	subscriptions: ["@atomist/skill/github/onPush"],
});
