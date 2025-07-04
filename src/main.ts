import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { spawn } from 'child_process';
import * as path from 'path';
import { TFile } from 'obsidian';

import { JuliaPlotsSettings, DEFAULT_SETTINGS, JuliaPlotsSettingTab } from './settings';
import { JuliaPlotsModal } from './command';

/* ---- Plugin logic ---- */
export default class JuliaPlots extends Plugin {
	settings: JuliaPlotsSettings;

	/* ---- When the plugin loads ---- */
	async onload() {
		await this.loadSettings();

		/** Execute when a juliaplots codeblock is created */
		this.registerMarkdownCodeBlockProcessor("juliaplots", async (source, el, ctx) => {

			const params = parseParams(source);
			const outputPath = await getPath(source, params, this.settings);
			const outputPathAbs = path.join((this.app.vault.adapter as any).basePath, outputPath);

			const loadingMsg = el.createEl("span", { text: "⏳ Generating Julia Plot..." });

			try {
				await generateJuliaPlot(params, outputPathAbs, this.settings);
				loadingMsg.remove();
				insertGraph(el, outputPathAbs);
			}
			catch(error){
				el.createEl("pre", {text: `Error generating plot: ${error}`});
			}
		});

		// Command (editor callback)
		this.addCommand({
			id: 'insert-graph',
			name: 'Insert a quick JuliaPlots graph',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				new JuliaPlotsModal(this.app,async (params) => {
					const lines = ['```juliaplots'];
					if (params.function) lines.push(`${params.function}`);
					if (params.scatter) lines.push(`scatter=${params.scatter}`);
					if (params.title) lines.push(`title=${params.title}`);
					lines.push('```');
					editor.replaceSelection(lines.join('\n'));
				}).open();
			}
		});

		/** PLUGIN CONFIGURATION TAB **/
		this.addSettingTab(new JuliaPlotsSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
function parseParams(source: string): { [key: string]: string} {
	
	const lines = source.split('\n');
	const result: { [key:string]: string} = {};

	for (const line of lines){
		const [key,value] = line.split('=');
		if(key && value){
			result[key.trim()] = value.trim();
		}
	}
	return result;
}

/**
 * Creates the path for the plot image. This so that a plot with the same parameters isn't generated twice.
 * @param basePath Vault path
 * @param source Source code of the plot
 * @returns Path to the plot image
 */
async function getPath(source: string, params: { [key: string]: string }, settings: JuliaPlotsSettings): Promise<string> {

    const dir = "juliaplots";

    if (!(await this.app.vault.adapter.exists(dir))) {
        await this.app.vault.createFolder(dir);
    }

    // Obtener solo las funciones (parámetros que terminan en (x) o (x,y))
    const functionParams = Object.entries(params)
        .filter(([key, value]) => key.trim().endsWith('(x)') || key.trim().endsWith('(x,y)'))
        .map(([key, val]) => `${key.trim()}=${val.trim()}`);

    // Crear hash solo de las funciones usando crypto para mejor distribución
    const hashInput = functionParams.join('|');
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 10);

    return `${dir}/plot-${hash}.png`;
}

/**
 * Calls the Julia script to generate and save the plot
 * @param params Parameters for the plot (function, xmin, xmax, num_points)
 * @param outputPath Path where the plot image will be saved
 * @param settings Plugin settings
 */
async function generateJuliaPlot(params : {[key:string]:string }, outputPath: string, settings: JuliaPlotsSettings){
	// Set path to the Julia plots script
    const juliaScriptPath = path.join(this.app.vault.adapter.getBasePath(), this.app.vault.configDir, 'plugins', 'juliaplots','juliaplots.jl');

	// Join all params (and put default settings if something is missing)
	const allParams = {
		...settings,
		...params,
		output_path: outputPath
	};

	// Back to key=value pairs
	// This so that Julia can read infinite parameters
	const args = [juliaScriptPath];
	for (const [key,value] of Object.entries(allParams)) {
		args.push(`${key}=${value}`);
	}

	// Spawn the Julia script with the arguments
    return  new Promise<void>((resolve, reject) => {
        const julia = spawn('julia', args);

        let stderr = '';
		let stdout = '';
		julia.stdout.on('data', (data) => {
			stdout += data.toString();
		});
		
        julia.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        julia.on('close', (code) => {
            if (code === 0){
				if (stdout.trim()){
					console.log(`JuliaPlots: ${stdout}`);
					new Notice(`JuliaPlots: ${stdout}`);
				}
                resolve();
            }
            else {
                reject(stderr || `Julia process exited with code ${code}`);
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
    const relativePath = path.relative(vaultBase, graphPath).replace(/\\/g, '/');
    const file = this.app.vault.getAbstractFileByPath(relativePath);

	const container = el.createDiv({ cls: 'juliaplots-graph-container' });

    let img = document.createElement('img');
    img.alt = 'Julia Plot';

    if (file instanceof TFile) {
        img.src = this.app.vault.getResourcePath(file);
    } else {
        img.src = relativePath;
    }

    container.appendChild(img);
}
