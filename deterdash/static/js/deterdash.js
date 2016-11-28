// All the deter node stats widget code is inside an anon func which we 
// call immediately. This encapsulates our widget code...

console.log('deterdash loaded.');

(function(window) {
    'use strict';

    var deterdash = window.deterdash || {};
    window.deterdash = deterdash;    // GTL this seems wrong.

    // deterdash.spawn_horizon_graph = function(divid, nodename, agent, unit) {
    //     console.log('spawn_horizon_graph called with: ', divid, nodename, agent, unit); 

    //     var margin = {top: 10, right: 10, bottom: 10, left: 23},
    //         width = 300,
    //         height = 200 - margin.top - margin.bottom;

    //     var context = cubism.context().step(1000).size(width);
    //     var horizon = context.horizon().height(height); 

    //     horizon.metric(get_node_data);

    //     d3.select("#" + divid).selectAll('.horizon').call(horizon.remove).remove();

    //     d3.select("#" + divid)
    //             .selectAll(".horizon")
    //             .data([nodename])
    //             .enter()
    //             .append("div")
    //             .attr("class", "horizon")
    //             .call(horizon);

    //     d3.select("#" + divid).selectAll('.axis').remove();

    //     d3.select("#" + divid)
    //         .append("div")
    //         .attr("class", "axis")
    //         .call(context.axis());
    // 
    //     function get_node_data(nodename) {
    //         console.log('getting data for nodename ' + nodename);
    //         return context.metric(function(start, stop, step, callback) {
    //             var values = [];
    //             var start = +start, stop = +stop;
    //             var url = window.location.origin + "/api/horizon_chart/json?";
    //             url += 'start=' + (start / 1000);
    //             url += '&stop=' + (stop / 1000);
    //             url += '&step=' + (step / 1000);
    //             url += '&node=' + nodename;
    //             url += '&metric=' + unit.data_key;
    //             url += '&agent=' + agent.agent;
    //             // console.log('api url: ' + url);
    //             d3.json(url, function(error, json) {
    //                 if (error) { 
    //                     console.log('error', error);
    //                     callback(error, []);
    //                 }
    //                 else if (! 'counts' in json) {
    //                     callback('bad json data: ' + json, []);
    //                 }
    //                 else {
    //                     values = json['counts'];
    //                     callback(null, values);
    //                 }
    //             });
    //         }, nodename);
    //     }
    // } // end of deterdash.spawn_horizon_graph

    deterdash.node_stats_panel = function(d3, divid, nodename) {
        console.log('node_stats_panel called for ' + nodename);

        // "private" variables protected by the closure of this function.
        var panel = d3.select(divid)
                            .append("div")
                                .attr("class", "col-lg-4 node_template")
                                .attr("id", nodename+"_panel")
                            .append("div")
                                .attr("class", "panel panel-default");

        var panel_header = panel.append("div").attr("class", "panel-heading")
        var panel_body_id = nodename + "_panel_body";
        var panel_body = panel.append("div")
                                .attr("class", "panel-body")
                                .attr("id", panel_body_id);
        var panel_footer = panel.append("div").attr("class", "panel-footer")
                                .attr("id", nodename+"_panel_footer");

        panel_footer.text(agent.display + ' route table');

        build_panel_header(panel_header, nodename);

        function build_panel_header(header, nodename) {
            // header.append("i").attr("class", "fa fa-bar-chart-o fa-fw");
            header.append("b").text("Node: " + nodename);

            var menu = header.append("div").attr("class", "dropdown pull-right");
            menu.append("div").attr("role", "menu").attr("data-toggle", "dropdown")
                              .attr("class", "btn btn-xs").attr("data-target", "#")
                              .text("Agents ").append("span").attr("class", "caret");
            var dropdown = menu.append("ul").attr("class", "dropdown-menu multi-level").attr("role", "menu");

            var agents_promise = new Promise(
                function(resolve, reject) {
                    d3.json(window.location.origin + '/api/' + nodename + '/agents', 
                        function(error, json) {
                            if (error) {
                               reject('error getting agent data for ' + nodename);
                               return;
                            }
                            if (json.status != 0) {
                                reject('bad response from server when reading agent data');
                                return;
                            }
                            console.log('got agents for ' + nodename + ':', json.agents);
                            resolve(json.agents);
                        }
                    );
                }
            );

            agents_promise.then(
                function(agents) {
                    // we have agents, so append the drop downs. The drop downs are multi-level
                    // menus, indexed by agent. Secondary drop downs are the agent's units.
                    var def_unit_set = false;
                    for (var ai=0; ai<agents.length; ai++) {
                        if (! agents[ai].hasOwnProperty('units')) {
                            // This agent nothing to plot/graph.
                            continue;
                        }
                        var agent_menu = dropdown.append("li").attr("class", "dropdown-submenu");
                        agent_menu.append("a").attr("href", "#").text(agents[ai].display);

                        var units_menu = agent_menu.append("ul").attr("class", "dropdown-menu");
                        for (var ui=0; ui<agents[ai].units.length; ui++) {
                            // use first agent and first unit as the default display.
                            if (!def_unit_set) {
                                unit_change(agents[ai], agents[ai].units[ui]);
                                def_unit_set = true;
                            }
                            units_menu.append("li").append("a").attr("href", "#")
                                       .text(agents[ai].units[ui].display)
                                       .on("click",  // closure around agent and unit
                                            function(a, u) {
                                                return function() {
                                                    console.log('menu clicked: ', a, u); 
                                                    unit_change(a, u);
                                                }
                                            }(agents[ai], agents[ai].units[ui])
                                        );
                        }
                    }
                },
                function(error) {
                    console.log('Error getting agent/unit info: ', error)
                }
            ).catch(
                function(reason) {
                    console.log('Error getting agents for ' + nodename + ': ' + reason);
                }
            );
        }

    }

    deterdash.node_table_panel = function(d3, divid, nodename, tablename) {
        console.log('node_table_panel called for ' + nodename + ' tablename: ' + tablename);

        // "private" variables protected by the closure of this function.
        var panel = d3.select(divid)
                            .append("div")
                                .attr("class", "col-lg-4 node_template")
                                .attr("id", nodename+"_panel")
                            .append("div")
                                .attr("class", "panel panel-default");

        var panel_header = panel.append("div").attr("class", "panel-heading")
        var panel_body_id = nodename + "_" + tablename + "_table";
        var panel_body = panel.append("div").attr("class", "panel-body");
        var panel_footer = panel.append("div").attr("class", "panel-footer")
                                .attr("id", nodename+"_panel_footer");

        panel_header.append("b").text("Node: " + nodename);

        var table_promise = new Promise(
            function(resolve, reject) {
                d3.json(window.location.origin + '/api/' + tablename + '/' + nodename, 
                    function(error, json) {
                        if (error) {
                           reject('error getting table data for ' + nodename);
                           return;
                        }
                        if (json.status != 0) {
                            reject('bad response from server when reading table data');
                            panel_body.html('No table data found.');
                            return;
                        }
                        console.log('got table data for ' + nodename);
                        console.log('data: ', json.table);
                        resolve(json.table);
                    }
                );
            }
        );

        table_promise.then(
            function(table_data) {
                console.log('resolving table of ' + table_data.length + ' rows');
                var table = panel_body.append("table")
                                        .attr("class", "table table-striped table-condensed");
                var theader = table.append("thead");
                var tbody = table.append("tbody");

                // add headers to the table.
                var cols = [];
                var tr = theader.append("tr");
                for (var key in table_data[0]) {
                    cols.push(key);
                    tr.append("td").append("b").html(key)
                }
                // for each row add the row's data to the column.
                for (var row in table_data) {
                    var trow = tbody.append("tr");
                    for (var col in cols) {
                        trow.append("td").html(table_data[row][cols[col]]); 
                    }
                }
            },
            function(error) {
                console.log('Error getting table data: ', error)
            }
        ).catch(
            function(reason) {
                console.log('Error getting ' + tablename + ' table data for ' + nodename + ': ' + reason);
            }
        );
    }

    deterdash.spawn_time_plot = function(divid, data_key, table, datatype) {
        var nodes = [];   // array of dict of node data.
        var chart_units = data_key; 
        var agent = table;

        var margin = {top: 20, right: 120, bottom: 50, left: 60},
            width = 900 - margin.left - margin.right,
            height = 600 - margin.top - margin.bottom;

        var num_data_points = 60,
            limit = 60,
            stop = Date.now(),
            start = stop - (num_data_points*1000),
            x_ext = [start, stop],
            y_ext = [0, 100];       // just a guess - will be updated as data comes in.

        var data_refresh = 5000;  // in ms.
        var path_color = d3.scaleOrdinal(d3.schemeCategory10)

        var x_scale = d3.scaleTime().domain(x_ext).range([0, width])
        var y_scale = d3.scaleLinear().domain(y_ext).range([height, 0])
        var line = d3.line()
                    .x(function(d) { return x_scale(d.timestamp); })
                    .y(function(d) { return y_scale(d.value); });

        var svg = d3.select("#" + divid)
                    .append("svg")
                        .attr("class", "chart")
                        .attr("height", height + margin.top + margin.bottom)
                        .attr("width", width + margin.left + margin.right)
                    .append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var clip = svg.append("defs")               // limit the plots to a visible area.
                      .append("clipPath")
                        .attr("id", "clip")
                        .append("rect")
                            .attr("height", height)
                            .attr("width", width)

        var paths = svg.append("g")
                        .attr("class", "paths")
                        .attr("clip-path", "url(#clip)");

        var xaxis = svg.append("g")
                        .attr("transform", "translate(0," + height + ")")
                        .call(d3.axisBottom(x_scale).tickFormat(d3.timeFormat("%H:%M:%S")));
        var yaxis = svg.append("g").call(d3.axisLeft(y_scale));

        var legend_rect_size = 18,
            legend_spacing = 4,
            legend = null; 

        // Grab the node names from the server and create the plot for the node data. 
        $(document).ready(function() {
            build_plot();
        });

        // start the transition/moving plot.
        update_plot(); 

        function build_plot() {
            var get_node_names = new Promise(
                function(resolve, reject) {
                    var url = window.location.origin + "/api/time_plot/" + table + "/nodes";
                    console.log("calling ", url)
                    d3.json(url, 
                        function(error, json) {
                            if (error) {
                                console.log('nodes error', error);
                                reject(error); 
                            } else if (json.status !== 0) {
                                reject('NO data receieved. Is the agent running?');
                            } else {
                                console.log('got nodes msg', json);
                                resolve(json); 
                            }
                        }
                    )
                }
            );

            get_node_names.then(
                function(json) {
                    console.log("read nodes: ", json['nodes']); 
                    if (nodes.length !== 0) {
                        nodes.splice(0, nodes.length)
                    }
                    for (var i=0; i<json['nodes'].length; i++) {
                        var path = paths.append("path").attr("stroke", path_color(i)).attr("fill", "none"); 
                        nodes.push({
                            name: json['nodes'][i],
                            path: path,
                            color:path_color(i)
                        }); // not sure I need data here. 
                    }
                    legend = svg.selectAll(".legend")
                            .data(nodes)
                            .enter()
                            .append("g")
                            .classed("legend", true)
                            .attr("transform", function(d, i) {
                                var height = legend_rect_size + legend_spacing;
                                var offset = height * nodes.length / 2; 
                                var horz = 2 * legend_rect_size;
                                var vert = i * height + offset; 
                                return "translate(" + horz + "," + vert + ")";
                            });

                    legend.append("rect")
                           .attr("width", legend_rect_size)
                           .attr("height", legend_rect_size)
                           .style("fill", function(d) { return d.color; })
                           .style("stroke", function(d) { return d.color; })

                    legend.append("text")
                          .attr('x', legend_rect_size + legend_spacing)
                          .attr('y', legend_rect_size - legend_spacing)
                          .text(function(d) { return d.name; })

                    // start getting data updates and update the paths.
                    read_node_data()
                }, 
                function(message, error) {
                    console.log(message, error); 
                }
            )
        }

        function read_node_data() {
            console.log("read_node_data called")
            var get_node_data = new Promise(
                function(resolve, reject) {
                    stop = Date.now();
                    start = stop - (num_data_points*1000); 

                    var url = window.location.origin + "/api/" + datatype + "/json?";
                    url += 'start=' + Math.floor(start/1000);  // server speaks seconds.
                    url += '&stop=' + Math.floor(stop/1000); 
                    url += '&step=' + 1;   // one second steps. 
                    url += '&metric=' + 'random';  // GTL TESTING REMOVE RANDOM use --> chart_units;
                    url += '&agent=' + agent;
                    console.log("requesting url: ", url); 
                    d3.json(url, function(error, json) {
                        if (error) { 
                            console.log('error', error);
                            reject(error)
                        } 
                        else if (json.status !== 0) { 
                            reject(json.error);
                        }
                        else if (! 'data' in json) {
                            reject('bad data from server. missing data')
                        }
                        else {
                            resolve(json['data'])
                        }
                    })
                });

                get_node_data.then(
                    function(data) {
                        var x_exts = [], y_exts = []; 
                        for (var data_i in data) { 
                            var node_i = nodes.findIndex(function(n) { return n.name === data[data_i]["node"]; })
                            if (node_i !== -1) {
                                // console.log("updating plot data for ", nodes[node_i].name, ": ", 
                                //         data[data_i].values.slice(0, 10)); 
                                // format data - add implied timestamp. 
                                var points = [];
                                data[data_i].values.forEach(function(v, i) { 
                                    points.push({value: v, timestamp: start+(i*1000)}); 
                                });
                                if (points.length > 0) {
                                    // keep track of max/min for x and y for this path.
                                    x_exts.push.apply(x_exts, d3.extent(points, function(d) { return d.timestamp; }));
                                    y_exts.push.apply(y_exts, d3.extent(points, function(d) { return d.value; }));
                                    nodes[node_i].path.attr("d", line(points));
                                }
                            }
                            else {
                                console.log('ERROR: Got data for a node we know nothning about.')
                            }
                        }
                        if (x_exts.length !== 0) x_ext = d3.extent(x_exts);
                        if (y_exts.length !== 0) y_ext = d3.extent(y_exts);
                    }, 
                    function(error) {
                        console.log(error);
                    }
                )

                update_plot();
                setTimeout(read_node_data, data_refresh); 
        }

        function update_plot() {
            x_scale.domain([start, stop]); 
            y_scale.domain([y_ext[0]-(y_ext[0]*0.1), y_ext[1]+(y_ext[1]*0.1)]); 
            console.log("udpating plot", start, stop, x_scale(stop-data_refresh), x_ext)

            //yaxis.transition()
            //     .duration(data_refresh)
            //     .ease(d3.easeLinear)
            //     .call(d3.axisLeft(y_scale))
            yaxis.call(d3.axisLeft(y_scale))

            xaxis.transition()
                 .duration(data_refresh)
                 .ease(d3.easeLinear)
                 .call(d3.axisBottom(x_scale).tickFormat(d3.timeFormat("%H:%M:%S")))

            // d3.select(".paths")
            // d3.selectAll("paths")
            paths.selectAll("path")
                    .attr('transform', null)
                 .transition()
                    .duration(data_refresh)
                    .ease(d3.easeLinear)
                    .attr('transform', 'translate(' + x_scale(start-data_refresh) + ', 0)')
                    // .on("end", update_plot); 
        }
    }

    return deterdash;
})(window);
