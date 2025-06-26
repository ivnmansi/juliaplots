using Plots
gr()

function main()
    if length(ARGS) < 9
        println("Usage: julia juliaplots.jl <function> <xmin> <xmax> <num_points> <color> <line_width> <output_path> <x_label> <y_label> <title(optional)>")
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
    title = length(ARGS) >= 10 ? ARGS[10] : "$func_str from $xmin to $xmax"

    # Define the function and parameters
    f = eval(Meta.parse("x -> $func_str"))

    x = range(xmin, xmax, length=num_points)
    y = [Base.invokelatest(f, xi) for xi in x]

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
        guidefont=font(12),
        tickfont=font(6)
    )

    # Save the plot to the specified output path
    try
        savefig(output_path)
    catch error
        println("Error saving figure: ", error)
    end
end

main()
