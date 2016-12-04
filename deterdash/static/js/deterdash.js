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

    deterdash.spawn_time_plot = function(agent_json, plot_divid, chart_title_id, chart_units_dropdown_id) {
        console.log('agent_json', agent_json); 
        var nodes = [];   // array of dict of node data.
        var data_key = agent_json.units[0].data_key; 
        var datatype = agent_json.datatype;
        var agent = agent_json.table; // Don't ask. 
        var data_units = agent_json.units;

        var margin = {top: 20, right: 120, bottom: 50, left: 60},
            width = 900 - margin.left - margin.right,
            height = 600 - margin.top - margin.bottom;

        var limit = 60 * 1000,      // view window in ms
            duration = 5000,        // fetch new data in ms
            now = new Date(),       // Date is ms
            y_ext = [0, 100];       // just a guess - will be updated as data comes in.

        var path_color = d3.scaleOrdinal(d3.schemeCategory10)

        // var x_scale = d3.scaleTime().domain(x_ext).range([0, width])
        var x_scale = d3.scaleTime()
                        .domain([new Date(now-limit), now])
                        .range([0, width])
        var y_scale = d3.scaleLinear().domain(y_ext).range([height, 0])

        var line = d3.line()
                    .x(function(d) { return x_scale(new Date(d.t*1000)); })  // scale is ms, t is seconds.
                    .y(function(d) { return y_scale(d.value); });

        var svg = d3.select(plot_divid)
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

        // Build the units dropdown menu and update the panel title. 
        var build_units_drop_down = function() {
            // GTL for testing - add random data to plot (server side)
            data_units.push({display: "random", data_key: "random"})
            set_chart_title(data_units[0]);
            var dropdown = d3.select(chart_units_dropdown_id)
                .selectAll("li")
                .data(data_units)
                    .enter()
                    .append("li")
                    .text(function(d) { return d.display; })
                    .on("click", function(d) {
                        set_chart_title(d)
                        data_key = d.data_key;
                    });
        }(); 

        function set_chart_title(unit) { 
            var chart_title = unit.display;
            if (unit.unit) {
                chart_title += " (" + unit.unit + ")";
            }
            d3.select(chart_title_id).text(chart_title);
        }

        function build_plot() {
            var get_node_names = new Promise(
                function(resolve, reject) {
                    var url = window.location.origin + "/api/time_plot/" + agent + "/nodes";
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
                    // create the nodes.
                    for (var i=0; i<json['nodes'].length; i++) {
                        var node = {
                            name: json['nodes'][i],
                            data: [],         // array of time, value pairs: [{t1, v1}, {t2, v2}...{tn, vn}]
                            color:path_color(i)
                        }; 
                        node.path = paths.append("path")
                                         .data([node.data])
                                         .attr("stroke", path_color(i))
                                         .attr("fill", "none"); 
                        nodes.push(node);
                    }
                    // create the legend now that we know the node names and colors. 
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
                    read_node_data(null)
                }, 
                function(message, error) {
                    console.log(message, error); 
                }
            )
        }

        function read_node_data(then) {
            console.log("read_node_data called")
            var get_node_data = new Promise(
                function(resolve, reject) {
                    now = new Date();

                    // first time request limit of data, after just request the new stuff.
                    if (!then) { 
                        var start = new Date(now - limit)
                    } else {
                        var start = new Date(then);
                    }
                    console.log("requesting data for period ", start, " to ", now); 

                    var url = window.location.origin + "/api/" + datatype + "/json?";
                    url += 'start=' + Math.floor(start/1000);   // server speaks seconds not ms.
                    url += '&stop=' + Math.floor(now/1000); 
                    url += '&step=' + 1;                        // one second steps. 
                    url += '&metric=' + data_key;
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
                        var y_exts = []; 
                        for (var data_i in data) { 
                            var node_i = nodes.findIndex(function(n) { return n.name === data[data_i]["node"]; })
                            if (node_i !== -1) {
                                if (data[data_i].values.length > 0) {
                                    // remove timed out data. 
                                    var killto = nodes[node_i].data.findIndex(function(d) {
                                        return d.t >= (now-limit)/1000;
                                    })
                                    if (killto >= 0) {
                                        console.log('removing ' + killto + ' datapoints from ' + nodes[node_i].name);
                                        nodes[node_i].data.splice(0, killto+1) 
                                    }
                                    // append new data.
                                    nodes[node_i].data.push.apply(nodes[node_i].data, data[data_i].values);
                                    // keep track of max/min for x and y for this path.
                                    y_exts.push.apply(y_exts, d3.extent(nodes[node_i].data, function(d) { 
                                        return d.value; 
                                    }));
                                    // now update the path in the svg with current data.
                                    nodes[node_i].path.attr("d", line)
                                }
                            }
                            else {
                                console.log('ERROR: Got data for a node we know nothning about.')
                            }
                        }
                        if (y_exts.length !== 0) y_ext = d3.extent(y_exts);
                    }, 
                    function(error) {
                        console.log(error);
                    }
                )

                // update the plots. 
                x_scale.domain([new Date(now - limit), now])

                if (y_ext[1]-y_ext[0] > 0.01) {
                    y_scale.domain([y_ext[0]-(y_ext[0]*0.1), y_ext[1]+(y_ext[1]*0.1)]); 
                } else {
                    y_scale.domain([0,1]);  // shrug.    
                }

                //yaxis.transition()
                //     .duration(data_refresh)
                //     .ease(d3.easeLinear)
                //     .call(d3.axisLeft(y_scale))
                yaxis.call(d3.axisLeft(y_scale))

                xaxis.transition()
                    .duration(duration)
                    .ease(d3.easeLinear)
                    .call(d3.axisBottom(x_scale).tickFormat(d3.timeFormat("%H:%M:%S")))

                paths.attr('transform', null)
                    .transition()
                    .duration(duration)
                    .ease(d3.easeLinear)
                    .attr('transform', 'translate(' + -x_scale(new Date(now - limit + duration)) + ')')
                    .on('end', function() { read_node_data(now); })


                // setTimeout(read_node_data, duration); 
        }
    }

    return deterdash;
})(window);
