/**
 * A D3 visulization explaining why certain features and samples
 * of a dataset are attracted to certain locations/contexts
 */
class ContextMap {

	constructor(container="", element_type="places") {
		// D3 Projection
		this.projection = d3.geo.albersUsa()
		  .translate([800, 300]) // translate to center of screen
		  .scale([1300]) // scale things down so see entire US

		// The element to append our svg to  
		this.container = container === "" ? "body" : container

		// Width and height of map
		this.width = 300
		this.height = 500
		this.scale0 = (this.width - 1) / 2 / Math.PI


		// Type of markers to show
		this.element_type = element_type
	}

	// The data visaulization is going to be built in this order
	/**
	 * buildMap -> addContextRings -> addContext -> addContextLines() -> addMarkers()
	 */

	/**
	 * Build the map outline of the pacific coast
	 *
	 */
	buildMap() {
		// Load GeoJSON data and merge with states data
		d3.json(
			"data/west-coast.json", 
			(json) => {

				// Define path generator
				var path = d3.geo.path() // path generator that will convert GeoJSON to SVG paths
				  .projection(this.projection) // tell path generator to use albersUsa projection

				// Create a zoom feature to allow zooming in on the map
				var zoom = d3.behavior.zoom()
				  .translate([510, 300])
				  .scale(1200)
				  .scaleExtent([1000, 10000])
				
				// Zoom function to resposition and scale all the elements 
				// as the user zooms in 
				zoom.on(
					"zoom", 
					() => {
						// Projection is used to recalculate the new position of the elements
						// as the user zoom/pans on the map 
						let projection = this.projection
						let container = this.container

						projection
				      .translate(zoom.translate())
				      .scale(zoom.scale())

				    let _g = d3.select(container).select('svg').select('g')

						_g.selectAll("path")
						  .attr("d", path)

						// Reposition the element markers
						_g.selectAll("circle.marker")
							.attr("cx", function(d) {
								return projection([d.lon, d.lat])[0]
							})
							.attr("cy", function(d) {
								return projection([d.lon, d.lat])[1]
							})

						// Reposition the context dots
						_g.selectAll("circle.context")
							.attr("cx", function(d) {
								return projection([d.lon, d.lat])[0]
							})
							.attr("cy", function(d) {
								return projection([d.lon, d.lat])[1]
							})

						// Reposition the lines connecting the context dots
						_g.selectAll('line')
							.attr("x1", (d) => {
								return projection([d.start.lon, d.start.lat])[0]
							})
							.attr("y1", (d) => {
								return projection([d.start.lon, d.start.lat])[1]
							})
							.attr("x2", (d) => {
								return projection([d.end.lon, d.end.lat])[0]
							})
							.attr("y2", (d) => {
								return projection([d.end.lon, d.end.lat])[1]
							})

						// Reposition and scale the ring size as zoom increases
						// or decreases the scale
						let nested_rings = ['ring1', 'ring2', 'ring3']
						for (var i in nested_rings) {
							let nested_ring = nested_rings[i]


							if (!_g.select(`circle.${nested_ring}`).empty()) {

								let r = _g.select(`circle.${nested_ring}`).attr('data-r')

								_g.selectAll(`circle.${nested_ring}`)
									.attr("cx", function(d) {
										return projection([d.lon, d.lat])[0]
									})
									.attr("cy", function(d) {
										return projection([d.lon, d.lat])[1]
									})
									.attr("r", function(d) {
										// Scaling formula to increase context rings size 
										// as it zooms in
										let new_r = (zoom.scale()/1300)*r
										return new_r
									})
							}

						}
				 	}
				 )

			  // Create SVG element to hold every element of the data visualization
			  var svg = d3.select(this.container)
			    .append("svg")
			    .attr("width", this.width)
			    .attr("height", this.height)

			  // Create g to append map and other elements to it
				var g = svg.append("g")
					.attr("class", "map-container")

				// Allow svg to zoom in and out on the map
				svg
					.call(zoom)
					.call(zoom.event)

			  // Append Div for tooltip to SVG
			  var div = d3.select(this.container)
			    .append("div")
			    .attr("class", "tooltip")
			    .style("opacity", 0)

		    // Bind the data to the SVG and create one path per GeoJSON feature
		    g.selectAll("path")
		      .data(json.features)
		      .enter()
		      .append("path")
		      .attr("d", path)
		      .style("stroke", "#000")
		      .style("stroke-width", "1")
		      .style("fill", "#fff")

		    // Add context rings after the map has been built
		    this.addContextRings()
		})
	}

