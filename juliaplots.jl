using Plots
gr()

# Parse the parameters from command line
function parse_args(args)
    d = Dict{String, String}()
    for i in args
        if occursin('=',i)
            k,v = split(i, '=')
            d[k] = v
        end
    end
    return d
 end

 # Main function
function main()

    # Check if enough arguments are provided
    if length(ARGS) < 10
        println("ERROR: Not enough arguments provided.")
        return
    end

    # Parse the command line arguments
    args = parse_args(ARGS)

    # Find all functions. Any key that end with '(x)' is considered a function
    # Also extract the color for each function if provided
    f_dict = Dict{String, Function}()
    color_dict = Dict{String, String}()
    for(k,v) in args
        if endswith(k,"(x)")
            parts = split(v, ",")
            equation = strip(parts[1])
            f_dict[k] = eval(Meta.parse("x -> $equation"))
            if length(parts) > 1
                color_dict[k] = strip(parts[2])
            else
                color_dict[k] = get(args, "color", "blue")
            end
        end
    end

    # Recieve the other parameters
    xmin = parse(Float64, get(args, "xmin", "-10"))
    xmax = parse(Float64, get(args, "xmax", "10"))
    num_points = parse(Int, get(args, "num_points", "100"))
    line_width = parse(Float64, get(args, "line_width", "2.0"))
    output_path = get(args, "output_path", "if_you_see_this_there_was_an_error_somehow.png")
    x_label = get(args, "x_label", "x")
    y_label = get(args, "y_label", "y")
    dark_mode = get(args, "dark_mode", "false") == "true"
    scatter_color = get(args, "scatter_color", "blue")
    plot_title = join(["$k = $(split(args[k],",")[1])" for k in keys(f_dict)], ", ")
    title = get(args, "title", plot_title)

    # Set plot colors based on theme mode
    if dark_mode
        background_color = :transparent
        tickfont = font(8, :white)
        guidefont = font(8, :white)
        grid_color = :white
        legend_color = :white
        fg_color = :white
        fg_color_axis = :white
        title_font = font(14, :white)
    else
        background_color = :white
        tickfont = font(8, :black)
        guidefont = font(8, :black)
        grid_color = :black
        legend_color = :black
        fg_color = :black
        fg_color_axis = :black
        title_font = font(14, :black)
    end

    # Set the base plot
    plt = plot(
        title=title,
        xlabel=x_label,
        ylabel=y_label,
        grid=true,
        tickfont=tickfont,
        guidefont=guidefont,
        background_color=background_color,
        gridcolor=grid_color,
        legendfont=tickfont,
        fg_color_axis=fg_color_axis,
        grid_color=grid_color,
        legend_color=legend_color,
        titlefont = title_font,
        fg_color=fg_color,
    )

    x = range(xmin, xmax, length=num_points)

    # Draw each function
    for (name, f) in f_dict
        y = [Base.invokelatest(f, xi) for xi in range(xmin, xmax, length=num_points)]
        plot!(plt,
            x, y,
            label=split(args[name],",")[1],
            lw=line_width,
            color = color_dict[name]
        )
    end

    # If there are scatter points, draw them too
    if haskey(args, "scatter")
        points = split(args["scatter"], ";")
        for pt in points
            coords = split(pt, ",")
            if length(coords) >= 2
                xp = parse(Float64, coords[1])
                yp = parse(Float64, coords[2])
                color = (length(coords) > 2) ? coords[3] : scatter_color
                label = (length(coords) > 3) ? coords[4] : "($xp, $yp)"
                scatter!(plt, [xp], [yp], label=label, color=color)
            else
                println("Invalid scatter point format: $pt")
            end
        end
    end


    # Save the plot to the specified output path
    try
        savefig(plt,output_path)
    catch error
        println("Error saving figure: ", error)
    end
end

main()
