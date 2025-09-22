using Plots
gr()

"""
    parse_args(args)
    Parses command line arguments in the format "key=value" and returns a dictionary.
"""
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

"""
    main()
    Main function of the script
"""
function main()
    # Check if enough arguments are provided
    if length(ARGS) < 1
        println("Not enough arguments provided.")
        exit(1)
    end

    # Parse the command line arguments
    args = parse_args(ARGS)

    # Validate that at least one function is provided
    if !any(endswith(k, "(x)") || endswith(k, "(x,y)") for k in keys(args))
        println("No functions provided. Use f(x)=... or g(x,y)=...")
        exit(1)
    end

    # Find all 2D functions. Any key that ends with '(x)' is considered a 2D function
    # Also extract the color for each function if provided
    f2d_dict = Dict{String, Function}()
    color_dict = Dict{String, String}()
    label_dict = Dict{String, String}()
    for(k,v) in args
        if endswith(k,"(x)")
            parts = split(v, ",")
            equation = strip(parts[1])
            f2d_dict[k] = eval(Meta.parse("x -> $equation"))
            color_dict[k] = get(args, "color", "blue")
            if length(parts) > 1
                color_value = strip(parts[2])
                color_dict[k] = isempty(color_value) ? color_dict[k] : color_value
            end

            label_dict[k] = split(v, ",")[1]
            if length(parts) > 2
                label_value = strip(parts[3])
                label_dict[k] = isempty(label_value) ? label_dict[k] : label_value
            end
        end
    end

    # Find all 3D functions. Any key that ends with '(x,y)' is considered a 3D function
    f3d_dict = Dict{String, Function}()
    for(k,v) in args
        if endswith(k,"(x,y)")
            parts = split(v,",")
            equation = strip(parts[1])
            f3d_dict[k] = eval(Meta.parse("function(x,y) $equation end"))
            color_dict[k] = get(args, "color", "blue")
            if length(parts) > 1
                color_value = strip(parts[2])
                color_dict[k] = isempty(color_value) ? color_dict[k] : color_value
            end

            label_dict[k] = split(v, ",")[1]
            if length(parts) > 2
                label_value = strip(parts[3])
                label_dict[k] = isempty(label_value) ? label_dict[k] : label_value
            end
        end
    end

    # Verify if there's not 2D and 3D functions at the same time
    if !isempty(f2d_dict) && !isempty(f3d_dict)
        println("Cannot plot both 2D and 3D functions at the same time.")
        exit(1)
    end


    # Recieve the parameters for the plot
    xmin = parse(Float64, get(args, "xmin", "-10"))
    xmax = parse(Float64, get(args, "xmax", "10"))
    num_points = parse(Int, get(args, "num_points", "100"))
    line_width = parse(Float64, get(args, "line_width", "2.0"))
    output_path = get(args, "output_path", "if_you_see_this_there_was_an_error_somehow.png")
    x_label = get(args, "x_label", "x")
    y_label = get(args, "y_label", "y")
    dark_mode = get(args, "dark_mode", "false") == "true"
    scatter_color = get(args, "scatter_color", "blue")
    title= get(args, "title", "Plot")

    # Parameters for the 2D plot
    if !isempty(f2d_dict)
        plot_title = join(["$k = $(split(args[k],",")[1])" for k in keys(f2d_dict)], ", ")
        title = get(args, "title", plot_title)
    end

    # Parameters for the 3D plot
    if !isempty(f3d_dict)
        z_label = get(args, "z_label", "z")
        plot_title = join(["$k = $(split(args[k],",")[1])" for k in keys(f3d_dict)], ", ")
        title = get(args, "title", plot_title)
        ymin = parse(Float64, get(args, "ymin", "-10"))
        ymax = parse(Float64, get(args, "ymax", "10"))
    end

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
        guidefont = font(10, :black)
        grid_color = :black
        legend_color = :black
        fg_color = :black
        fg_color_axis = :black
        title_font = font(14, :black)
    end

    # SET THE PLOTS

    # Set the x values
    x = range(xmin, xmax, length=num_points)

    # If 3D functions
    if !isempty(f3d_dict)
        # Set the y values
        y = range(ymin, ymax, length=num_points)

        # Create plot for the 3D plot
        plt = plot(
            title=title,
            xlabel=x_label,
            ylabel=y_label,
            zlabel=z_label,
            aspect_ratio=:equal,
            background_color=background_color,
            tickfont=tickfont,
            guidefont=guidefont,
            grid_color=grid_color,
            legend_color=legend_color,
            fg_color=fg_color,
            fg_color_axis=fg_color_axis,
            title_font=title_font,
            grid=true,
            colorbar=false
        )

        # Iterate over each 3D function
        for (name, f) in f3d_dict
            # Set the z values and validate they are on the real domain
            # Initialize a matrix to store the z values
            z = zeros(Float64, length(x), length(y))
            for (i, xi) in enumerate(x)
                for (j, yi) in enumerate(y)
                    try
                        val = Base.invokelatest(f, xi, yi)
                        if isnan(val) || isinf(val) || isa(val, Complex)
                            z[i, j] = NaN
                        elseif abs(val) > 1e6
                            z[i, j] = sign(val) * 1e6
                        else
                            z[i, j] = val
                        end
                    catch e
                        z[i, j] = NaN
                    end
                end
            end

            # Draw the surface plot and add parameters
            surface!(plt, collect(x), collect(y), z,
                label="woops",
                color=color_dict[name],
                linewidth=0,
                fillalpha=0.8,
            )
        end

    # If 2D functions
    else
        # Create plot for the 2D plot
        plt = plot(
            title=title,
            xlabel=x_label,
            ylabel=y_label,
            grid=true,
            background_color=background_color,
            tickfont=tickfont,
            guidefont=guidefont,
            grid_color=grid_color,
            legend_color=legend_color,
            fg_color=fg_color,
            fg_color_axis=fg_color_axis,
            title_font=title_font,
        )
        # Iterate over each 2D function
        for (name, f) in f2d_dict
            y = []
            # Calculate the y values for the 2D function
            # Use try-catch to handle domain errors
            for xi in x
                try
                    val = Base.invokelatest(f, xi)
                    if isnan(val) || isinf(val) || isa(val, Complex)
                        push!(y, NaN)
                    else
                        push!(y, val)
                    end
                catch e
                    # If an error occurs, push NaN to y
                    push!(y, NaN)
                end
            end
            # Draw
            plot!(plt,
                x, y,
                label=label_dict[name],
                color=color_dict[name],
                linewidth=line_width
            )
        end
    end

    # Scatter points (Just for 2D for now)
    if haskey(args, "scatter") && isempty(f3d_dict)
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

    # Save the plot
    try
        savefig(plt, output_path)
    catch error
        println("Error saving figure: ", error)
    end
end

main()