	// Plot black dots onto the map representing the contexts
	addContext() {
		var g = d3.select(this.container).select('svg').select('g')

	  d3.json(
	  	"data/context.json", 
	  	(data) => {
	  		let projection = this.projection
	  		let div = d3.select(this.container).select('.tooltip')

				// Add black dots to the map
				let circles = g.selectAll("circle.context")
				  .data(data)
				  .enter()
				  .append("circle")
				  .attr("class","context")
				  .attr("cx", function(d) {
				    return projection([d.lon, d.lat])[0]
				  })
				  .attr("cy", function(d) {
				    return projection([d.lon, d.lat])[1]
				  })
				  .attr("r", function(d) {
				    return 15
				  })
				  .style("fill", "rgba(0, 0, 0, 0.7)")
				  .style("stroke", "#fff")

				  // Modification of custom tooltip code provided by Malcolm Maclean, "D3 Tips and Tricks"
				  // http://www.d3noob.org/2013/01/adding-tooltips-to-d3js-graph.html
				  .on("mouseover", function(d) {
				    div.transition()
				      .duration(200)
				      .style("opacity", .9)
				    div.text(d.area)
				      .style("left", (d3.event.pageX) + "px")
				      .style("top", (d3.event.pageY - 28) + "px")
				  })

				  // fade out tooltip on mouse out
				  .on("mouseout", function(d) {
				    div.transition()
				      .duration(500)
				      .style("opacity", 0)
				  })

				this.addContextLines()
	  	}
	  )
	}

	// Add lines connecting between context dots 
	addContextLines() {
		var g = d3.select(this.container).select('svg').select('g')

		d3.json(
			"data/combo.json",
			(data) => {
	  		let projection = this.projection
	  		let div = d3.select(this.container).select('.tooltip')

	  		let line = g.selectAll('line')
	  			.data(data)
	  			.enter()
	  			.append("line")
	  			.attr("x1", (d) => {
	  				return projection([d.start.lon, d.start.lat])[0]
	  			})
	  			.attr("y1", (d) => {
	  				return projection([d.start.lon, d.start.lat])[1]
	  			})
	  			.attr("x2", (d) => {
	  				return projection([d.end.lon, d.end.lat])[0]
	  			})
	  			.attr("y2", (d) => {
	  				return projection([d.end.lon, d.end.lat])[1]
	  			})
	  			.attr("stroke-width", 2)
	  			.attr("stroke", "#000")

	  		this.addMarkers()
			}
		)
	}

	// Plot rings around the black context dots to show big of pull 
	// the context has toward certain elements. 
	addContextRings() {
		var g = d3.select(this.container).select('svg').select('g')

	  d3.json(
	  	"data/context.json", 
	  	(data) => {
	  		let projection = this.projection
	  		let div = d3.select(this.container).select('.tooltip')

	  		let ring_style_arr = [[25, 0.6, 'ring1'], [35, 0.4, 'ring2'], [45, 0.2, 'ring3']]

	  		// Add nested rings for each context that exists
	  		for (var i in ring_style_arr) {
					let [radius, opacity, classname] = ring_style_arr[i]

					let circles = g.selectAll(`circle.${classname}`)
					  .data(data)
					  .enter()
					  .append("circle")
					  .attr("class", `${classname} ring`)
					  .attr("cx", function(d) {
					    return projection([d.lon, d.lat])[0]
					  })
					  .attr("cy", function(d) {
					    return projection([d.lon, d.lat])[1]
					  })
					  .attr("data-r", function(d) {
					  	return radius
					  })
					  .attr("r", function(d) {
					    return radius
					  })
					  .style("fill", function(d) {
					  	return d.color
					  })
					  .style("stroke", "#000")
					  .style("opacity", opacity)
	  		}

	  		this.addContext()
	  	}
	  )
	}

	// Plot markers onto the map color coded to show which context
	// they are being attracted to. 
	addMarkers(marker_type="places") {
		var g = d3.select(this.container).select('svg').select('g')

		let url = this.element_type === "people" ?  "data/people.json" : "data/places.json"

	  d3.json(
	  	url, 
	  	(data) => {
	  		let projection = this.projection
	  		let div = d3.select(this.container).select('.tooltip')

				let circles = g.selectAll("circle.marker")
				  .data(data)
				  .enter()
				  .append("circle")
				  .attr("class","marker")
				  .attr("cx", function(d) {
				    return projection([d.lon, d.lat])[0]
				  })
				  .attr("cy", function(d) {
				    return projection([d.lon, d.lat])[1]
				  })
				  .attr("r", 8)
				  .style("fill", function(d) {
				  	return d.color
				  })
				  .style("stroke", "#000")

				  // Modification of custom tooltip code provided by Malcolm Maclean, "D3 Tips and Tricks"
				  // http://www.d3noob.org/2013/01/adding-tooltips-to-d3js-graph.html
				  .on("mouseover", function(d) {
				    div.transition()
				      .duration(200)
				      .style("opacity", .9)

				    let string = `<img class='avatar' src=${d.image}/><p>${d.name}</p>`

				    div.html(string)
				      .style("left", (d3.event.pageX) + "px")
				      .style("top", (d3.event.pageY - 28) + "px")
				  })

				  // fade out tooltip on mouse out
				  .on("mouseout", function(d) {
				    div.transition()
				      .duration(500)
				      .style("opacity", 0)
				  })

	  	}
	  )

	}
}