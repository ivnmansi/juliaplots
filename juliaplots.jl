using Plots
gr()

function main()
    if length(ARGS) < 9
        println("Usage: julia juliaplots.jl <function> <xmin> <xmax> <num_points> <color> <line_width> <output_path> <x_label> <y_label> <dark_mode> <title(optional)>")
        return
    end

    # Recieve command line arguments
    func_str = ARGS[1]
    xmin = parse(Float64, ARGS[2])
    xmax = parse(Float64, ARGS[3])
    num_points = parse(Int, ARGS[4])
    color = ARGS[5]
    line_width = parse(Float64, ARGS[6])
    output_path = ARGS[7]
    x_label = ARGS[8]
    y_label = ARGS[9]
    dark_mode = ARGS[10] == "true" 
    title = length(ARGS) >= 11 ? ARGS[11] : "$func_str from $xmin to $xmax"

    # Define the function and parameters
    f = eval(Meta.parse("x -> $func_str"))

    x = range(xmin, xmax, length=num_points)
    y = [Base.invokelatest(f, xi) for xi in x]

    # Set plot colors based on theme mode
    if dark_mode
        background_color = :transparent
        tickfont = font(6, :white)
        guidefont = font(8, :white)
        grid_color = :white
        legend_color = :white
        title_color = :white
        fg_color = :white
        fg_color_axis = :white
    else
        background_color = :white
        tickfont = font(6, :black)
        guidefont = font(8, :black)
        grid_color = :black
        legend_color = :black
        title_color = :black
        fg_color = :black
        fg_color_axis = :black
    end


    # Create the plot
    plot(
        x, y,
        label=func_str,
        title=title,
        xlabel=x_label,
        ylabel=y_label,
        grid=true,
        color=color,
        lw=line_width,

        tickfont=tickfont,
        guidefont=guidefont,
        background_color=background_color,
        grid_color=grid_color,
        legend_color=legend_color,
        title_color=title_color,
        fg_color=fg_color,
        fg_color_axis=fg_color_axis,
    )

    # Save the plot to the specified output path
    try
        savefig(output_path)
    catch error
        println("Error saving figure: ", error)
    end
end

main()
