using Plots
gr()

function main()
    if length(ARGS) < 5
        println("Usage: julia juliaplots.jl <function> <xmin> <xmax> <num_points> <output_path>")
        return
    end

    # Recieve command line arguments
    func_str = ARGS[1]
    xmin = parse(Float64, ARGS[2])
    xmax = parse(Float64, ARGS[3])
    num_points = parse(Int, ARGS[4])
    output_path = ARGS[5]

    # Define the function and parameters
    f = eval(Meta.parse("x -> $func_str"))

    x = range(xmin, xmax, length=num_points)
    y = [Base.invokelatest(f, xi) for xi in x]

    plot(x, y, label=func_str, title="$func_str from $xmin to $xmax",
         xlabel="x", ylabel="f(x)", grid=true)
    try
        savefig(output_path)
    catch error
        println("Error saving figure: ", error)
    end
end

main()
