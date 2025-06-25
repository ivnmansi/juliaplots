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
}

/* ---- Default settings ---- */
const DEFAULT_SETTINGS: JuliaPlotsSettings = {
	default_function: 'x^2',
	default_xmin: -10,
	default_xmax: 10,
	default_num_points: 100
}

/* ---- Plugin logic ---- */
export default class JuliaPLots extends Plugin {
	settings: JuliaPlotsSettings;

	/* ---- When the plugin loads ---- */
	async onload() {
		await this.loadSettings();

		/** Execute when codeblock */
		this.registerMarkdownCodeBlockProcessor("juliaplots", async (source, el, ctx) => {

			const params = parseParams(source);
			const outputPath = await getPath((this.app.vault.adapter as any).getBasePath(), source, params, this.settings);

			const loadingMsg = el.createEl("span", { text: "Generating Julia Plot..." });

			try {
				await generateJuliaPlot(params, outputPath, this.settings);
				loadingMsg.remove();
				insertGraph(el, outputPath);
			}
			catch(error){
				el.createEl("pre", {text: `Error generating plot: ${error}`});
			}
		});







		// ---- Left ribbon icon ----
		const ribbonIconEl = this.addRibbonIcon('dice', 'JuliaPlots', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
			// Perform additional things with the ribbon
		ribbonIconEl.addClass('julia-plots-ribbon-class');



		// Command (editor callback)
		// TODO: Create a command that generates a julia plot in the current editor
		this.addCommand({
			id: 'generate-julia-plot',
			name: 'Generate Julia Plot',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});



		/** PLUGIN CONFIGURATION TAB **/
		this.addSettingTab(new SampleSettingTab(this.app, this));
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

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: JuliaPLots;

	constructor(app: App, plugin: JuliaPLots) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

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
			.setDesc('Default number of points to plot on the graph (Notice that a higher number of points will result in a smoother graph, but maybe will take longer to generate)')
			.addText(text => text
				.setPlaceholder('Example: 100')
				.setValue(this.plugin.settings.default_num_points.toString())
				.onChange(async (value) => {
					this.plugin.settings.default_num_points = parseFloat(value);
					await this.plugin.saveSettings();
				}));
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
async function getPath(basePath: string, source: string, params: { [key: string]: string }, settings: JuliaPlotsSettings): Promise<string> {
    const dir = path.join(this.app.vault.adapter.getBasePath(), "juliaplots");
    await fs.mkdir(dir, { recursive: true });

    const func = (params['function'] ?? settings.default_function).toString();
    const xmin = (params['xmin'] ?? settings.default_xmin).toString();
    const xmax = (params['xmax'] ?? settings.default_xmax).toString();
    const numPoints = (params['num_points'] ?? settings.default_num_points).toString();

    const hashInput = [func, xmin, xmax, numPoints].join('|');
    const hash = Buffer.from(hashInput).toString("base64").slice(0,10);

    return path.join(dir, `plot-${hash}.png`);
}

async function generateJuliaPlot(params : {[key:string]:string }, outputPath: string, settings: JuliaPlotsSettings){
    const juliaScriptPath = path.join(this.app.vault.adapter.getBasePath(), '.obsidian', 'plugins', 'juliaplots','juliaplots.jl');

    const func = params['function'] ?? settings.default_function;
    const xmin = params['xmin'] ?? settings.default_xmin;
    const xmax = params['xmax'] ?? settings.default_xmax;
    const numPoints = params['num_points'] ?? settings.default_num_points;

    if(func === undefined || xmin === undefined || xmax === undefined || numPoints === undefined){
        throw new Error("Missing required parameters: function, xmin, xmax, num_points");
    }

    return  new Promise<void>((resolve, reject) => {
        const julia = spawn('julia', [
            juliaScriptPath,
            func,
            String(xmin),
            String(xmax),
            String(numPoints),
            outputPath
        ]);

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