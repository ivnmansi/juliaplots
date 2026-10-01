import { Editor, Plugin } from "obsidian";

import { JuliaPlotsModal } from "./command";
import { ensureJuliaScriptExists, renderJuliaPlotBlock } from "./plot";
import {
	DEFAULT_SETTINGS,
	JuliaPlotsSettings,
	JuliaPlotsSettingTab,
} from "./settings";

export default class JuliaPlots extends Plugin {
	settings: JuliaPlotsSettings;

	async onload() {
		await this.loadSettings();
		await ensureJuliaScriptExists(this.app);

		/**
		 * JuliaPlots code block processor
		 * This will be called whenever a code block with the language "juliaplots" is found in a note.
		 * It will generate the plot and insert it into the note.
		 */
		this.registerMarkdownCodeBlockProcessor(
			"juliaplots",
			async (source, el, _ctx) => {
				await renderJuliaPlotBlock(this.app, this.settings, source, el);
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
