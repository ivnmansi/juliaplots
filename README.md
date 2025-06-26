<center>
  <h1>JuliaPlots</h1>

  <img src="https://img.shields.io/badge/release-v0.2-blue"> <img src="https://img.shields.io/badge/Obsidian-483699?style=flat&logo=Obsidian&logoColor=white"> <img src="https://img.shields.io/badge/Julia-9558B2?style=flat&logo=julia&logoColor=white">
  <p>Generate Julia plots function graphs in Obsidian easily!</p>

</center>



## 🌟 Features
- Easily generate function plots **directly in Obsidian** using Julia, without having to use the language sintax
- **Straightforward** setup
- Customizable **default parameters**
- **Graph customization** (Graph title and line color and width)


## 📋 Demo

![Demo gif](demo/demo.gif)

## 🖥️ Installation
> ⚠️ This plugin just works for the **desktop** Obsidian app

1. Install [Julia](https://julialang.org/) into your system, and install the [Plots](https://docs.juliaplots.org/stable/) package on it.

2. Download `main.js`, `juliaplots.jl` and `manifest.json` from the [latest release](https://github.com/ivnmansi/juliaplots/releases).

3. Place those files in your Obsidian plugins folder:

   ```
   .obsidian/plugins/juliaplots
   ```

4. Reload or restart Obsidian and enable the plugin in Settings → Community plugins.

## ⚡ Usage
   <pre>
   ```juliaplots
   function=cos(x)+1
   title=my graph
   xmin=-10
   xmax=25
   num_points=100
   color=rgb(0,255,0)
   line_width=2
   ```
   </pre>

   - `function`: Function wanted to plot
   - `title`: Title of the graph. Latex sintax is allowed (for example `$\cos x$`)
   - `xmin`: Start of the x range that will be plotted
   - `xmax`: End of the x range that will be plotted
   - `num_points`: Number of points of the function that will be plotted on the range (*warning: a small number will result in a non-smooth graph*)
   - `color`: Color of the line of the graph. It can be specified in rgb, hex, or in natural language *(blue, red)*
   - `line_width`: Width of the line of the graph

   > ☑️ If any of these parameters is omitted, the configured default value will be used! You can change them on the plugin's settings tab

## ❗ Known issues
- 🕒 **Long waiting time:** The plugin can take a long time on generating the graph depending of the user. Still investigating this and if it can be mitigated
- ❓ **X and Y labels not showing up:** X and Y labels are cut from the image. It can be solved by increasing the margins, but when doing this the image is corrupted for some reason


## 🤝 Contributing
Feel free to open an issue or a pull request if you have suggestions, improvements, or bug reports. This plugin is in a very early development stage, every contribution is apreciated.