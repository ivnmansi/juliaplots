import { spawn } from "child_process";
import * as crypto from "crypto";
import { Editor, FileSystemAdapter, Plugin, TFile } from "obsidian";
import * as path from "path";

import { JuliaPlotsModal } from "./command";
import {
	DEFAULT_SETTINGS,
	JuliaPlotsSettings,
	JuliaPlotsSettingTab,
} from "./settings";

export default class JuliaPlots extends Plugin {
	settings: JuliaPlotsSettings;

	async onload() {
		await this.loadSettings();

		/**
		 * JuliaPlots code block processor
		 * This will be called whenever a code block with the language "juliaplots" is found in a note.
		 * It will generate the plot and insert it into the note.
		 */
		this.registerMarkdownCodeBlockProcessor(
			"juliaplots",
			async (source, el, _ctx) => {
				const params = parseParams(source);
				const outputPath = await getPath(params);
				const basePath =
					this.app.vault.adapter instanceof FileSystemAdapter
						? this.app.vault.adapter.getBasePath()
						: "";
				const outputPathAbs = path.join(basePath, outputPath);

				const loadingMsg = el.createSpan({
					text: "⏳ Generating Julia Plot...",
				});

				try {
					await generateJuliaPlot(
						params,
						outputPathAbs,
						this.settings,
					);
					loadingMsg.remove();
					insertGraph(el, outputPathAbs);
				} catch (error) {
					const message =
						error instanceof Error ? error.message : String(error);
					el.createEl("pre", {
						text: `Error generating plot: ${message}`,
					});
				}
			},
		);

		/**
		 * Command to insert a JuliaPlots code block into the note
		 * This will open a modal where the user can input the function and parameters for the plot.
		 * Once the user submits the form, a code block will be inserted into the note with the specified parameters.
		 */
		this.addCommand({
			id: "insert-graph",
			name: "Insert a quick graph",
			editorCallback: (editor: Editor) => {
				new JuliaPlotsModal(this.app, (params) => {
					const lines = ["```juliaplots"];
					if (params.function) lines.push(`${params.function}`);
					if (params.scatter) lines.push(`scatter=${params.scatter}`);
					if (params.title) lines.push(`title=${params.title}`);
					lines.push("```");
					editor.replaceSelection(lines.join("\n"));
				}).open();
			},
		});

		/**
		 * PLUGIN CONFIGURATION TAB
		 * This will add a settings tab to the plugin's configuration in Obsidian.
		 */
		this.addSettingTab(new JuliaPlotsSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

/**
 * Parses the parameters from a string formatted as key=value pairs
 * @param source The string containing the parameters
 * @returns The parsed parameters
 */
function parseParams(source: string): { [key: string]: string } {
	const lines = source.split("\n");
	const result: { [key: string]: string } = {};

	for (const line of lines) {
		const [key, value] = line.split("=");
		if (key && value) {
			result[key.trim()] = value.trim();
		}
	}
	return result;
}

/**
 * Creates the path for the plot image. Plot images have a unique name based on the function and parameters used to generate them.
 * This way, if the same function and parameters are used again, the same image will be used instead of generating a new one.
 * @param params Plot parameters
 * @returns Path to the plot image
 */
async function getPath(
	params: { [key: string]: string },
): Promise<string> {
	const dir = "juliaplots";

	if (!(await this.app.vault.adapter.exists(dir))) {
		await this.app.vault.createFolder(dir);
	}

	const functionParams = Object.entries(params)
		.filter(
			([key]) =>
				key.trim().endsWith("(x)") || key.trim().endsWith("(x,y)"),
		)
		.map(([key, val]) => `${key.trim()}=${val.trim()}`);

	const hashInput = functionParams.join("|");
	const hash = crypto
		.createHash("sha256")
		.update(hashInput)
		.digest("hex")
		.slice(0, 10);

	return `${dir}/plot-${hash}.png`;
}

/**
 * Calls the Julia script to generate and save the plot
 * @param params Parameters for the plot (function, xmin, xmax, num_points)
 * @param outputPath Path where the plot image will be saved
 * @param settings Plugin settings
 */
async function generateJuliaPlot(
	params: { [key: string]: string },
	outputPath: string,
	settings: JuliaPlotsSettings,
) {
	// Set path to the Julia plots script
	const juliaScriptPath = path.join(
		this.app.vault.adapter.getBasePath(),
		this.app.vault.configDir,
		"plugins",
		"juliaplots",
		"juliaplots.jl",
	);

	// Join all params (and put default settings if something is missing)
	const allParams = {
		...settings,
		...params,
		output_path: outputPath,
	};

	// Back to key=value pairs
	// This so that Julia can read infinite parameters
	const args = [juliaScriptPath];
	for (const [key, value] of Object.entries(allParams)) {
		args.push(`${key}=${value}`);
	}

	// Spawn the Julia script with the arguments
	return new Promise<void>((resolve, reject) => {
		const juliaExecutable = settings.julia_path || "julia";
		const julia = spawn(juliaExecutable, args);

		let stderr = "";
		let stdout = "";
		julia.stdout.on("data", (data) => {
			stdout += data.toString();
		});

		julia.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		julia.on("error", (err) => {
			if (err) {
				reject(
					new Error(
						`Julia could not be initialized. Please make sure that Julia is installed on your system and that it is included on your PATH: ${err.message}`,
					),
				);
			}
		});

		julia.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				const msg =
					[stdout.trim(), stderr.trim()].filter(Boolean).join("\n") ||
					`Julia process exited with code ${code}`;
				reject(new Error(msg));
			}
		});
	});
}

/**
 * Inserts the generated graph into the note
 * @param el HTML element where the graph will be inserted
 * @param graphPath Path to the generated graph image
 */
function insertGraph(el: HTMLElement, graphPath: string) {
	const vaultBase = this.app.vault.adapter.getBasePath();
	const relativePath = path
		.relative(vaultBase, graphPath)
		.replace(/\\/g, "/");
	const file = this.app.vault.getAbstractFileByPath(relativePath);

	const container = el.createDiv({ cls: "juliaplots-graph-container" });

	const img = container.createEl("img", {
		attr: {
			alt: "Julia Plot",
		},
	});

	if (file instanceof TFile) {
		img.src = this.app.vault.getResourcePath(file);
	} else {
		img.src = relativePath;
	}
}
