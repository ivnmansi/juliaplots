import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { TFile } from 'obsidian';

/* ---- Plugin settings ---- */
interface JuliaPlotsSettings {
	default_function: string;
	default_xmin: number;
	default_xmax: number;
	default_num_points: number;
	default_x_label: string;
	default_y_label: string;

	dark_mode: boolean;
	color: string;
	line_width: number;
}

/* ---- Default settings ---- */
const DEFAULT_SETTINGS: JuliaPlotsSettings = {
	default_function: 'x^2',
	default_xmin: -10,
	default_xmax: 10,
	default_num_points: 100,
	default_x_label: 'x',
 	default_y_label: 'y',

	dark_mode: false,
	color: '#1E90FF',
	line_width: 2
}

/* ---- Plugin logic ---- */
export default class JuliaPLots extends Plugin {
	settings: JuliaPlotsSettings;

	/* ---- When the plugin loads ---- */
	async onload() {
		await this.loadSettings();

		/** Execute when a juliaplots codeblock is created */
		this.registerMarkdownCodeBlockProcessor("juliaplots", async (source, el, ctx) => {

			const params = parseParams(source);
			const outputPath = await getPath(source, params, this.settings);
			const outputPathAbs = path.join((this.app.vault.adapter as any).basePath, outputPath);
			console.log("Ruta absoluta que se pasa a Julia:", outputPathAbs);

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
		// TODO: Create a command that generates a julia plot in the current editor
		this.addCommand({
			id: 'generate-julia-plot',
			name: 'Generate Julia Plot',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('WIP: This command is not implemented yet');
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
 * Settings tab for the plugin
 */
class JuliaPlotsSettingTab extends PluginSettingTab {
	plugin: JuliaPLots;

	constructor(app: App, plugin: JuliaPLots) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h4', { text: '📐 Default parameters' });

		new Setting(containerEl)
			.setName('Default function')
			.setDesc('Default function to plot when no function is specified')
			.addText(text => text
				.setPlaceholder('Example: x^2')
				.setValue(this.plugin.settings.default_function)
				.onChange(async (value) => {
					this.plugin.settings.default_function = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default xmin')
			.setDesc('Default minimum x value for the plot')
			.addText(text => text
				.setPlaceholder('Example: -10')
				.setValue(this.plugin.settings.default_xmin.toString())
				.onChange(async (value) => {
					this.plugin.settings.default_xmin = parseFloat(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default xmax')
			.setDesc('Default maximum x value for the plot')
			.addText(text => text
				.setPlaceholder('Example: 10')
				.setValue(this.plugin.settings.default_xmax.toString())
				.onChange(async (value) => {
					this.plugin.settings.default_xmax = parseFloat(value);
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Default number of points')
			.setDesc('Default number of points to plot on the graph (⚠️ Notice that a higher number of points will result in a smoother graph, but maybe will take longer to generate)')
			.addText(text => text
				.setPlaceholder('Example: 100')
				.setValue(this.plugin.settings.default_num_points.toString())
				.onChange(async (value) => {
					this.plugin.settings.default_num_points = parseFloat(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default x label')
			.setDesc('Default label for the x-axis of the graph')
			.addText(text => text
				.setPlaceholder('Example: Time (s)')
				.setValue(this.plugin.settings.default_x_label.toString())
				.onChange(async (value) => {
					this.plugin.settings.default_x_label = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default y label')
			.setDesc('Default label for the y-axis of the graph')
			.addText(text => text
				.setPlaceholder('Example:  Velocity (m/s)')
				.setValue(this.plugin.settings.default_y_label.toString())
				.onChange(async (value) => {
					this.plugin.settings.default_y_label = value;
					await this.plugin.saveSettings();
				}));
		
	  	containerEl.createEl('h4', { text: '🎨 Graph appearance' });

		new Setting(containerEl)
			.setName('Dark mode')
			.setDesc('If enabled, the graph will generate with a transparent background and white text and lines')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.dark_mode)
				.onChange(async (value) => {
					this.plugin.settings.dark_mode = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Graph color')
			.setDesc('Color for the graph line')
			.addColorPicker(color => color
				.setValue(this.plugin.settings.color)
				.onChange(async (value) => {
					this.plugin.settings.color = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Line width')
			.setDesc('Width of the graph line')
			.addText(text => text
				.setPlaceholder('Example: 2')
				.setValue(this.plugin.settings.line_width.toString())
				.onChange(async (value) => {
					this.plugin.settings.line_width = parseFloat(value);
					await this.plugin.saveSettings();
				}));
		
				containerEl.createEl('h6', { text: '💗 Thanks for using my plugin! Any suggestion, contribution, or bug report will be very apretiated!' });
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
 * Creates the path for the plot image
 * @param basePath Vault path
 * @param source Source code of the plot
 * @returns Path to the plot image
 */
async function getPath(source: string, params: { [key: string]: string }, settings: JuliaPlotsSettings): Promise<string> {

    const dir = "juliaplots";

    if (!(await this.app.vault.adapter.exists(dir))) {
        await this.app.vault.createFolder(dir);
    }

    const func = (params['f(x)'] ?? settings.default_function).toString();
    const xmin = (params['xmin'] ?? settings.default_xmin).toString();
    const xmax = (params['xmax'] ?? settings.default_xmax).toString();
    const numPoints = (params['num_points'] ?? settings.default_num_points).toString();

    const hashInput = [func, xmin, xmax, numPoints].join('|');
    const hash = Buffer.from(hashInput).toString("base64").slice(0,10);

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
    const juliaScriptPath = path.join(this.app.vault.adapter.getBasePath(), '.obsidian', 'plugins', 'juliaplots','juliaplots.jl');

	// Recieve the parameters or use default settings
    const func = params['f(x)'] ?? settings.default_function;
    const xmin = params['xmin'] ?? settings.default_xmin;
    const xmax = params['xmax'] ?? settings.default_xmax;
    const numPoints = params['num_points'] ?? settings.default_num_points;
	const x_label = params['x_label'] ?? settings.default_x_label;
 	const y_label = params['y_label'] ?? settings.default_y_label;
	const color = params['color'] ?? settings.color;
	const line_width = params['line_width'] ?? settings.line_width;
	const dark_mode = (params['dark_mode'] ?? settings.dark_mode).toString();
	const title = params['title'] ?? undefined;

	// Validate required parameters
    if(func === undefined || xmin === undefined || xmax === undefined || numPoints === undefined || !color === undefined || !line_width === undefined){
        throw new Error("Missing required parameters: function, xmin, xmax, num_points, color, or line_width");
    }

	// Create the arguments for the Julia script
	const args = [
		juliaScriptPath,
		func,
		String(xmin),
		String(xmax),
		String(numPoints),
		color,
		String(line_width),
		outputPath,
		x_label,
		y_label,
		String(dark_mode)
		
	];
	if (title){
		args.push(title);
	}

	// Spawn the Julia script with the arguments
    return  new Promise<void>((resolve, reject) => {
        const julia = spawn('julia', args);

        let stderr = '';
        julia.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        julia.on('close', (code) => {
            if (code === 0){
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

    let img = document.createElement('img');
    img.alt = 'Julia Plot';
    img.style.maxWidth = '100%';

    if (file instanceof TFile) {
        img.src = this.app.vault.getResourcePath(file);
    } else {
        img.src = relativePath;
    }

    el.appendChild(img);
}