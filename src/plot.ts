import { spawn } from "child_process";
import * as crypto from "crypto";
import { App, FileSystemAdapter, normalizePath, setIcon, TFile } from "obsidian";
import * as path from "path";

import { DEFAULT_SETTINGS, JuliaPlotsSettings } from "./settings";
import juliaScriptContent from "../juliaplots.jl";

/**
 * Parses the parameters from a string formatted as key=value pairs
 * @param source The string containing the parameters
 * @returns The parsed parameters
 */
export function parseParams(source: string): { [key: string]: string } {
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
 * Ensures that a folder and all its parent folders exist in the vault
 * @param app Obsidian App instance
 * @param folderPath Normalized path to the folder
 */
export async function ensureFolderExists(
	app: App,
	folderPath: string,
): Promise<void> {
	const normalized = normalizePath(folderPath);
	if (!normalized || normalized === ".") {
		return;
	}

	const parts = normalized.split("/");
	let currentPath = "";
	for (const part of parts) {
		currentPath = currentPath ? `${currentPath}/${part}` : part;
		const file = app.vault.getAbstractFileByPath(currentPath);
		if (!file) {
			try {
				await app.vault.createFolder(currentPath);
			} catch {
				if (!(await app.vault.adapter.exists(currentPath))) {
					await app.vault.adapter.mkdir(currentPath);
				}
			}
		}
	}
}

/**
 * Creates the path for the plot image. Plot images have a unique name based on the function and parameters used to generate them.
 * This way, if the same function and parameters are used again, the same image will be used instead of generating a new one.
 * @param app Obsidian App instance
 * @param params Plot parameters
 * @param settings Plugin settings
 * @returns Path to the plot image
 */
export async function getPath(
	app: App,
	params: { [key: string]: string },
	settings?: JuliaPlotsSettings,
): Promise<string> {
	const rawDir =
		params.folder ||
		params.plot_folder ||
		settings?.plot_folder ||
		DEFAULT_SETTINGS.plot_folder;
	const dir = normalizePath(rawDir.trim());

	if (dir && dir !== ".") {
		await ensureFolderExists(app, dir);
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

	const filename = `plot-${hash}.png`;
	return dir && dir !== "." ? `${dir}/${filename}` : filename;
}

/**
 * Ensures that the bundled juliaplots.jl script exists on disk in the plugin directory
 * and is up to date with the bundled version.
 * @param app Obsidian App instance
 * @returns Absolute path to the juliaplots.jl script
 */
export async function ensureJuliaScriptExists(app: App): Promise<string> {
	const basePath =
		app.vault.adapter instanceof FileSystemAdapter
			? app.vault.adapter.getBasePath()
			: "";
	const scriptRelativePath = normalizePath(
		`${app.vault.configDir}/plugins/juliaplots/juliaplots.jl`,
	);
	const scriptAbsPath = path.join(basePath, scriptRelativePath);

	try {
		const exists = await app.vault.adapter.exists(scriptRelativePath);
		if (!exists) {
			await app.vault.adapter.write(scriptRelativePath, juliaScriptContent);
		} else {
			const currentContent = await app.vault.adapter.read(scriptRelativePath);
			if (currentContent !== juliaScriptContent) {
				await app.vault.adapter.write(scriptRelativePath, juliaScriptContent);
			}
		}
	} catch (error) {
		console.error("Failed to auto-write juliaplots.jl:", error);
	}

	return scriptAbsPath;
}

/**
 * Calls the Julia script to generate and save the plot
 * @param app Obsidian App instance
 * @param params Parameters for the plot (function, xmin, xmax, num_points)
 * @param outputPath Path where the plot image will be saved
 * @param settings Plugin settings
 */
export async function generateJuliaPlot(
	app: App,
	params: { [key: string]: string },
	outputPath: string,
	settings: JuliaPlotsSettings,
): Promise<void> {
	const juliaScriptPath = await ensureJuliaScriptExists(app);

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
 * @param app Obsidian App instance
 * @param el HTML element where the graph will be inserted
 * @param graphPath Path to the generated graph image
 */
export function insertGraph(
	app: App,
	el: HTMLElement,
	graphPath: string,
): void {
	const vaultBase =
		app.vault.adapter instanceof FileSystemAdapter
			? app.vault.adapter.getBasePath()
			: "";
	const relativePath = path
		.relative(vaultBase, graphPath)
		.replace(/\\/g, "/");
	const file = app.vault.getAbstractFileByPath(relativePath);

	const container = el.createDiv({ cls: "juliaplots-graph-container" });

	const img = container.createEl("img", {
		attr: {
			alt: "Julia Plot",
		},
	});

	if (file instanceof TFile) {
		img.src = app.vault.getResourcePath(file);
	} else {
		img.src = app.vault.adapter.getResourcePath(relativePath);
	}
}

/**
 * Orchestrates rendering a JuliaPlots codeblock
 * @param app Obsidian App instance
 * @param settings Plugin settings
 * @param source Codeblock content
 * @param el Container element
 */
export async function renderJuliaPlotBlock(
	app: App,
	settings: JuliaPlotsSettings,
	source: string,
	el: HTMLElement,
): Promise<void> {
	const params = parseParams(source);
	const outputPath = await getPath(app, params, settings);
	const basePath =
		app.vault.adapter instanceof FileSystemAdapter
			? app.vault.adapter.getBasePath()
			: "";
	const outputPathAbs = path.join(basePath, outputPath);

	const loadingContainer = el.createDiv({ cls: "juliaplots-loading" });
	const spinnerEl = loadingContainer.createSpan({
		cls: "juliaplots-loading-spinner",
	});
	setIcon(spinnerEl, "loader-2");
	loadingContainer.createSpan({
		text: "Generating Julia Plot...",
	});

	try {
		await generateJuliaPlot(app, params, outputPathAbs, settings);
		loadingContainer.remove();
		insertGraph(app, el, outputPathAbs);
	} catch (error) {
		loadingContainer.remove();
		const message =
			error instanceof Error ? error.message : String(error);
		el.createEl("pre", {
			text: `Error generating plot: ${message}`,
		});
	}
}
