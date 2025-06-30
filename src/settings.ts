import { App, PluginSettingTab, Setting } from 'obsidian';
import JuliaPlots from './main';

/* ---- Plugin settings ---- */
export interface JuliaPlotsSettings {
	xmin: number;
	xmax: number;
	num_points: number;
	x_label: string;
	y_label: string;

	ymin: number;
	ymax: number;
	z_label: string;

	dark_mode: boolean;
	color: string;
	line_width: number;
    scatter_color: string;
}

/* ---- Default settings ---- */
export const DEFAULT_SETTINGS: JuliaPlotsSettings = {
	xmin: -10,
	xmax: 10,
	num_points: 100,
	x_label: 'x',
 	y_label: 'y',

	ymin: -10,
	ymax: 10,
	z_label: 'z',

	dark_mode: false,
	color: '#1E90FF',
	line_width: 2,
    scatter_color: '#1E90FF',
}

/**
 * Settings tab
 */
export class JuliaPlotsSettingTab extends PluginSettingTab {
	plugin: JuliaPlots;

	constructor(app: App, plugin: JuliaPlots) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h3', { text: '📐 Default parameters' });


		new Setting(containerEl)
			.setName('Default xmin')
			.setDesc('Default minimum x value for the plot')
			.addText(text => text
				.setPlaceholder('Example: -10')
				.setValue(this.plugin.settings.xmin.toString())
				.onChange(async (value) => {
					this.plugin.settings.xmin = parseFloat(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default xmax')
			.setDesc('Default maximum x value for the plot')
			.addText(text => text
				.setPlaceholder('Example: 10')
				.setValue(this.plugin.settings.xmax.toString())
				.onChange(async (value) => {
					this.plugin.settings.xmax = parseFloat(value);
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Default number of points')
			.setDesc('Default number of points to plot on the graph (⚠️ Notice that a higher number of points will result in a smoother graph, but maybe will take longer to generate)')
			.addText(text => text
				.setPlaceholder('Example: 100')
				.setValue(this.plugin.settings.num_points.toString())
				.onChange(async (value) => {
					this.plugin.settings.num_points = parseFloat(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default x label')
			.setDesc('Default label for the x-axis of the graph')
			.addText(text => text
				.setPlaceholder('Example: Time (s)')
				.setValue(this.plugin.settings.x_label.toString())
				.onChange(async (value) => {
					this.plugin.settings.x_label = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default y label')
			.setDesc('Default label for the y-axis of the graph')
			.addText(text => text
				.setPlaceholder('Example:  Velocity (m/s)')
				.setValue(this.plugin.settings.y_label.toString())
				.onChange(async (value) => {
					this.plugin.settings.y_label = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h5', { text: '🏈 3D Functions' });

		new Setting(containerEl)
			.setName('Default ymin')
			.setDesc('Default minimum y value for the 3D plot')
			.addText(text => text
				.setPlaceholder('Example:  -10')
				.setValue(this.plugin.settings.ymin.toString())
				.onChange(async (value) => {
					this.plugin.settings.ymin = parseFloat(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default ymax')
			.setDesc('Default maximum y value for the 3D plot')
			.addText(text => text
				.setPlaceholder('Example:  10')
				.setValue(this.plugin.settings.ymax.toString())
				.onChange(async (value) => {
					this.plugin.settings.ymax = parseFloat(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default z label')
			.setDesc('Default label for the z-axis of the 3D graph')
			.addText(text => text
				.setPlaceholder('Example:  Height (m)')
				.setValue(this.plugin.settings.z_label.toString())
				.onChange(async (value) => {
					this.plugin.settings.z_label = value;
					await this.plugin.saveSettings();
				}));

		
	  	containerEl.createEl('h3', { text: '🎨 Graph appearance' });

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
			.setDesc('Default color for the graph line')
			.addColorPicker(color => color
				.setValue(this.plugin.settings.color)
				.onChange(async (value) => {
					this.plugin.settings.color = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Line width')
			.setDesc('Default width of the graph line')
			.addText(text => text
				.setPlaceholder('Example: 2')
				.setValue(this.plugin.settings.line_width.toString())
				.onChange(async (value) => {
					this.plugin.settings.line_width = parseFloat(value);
					await this.plugin.saveSettings();
				}));
        
        new Setting(containerEl)
			.setName('Scatter color')
			.setDesc('Default color for the scatter points')
			.addColorPicker(color => color
				.setValue(this.plugin.settings.scatter_color)
				.onChange(async (value) => {
					this.plugin.settings.scatter_color = value;
					await this.plugin.saveSettings();
				}));
		
		const thanksEl = containerEl.createEl('h6');
        thanksEl.innerHTML = '💗 Thanks for using my plugin! Any suggestion, contribution, or bug report will be very appreciated! <a href="https://github.com/ivnmansi/juliaplots" target="_blank">GitHub Repository</a>';
	}
}