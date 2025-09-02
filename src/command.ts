import {App,Editor, MarkdownView, Modal, Plugin, PluginSettingTab, Setting} from 'obsidian';

export class JuliaPlotsModal extends Modal {
    onSubmit: (params: { [key: string]: string}) => void;

    constructor(app: App, onSubmit: (params: { [key: string]: string}) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen(){
        const {contentEl} = this;
        contentEl.empty();
        contentEl.createEl("h2", {text: "📈 Insert JuliaPlots quick graph"});
        
        const fields: { [key: string]: HTMLInputElement | HTMLTextAreaElement } = {};

        const params = [
            { key: "function", label: "Functions", placeholder: "e.g. f(x)=x^2" },
            { key: "scatter", label: "Scatter Points", placeholder: "e.g. 1,2 ; 3,4,red,I'm a point!" },
            { key: "title", label: "Title", placeholder: "My Graph" },
        ];

        for(const param of params){
               if(param.key === "function" || param.key === "scatter"){
                    new Setting(contentEl)
                    .setName(param.label)
                    .addTextArea(text => {
                        text.setPlaceholder(param.placeholder)
                            .setValue("")
                            .onChange(value => {
                                fields[param.key].value = value;
                            });
                        fields[param.key] = text.inputEl;
                    });
                }
                else{
                    new Setting(contentEl)
                    .setName(param.label)
                    .addText(text => {
                    text.setPlaceholder(param.placeholder)
                        .setValue("")
                        .onChange(value => {
                            fields[param.key].value = value;
                        });
                    fields[param.key] = text.inputEl;
                });
                }
        }

        const submitButton = contentEl.createEl("button", {text: "Insert graph"});
        submitButton.onclick = () => {
            const values: { [key: string]: string } = {};
            for(const key in fields) {
                values[key] = fields[key].value;
            }
            this.onSubmit(values);
            this.close();
        }
    }
}

