// All the deter node stats widget code is inside an anon func which we 
// call immediately. This encapsulates our widget code...

console.log('deterdash loaded.');

(function(window) {
    'use strict';

    var deterdash = window.deterdash || {};
    window.deterdash = deterdash;    // GTL this seems wrong.

    deterdash.set_title = function(divid, icon, titlestr, subtitle) {
        $(divid).empty()
        var titlediv = d3.select(divid).append("h1")
        titlediv.append("i").classed("fa", true).classed(icon, true)
        titlediv.append("span").text(" " + titlestr)
        titlediv.append("small").text(" " +subtitle)
    }

    deterdash.load_experiment_info = function(title_id, exp_user_divid, exp_url_id) { 
        var exp_info_promise = new Promise(
            function(resolve, reject) {
                d3.json(window.location.origin + "/api/exp_info",
                    function(error, json) {
                        if(error) {
                            reject("error getting experiment info from server");
                            return;
                        }
                        if(json.status !== 0) {
                            reject("server unable to get exp info.");
                            return;
                        }
                        resolve(json);
                    }
                );
            });

            exp_info_promise.then(
                function(exp_info_json) {
                    var exp_name = exp_info_json['project'] + "/" + exp_info_json['experiment']
                    var exp_url = "http://www.isi.deterlab.net/showexp.php?pid=" + exp_info_json['project'] +
                                  "&eid=" + exp_info_json['experiment']

                    var title = d3.select(title_id)
                        .text(exp_name)

                    if ('swapper' in exp_info_json) { 
                        title.append("small")
                            .text(" swapped by: " + exp_info_json['swapper'])

                        d3.selectAll(exp_user_divid).text(exp_info_json['swapper'])
                    }
                    if ('creator' in exp_info_json) { 
                        title.append("small")
                            .text(" created by: " + exp_info_json['creator'])
                    }

                    d3.select(exp_url_id)
                        .select("a")
                        .remove()
                    d3.select(exp_url_id)
                        .append("a")
                            .attr("href", exp_url)
                        .append("i")
                            .classed("fa fa-flask", true)
                        .text(" " + exp_name + " on DETER")

                        

                },
                function(error) {
                    console.log("error getting exp info: " + error);
                }
            ).catch(function(reason) {
                console.log("error setting dashboad title: " + reason);
            });
    }

    // Given a divid, data, and a column heading map to the data, build a table.
    deterdash.build_table = function(divid, heading_map, table_data) {
        var table = divid.append("div").classed("table-responsive", true)
                    .append("table").classed("table", true) 

        var thead = table.append("thead")
        var cols = Object.keys(heading_map)

        thead.append("tr")
            .selectAll("th")
            .data(cols)
            .enter()
            .append("th")
            .text(function(d) { return d; })

        var tbody = table.append("tbody")

        // a row for each datapoint.
        var rows = tbody.selectAll("tr")
            .data(table_data)
            .enter()
            .append("tr")

        // now fill in the rows.
        var cells = rows.selectAll("td")
            .data(function(row) {
                return cols.map(function(col) {
                    if (heading_map) 
                        return {col: col, value: row[heading_map[col]]};
                    else
                        return {col: col, value: row[col]}
                })
            })
            .enter()
            .append("td")
            .text(function(d) {
                if (Array.isArray(d.value)) {
                    // return deterdash.build_table(this, null, d);
                    return JSON.stringify(d.value)
                } else if (typeof d.value === "object") {
                    return ""
                }
                return d.value; 
            })
    }

    deterdash.build_input_td = function(selection, d, nodes) { 
        if (d.type === "nodelist") {
            var nodelist = selection.append("select")
                .classed("form-control select2", true)
                .attr("multiple", "multiple")
                .attr("data-placeholder", "Choose nodes...")
                .attr("style", "width: 100%")
                .attr('tokenSeparators', "[',', ' ']")
                .attr('tags', 'true')
            nodelist.selectAll("option")
                .data(nodes)
                .enter()
                .append("option")
                    .text(function(d) { return d })
        } else if (d.type == "boolean") { 
            var binput = selection.append("select").classed("form-control", true)
            binput.append("option").text("true")
            binput.append("option").text("false")
        } else {
            var input = selection.append("input")
                .attr("type", "text")
                .classed("form-control", true)

            if (d.default) {
                input.attr('value', d.default)
            } else {
                input.attr("placeholder", "Enter value...")
            }
        }
    }

    deterdash.build_input_table = function(divsel, the_title, data, nodes) {
        var table = divsel.append("div").classed("table-responsive", true)
                    .append("table").classed("table", true) 

        var thead = table.append("thead")

        thead.append("tr")
            .selectAll("th")
            .data(['Variable', 'Value'])
            .enter()
            .append("th")
            .text(function(d) { return d; })

        var tbody = table.append("tbody")
        var onnodes = tbody.append("tr")
        onnodes.append("td").text("Run on nodes")
        deterdash.build_input_td(onnodes, {type: "nodelist"}, nodes)

        data.forEach(function(d) { 
            var row = tbody.append("tr")
            row.append("td").text(d['name'])
            deterdash.build_input_td(row, d, nodes)
        })
    }

    // Wrap a table in a box/panel with the given title. 
    deterdash.build_table_panel = function(table_container, title, heading_map, table_data) {
            var table_div = table_container.append("div").classed("box box-solid box-primary", true)

            var header = table_div.append("div").classed("box-header", true)

            header.append("h3").classed("box-title", true).text(title)
            header.append("div").classed("box-tools pull-right", true)
                  .append("button").classed("btn btn-primary btn-sm", true).attr("data-widget", "collapse")
                  .append("i").classed("fa-minus", true)

            var tdiv = table_div.append("div").classed("box-body", true)
            deterdash.build_table(tdiv, heading_map, table_data)
    }

    deterdash.make_key_value_box = function(divid, the_title, kvmap, data) { 
        var box = divid.append("div").classed("box box-solid box-primary", true)
        var header = box.append("div").classed("box-header", true)
        var body = box.append("div").classed("box-body", true)

        header.append("h3").classed("box-title", true).text(the_title)

        header.append("div").classed("box-tools pull-right", true)
            .append("button").classed("btn btn-primary btn-sm", true)
            .attr("data-widget", "collapse")
            .append("i").classed("fa-minus", true)

        var table = body.append("div").classed("dl-horizontal", "true")

        for (var k in kvmap) { 
            table.append("dt").text(kvmap[k])
            table.append("dd").text(data[k])
        }
    }

    deterdash.show_exe_agent = function(agent, agent_divid, nodes) {
        var agent_div = d3.select(agent_divid)
        var rows_div = agent_div.append("div").attr("class", "row")

        var about = rows_div.append("div").attr("class", "col-lg-12")
        var kvmap = {display: "Agent", description: "About", name: "Name", magi_version: "Magi Version"}
        deterdash.make_key_value_box(about, "About", kvmap, agent)

        if (agent.variables && agent.variables.length) { 
            var table_div = rows_div.append("div").attr("class", "col-lg-12")
            var init_heading_map = {Name: 'name', Type: 'type', Default: 'default', Help: 'help'}
            deterdash.build_table_panel(table_div, "Intialization", init_heading_map, agent.variables)
        }

        if (agent.method && agent.method.length) { 
            var table_div = rows_div.append("div").attr("class", "col-lg-12")
            var meth_heading_map = {Name: 'name', Arguments: 'args', Help: 'help'}
            deterdash.build_table_panel(table_div, "Methods", meth_heading_map, agent.method)

            var init_input_div  = rows_div.append("div").attr("class", "col-lg-12")
            deterdash.build_input_table(init_input_div, "Initialization", agent.variables, nodes)
        }
    }

    deterdash.make_text_box = function(divid, title_str, text) { 
        var box = divid.append("div").classed("box box-solid box-primary", true)

        var header = box.append("div").classed("box-header", true)
        header.append("h3").classed("box-title", true).text(title_str)
        header.append("div").classed("box-tools pull-right", true)
              .append("button").classed("btn btn-primary btn-sm", true).attr("data-widget", "collapse")
              .append("i").classed("fa-minus", true)

        box.append("div").classed("box-body", true).text(text)
    }

    deterdash.show_nodeinfo = function(nodeinfo, nodeinfo_id) {
        var container = d3.select(nodeinfo_id)
        var now = new Date()
    
        var uptime = new Date(now - (nodeinfo['uptime'] * 1000.0))

        deterdash.make_text_box(container, "Uptime", function() {
            return "Up Since: " + uptime + " (" + nodeinfo['uptime'] + " seconds)";
        })

        if (nodeinfo.users.length) { 
            deterdash.make_text_box(container, "Logged In Users", function() {
                return nodeinfo.users;
            })
        }

        // We use the keys as the headings, but assert the order here. Not great.
        var heading_map = {
            Proto: "Proto", "Send-Q": "Send-Q", "Recv-Q": "Recv-Q", "Local Address": "Local Address",
            "Foreign Address": "Foreign Address", State: "State", 
            "PID/Program name": "PID/Program name"
        };
        deterdash.build_table_panel(container, "Open Ports", heading_map, nodeinfo.ports)

        var show_route_tables = new Promise(
            function(resolve, reject) {
                var url = window.location.origin + '/api/routing/' + nodeinfo.name
                d3.json(url, 
                    function(error, json) {
                        if (error) reject(error);
                        else if (json.status !== 0) {
                            reject("No route table found for node " + agent.name)
                        }
                        else if(!'table' in json) {
                            reject('No table data from server.')
                        }
                        else {
                            console.log("Got route table")
                            resolve(json);
                        }
                    }
                );
            }
        );
    
        show_route_tables.then(
            function(json) {
                var tables = json["table"]
                var heading_map = {Destination: 'dst', Gateway: 'gw', Interface: 'iface', Netmask: "netmask"}
                deterdash.build_table_panel(container, 'Routing Table', heading_map, tables)
            },
            function(message, error) {
                console.log(message, error);
            }
        );

        var show_running_agents = new Promise(
            function(resolve, reject) {
                var url = window.location.origin + '/api/' + nodeinfo.name + '/agents'
                d3.json(url, 
                    function(error, json) {
                        if (error) reject(error);
                        else if (json.status !== 0) {
                            reject("No agents found for node " + agent.name)
                        }
                        else if(!'agents' in json) {
                            reject('No agents data from server.')
                        }
                        else {
                            console.log("Got route table")
                            resolve(json);
                        }
                    }
                );
            }
        );
    
        show_running_agents.then(
            function(json) {
                var agents = []
                json["agents"].forEach(function(a) { agents.push(a.display + " (" + a.agent + ")") })
                
                deterdash.make_text_box(container, "Running Magi Agents", function() {
                    return agents.join(',   ')
                })
            },
            function(message, error) {
                console.log(message, error);
            }
        );
    }

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

    deterdash.spawn_time_plot = function(agent_json, plot_divid, chart_title_id, 
                chart_units_dropdown_id, control_btn_group_id) {
        console.log('agent_json', agent_json); 
        var nodes = [];   // array of dict of node data.
        var data_key = agent_json.units[0].data_key; 
        var datatype = agent_json.datatype;
        var agent = agent_json.table; // Don't ask. 
        var data_units = agent_json.units;

        var margin = {top: 20, right: 120, bottom: 50, left: 60},
            width = 950 - margin.left - margin.right,
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
                        .attr("id", "paths-clip")
                        .append("rect")
                            .attr("height", height)
                            .attr("width", width)

        var paths = svg.append("g")     // wrap the paths in the clipPath so we don't see data past the y-axis.
                        .attr("clip-path", "url(#paths-clip)")
                        .append("g") 
                        .attr("class", "paths")

        var xaxis = svg.append("g")
                        .attr("transform", "translate(0," + height + ")")
                        .call(d3.axisBottom(x_scale).tickFormat(d3.timeFormat("%H:%M:%S")));

        var yaxis = svg.append("g").call(d3.axisLeft(y_scale).tickFormat(d3.format('.0s')))

        var legend_rect_size = 18,
            legend_spacing = 4,
            legend = null; 

        var paused = false;

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
                    .append("a")
                        .attr("href", "#")
                        .text(function(d) { return d.display; })
                        .on("click", function(d) {
                            set_chart_title(d)
                            data_key = d.data_key;
                            nodes.forEach(function(n) { n.data.splice(0, n.data.length); });
                        });
        }(); 

        function set_chart_title(unit) { 
            var chart_title = unit.display;
            if (unit.unit) {
                chart_title += " (" + unit.unit + ")";
            }
            d3.select(chart_title_id).text(chart_title);
        }

        var build_pause_button = function() { 
            console.log("building pause button")
            var button = d3.select(control_btn_group_id)
                .append("button")
                .attr("type", "button")
                .classed("btn btn-xs btn-default", true)

            var icon = button.append("i").classed("fa fa-pause", true)

            button.on("click", function(d) { 
                if(!paused) {
                    icon.classed("fa-pause", false)
                    icon.classed("fa-play", true)
                    paused = true
                } else {
                    icon.classed("fa-pause", true)
                    icon.classed("fa-play", false)
                    paused = false;
                    read_node_data(null) 
                }
            })

        }();  // actaully call the function. 

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
                                         // .data([node.data])
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
                                var offset = height * nodes.length / 4; 
                                var horz = 2 * legend_rect_size;
                                var vert = i * height + offset - 30; 
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

                    // If we have fewer datapoints than the limit, just get all the datra OR
                    // first time request limit of data, after just request the new stuff.
                    if (nodes[0].data.length < limit/1000 || !then) {
                        var start = new Date(now-limit);
                        nodes.forEach(function(n) { n.data.splice(0, n.data.length); });
                    } else {
                        var start = new Date(then);  // just get the new data. 
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
                                    // merge new data.
                                    nodes[node_i].data.push.apply(nodes[node_i].data, data[data_i].values);
                                    // We should not ahve to do this, but here we are.
                                    nodes[node_i].data.sort(function(d1, d2) { if(d1.t < d2.t) return -1; return 1;});
                                    // keep track of max/min for x and y for this path.
                                    y_exts.push.apply(y_exts, d3.extent(nodes[node_i].data, function(d) { 
                                        return d.value; 
                                    }));
                                    // now update the path in the svg with current data.
                                    nodes[node_i].path.attr("d", line(nodes[node_i].data))
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

                yaxis.call(d3.axisLeft(y_scale).tickFormat(d3.format('.0s')))

                xaxis.transition()
                    .duration(duration)
                    .ease(d3.easeLinear)
                    .call(d3.axisBottom(x_scale).tickFormat(d3.timeFormat("%H:%M:%S")))

                // paths.selectAll("path")
                paths.attr('transform', null)
                    .transition()
                    .duration(duration)
                    .ease(d3.easeLinear)
                    .attr('transform', 'translate(' + -x_scale(new Date(now - limit + duration)) + ')')
                    .on('end', function() { 
                        if (!paused) { 
                            // remove old data and update the lines so that when the selection jumps back, the 
                            // lines will be in the correct place while waiting for new data to arrive.
                            var post_trans = new Date()
                            x_scale.domain([new Date(post_trans - limit), post_trans])
                            nodes.forEach(function(n) { 
                                var killto = n.data.findIndex(function(d) {
                                    return d.t >= (post_trans-limit)/1000;
                                })
                                if (killto > 0) {
                                    n.data.splice(0, killto) 
                                    n.path.attr("d", line(n.data)); 
                                }
                            });
                            // get new data. 
                            read_node_data(now);
                        }
                        // else the button handler for the "start" button will call read_node_data(null);
                    });

            }
    }
    
    deterdash. route_topology = function(agent_name, route_divid, node_panels_id, clear_routes_menu_id, 
                                         clear_route_button_id, display_route_button_id, title_divid,
                                         choose_nodes_divid) {
            var win_w = $(route_divid).width(),
                win_h = $(route_divid).height();
            var margin = {top: 5, right: 5, bottom: 5, left: 5};

            var node_rad = 10,
                node_gap = 5;

            var clear_all_routes_menu_entry = {id: "clear_all_routes",
                                               text: "All Routes", 
                                               color: null, 
                                               src: null, 
                                               dst: null, 
                                               slot: -1};
            var selected_path_nodes = [],
                path_slot = -1,
                choosing_path = false,
                route_color = d3.scaleOrdinal(d3.schemeCategory10),
                route_dropdown_menu = [clear_all_routes_menu_entry]

            var newest_zoom = null;

            var node = null,
                link = null,
                nodes = [],
                links = [],
                node_label = null;

            var simulation = d3.forceSimulation()
                .force("link", d3.forceLink()
                    .distance(60)
                    .strength(0.7)
                    .id(function(d) { return d.id; }))
                .force("collision", d3.forceCollide()
                     .radius(function(d) { return node_rad+node_gap }).iterations(16))
                .force("charge", d3.forceManyBody())
                .force("center", d3.forceCenter(win_w/2, win_h/2))
                .on("tick", ticked)

            var svg = d3
                .select(route_divid)
                .append("svg")
                .attr("cursor", "move")
                .call(d3.zoom().scaleExtent([0.5, 10]).on("zoom", zoomed));

            // build the arrow.
            svg.append("svg:defs").selectAll("marker")
                    .data(["end"])      // Different link/path types can be defined here
                .enter().append("svg:marker")    // This section adds in the arrows
                    .attr("id", String)
                    .attr("viewBox", "0 -5 10 10")
                    .attr("refX", 15)
                    .attr("refY", -1.5)
                    .attr("markerWidth", 6)
                    .attr("markerHeight", 6)
                    .attr("orient", "auto")
                .append("path")
                    .attr("d", "M0,-5L10,0L0,5");

            d3.select(window).on("resize", resize);

            var link_selection = svg.append("g").attr("class", "links");
            var node_selection = svg.append("g").attr("class", "nodes");
            var route_dropdown_menu_selection = d3.select(".clear_routes_dropdown");

            resize();   // set initial size.

            function resize() {
                var win_w = $(route_divid).width(),
                    win_h = $(route_divid).height();

                svg.attr("width", win_w - margin.left - margin.right)
                   .attr("height", win_h - margin.top - margin.bottom);
            }

            function zoomed() {
                newest_zoom = d3.event.transform;
                node_selection.selectAll(".node").attr("transform", newest_zoom); 
                link_selection.selectAll("path").attr("transform", newest_zoom);
            }

            function dragstarted(d) {
                if (!d3.event.active) simulation.alphaTarget(0.1).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(d) {
                d.fx = d3.event.x;
                d.fy = d3.event.y;
            }

            function dragended(d) {
                if (!d3.event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }

            var exp_name_promise = new Promise(
                function(resolve, reject) {
                    d3.json(window.location.origin + '/api/exp_info',
                        function(error, json) {
                            if(error) reject(error); 
                            else if (json.status !== 0) {
                                // This can happen if the correct agent is not running.
                                reject('server did not give us the exp info.');
                            }
                            else {
                                console.log("got exp_info: ", json); 
                                resolve(json);
                            }
                        }
                    );
                }
            ).then(
                function(expinfo) {
                    $(title_divid).html("Experiment: <b>" + expinfo.project + " / "
                        + expinfo.experiment + "</b>"); 
                }, 
                function(message, error) {
                    $(title_divid).html("Topology"); 
                    console.log(message, error);
                }
            );

            var load_topology_promise = new Promise(
                function(resolve, reject) {
                    d3.json(window.location.origin + "/api/topology/" + agent_name, 
                        function(error, json) {
                            if (error) reject(error);
                            else if (json.status !== 0) reject("server did not give the topology");
                            else resolve(json)
                        }
                    );
                }
            ); 
                
            load_topology_promise.then(function load_topology(json) {
                // build the nodes and links teh way the graph widget wants them
                for(var i = 0; i < json['nodes'].length; i++) {
                    var n = json['nodes'][i];
                    nodes.push({name: n, id: i});
                }
                for(var i = 0; i <  json['edges'].length; i++) {
                    var s = json['edges'][i][0]
                    var t = json['edges'][i][1]
                    var si = json['nodes'].indexOf(s);
                    var ti = json['nodes'].indexOf(t);
                    var name = s + '-' + t
                    console.log('adding link', s, t, name);
                    links.push({source: si, target: ti, name: name, linknum: null});
                }

                update_topo();
                d3.select(display_route_button_id).classed("disabled", false); 
            });

            function remove_all_paths() {
                console.log("removing all paths");
                for(var i=0; i<links.length; i++) {
                    if (links[i].hasOwnProperty('route')) {
                        console.log("removing link: ", links[i]);
                        links.splice(i, 1);
                        i--;   // we just removed an element.
                    }
                }
                for(var i=0; i<selected_path_nodes.length; i++) {
                    delete selected_path_nodes[i];  // set slot to undefined.
                }
                route_dropdown_menu.splice(0, route_dropdown_menu.length);  // kill all menu items.
                route_dropdown_menu.push(clear_all_routes_menu_entry);
                update_topo();
            }

            function handle_clear_route(d) {
                console.log("removing path:" , d); 
                if (d.id == "clear_all_routes") {
                    remove_all_paths();
                    return;
                }
                for(var i=0; i<links.length; i++) {
                    if (links[i].hasOwnProperty('route') && links[i].route === d.src + "-" + d.dst) {
                        console.log("removing link: ", links[i]);
                        links.splice(i, 1);
                        i--;   // we just removed an element.
                    }
                }
                delete selected_path_nodes[d.slot];  // set slot to undefined. 
                var i = route_dropdown_menu.findIndex(function(x) { return x.slot == d.slot; });
                if (i != -1) { 
                    route_dropdown_menu.splice(i, 1);   // remove it here, will remove it from the menu.
                } else {
                    console.log("unable to find in drop down menu: ", d); 
                }

                update_topo();
            }

            function show_path(path_slot) {
                var path_show_promise = new Promise(
                    function(resolve, reject) {
                        var url = window.location.origin + '/api/routing/path?';
                        url += "src=" + selected_path_nodes[path_slot].src.name;
                        url += "&dst=" + selected_path_nodes[path_slot].dst.name;
                        d3.json(url, 
                            function(error, json) {
                                if (error) reject(error);
                                else if (json.status !== 0) {
                                    reject("Server could not find that path");
                                }
                                else {
                                    console.log("Got path: ", json.path);
                                    resolve(json);
                                }
                            }
                        );
                    }
                );
            
                path_show_promise.then(
                    function(json) {
                        var path_nodes = json["path"]
                        var route_name = path_nodes[0] + "-" + path_nodes[path_nodes.length-1]
                        for(var i = 0; i < path_nodes.length-1; i++) {
                            var s = path_nodes[i]
                            var t = path_nodes[i+1]
                            var si = simulation.nodes().findIndex(function(n) { return n.name == s; });
                            var ti = simulation.nodes().findIndex(function(n) { return n.name == t; });
                            var name = s + "-" + t
                            console.log('adding route path link', si, ti, name, route_name);
                            links.push({source: si, target: ti, name: name,
                                linknum: path_slot, route: route_name});
                        }
                        var src = path_nodes[0],
                            dst = path_nodes[path_nodes.length-1];
                        route_dropdown_menu.push({
                            id: src + dst + path_slot,
                            text: src + " --> " + dst,
                            src: src, dst: dst, slot: path_slot,
                            color: route_color(path_slot)
                        });
                        d3.select(display_route_button_id).classed("disabled", false); 
                        d3.select(".choose-nodes-message").remove()
                        choosing_path = false;
                        path_slot = -1;
                        update_topo();
                    },
                    function(message, error) {
                        console.log(message, error);
                    }
                );
            }

            function update_topo() {
                console.log("updating topology");

                // var link = link_selection.selectAll("path").data(links).enter()
                var link = link_selection.selectAll("path").data(links)
                var node = node_selection.selectAll(".node").data(nodes).enter().append("g").attr("class", "node")

                // update link attrs for existing links.
                link.attrs(function(d) { return link_attrs(d); }); 

                // enter (new links) - create link DOM.
                link.enter().append("path")
                    .attr("class", "link")
                    .attr("fill", "none")
                    .attr("transform", newest_zoom);   // make sure to translate new links/paths.

                node.append("circle")
                    .attr("r", "6")
                    .attr("fill", function(d) { return get_node_fill(d); })
                    .attr("stroke", function(d) { return get_node_stroke(d); })
                    .on("click", function(d) { click_node(d); })
                    .call(d3.drag()
                            .on("start", dragstarted)
                            .on("drag", dragged)
                            .on("end", dragended))

                node.append("text")
                    .attr("x", 12)
                    .attr("dy", ".35em")
                    .attr("font", "10px sans-serif")
                    .attr("pointer-events", "none")
                    .attr("fill", "black")
                    .text(function(d) { return d.name })

                node.on("mouseover", function(d) { set_highlight(d); })
                    .on("mouseout", function(d) { exit_highlight(d); })

                // remove links no longer in the DOM.
                link.exit().remove(); 
                node.exit().remove();

                simulation.nodes(nodes);
                simulation.force("link").links(links);
                simulation.restart();

                // "slot" is the unique ID for each menu entry as it maps to the index of the entry in the paths array.
                var menu = route_dropdown_menu_selection
                    .selectAll("li")
                    .data(route_dropdown_menu, function(d) { return d.slot; })
                // update existing menu entries with text/color. 
                menu.selectAll("a")
                    .style("background-color", function(d) { return d.color; })
                    .text(function(d) { return d.text; })

                // create and set new entries.
                menu.enter()
                    .append("li")
                    .append("a")
                        .attr("href", "#")
                        .attr("id", function(d) { return d.id; })
                        .style("background-color", function(d) { return d.color; })
                        .text(function(d) { return d.text; })
                        .on("click", handle_clear_route)

                // remove missing entries.
                menu.exit().remove()

                // If there is only one menu entry (clear all), then disable the menu.
                d3.select(clear_route_button_id)
                    .classed("disabled", function() { return route_dropdown_menu.length == 1; })

            };  // end of update_topo()

            function get_node_stroke(d) {
                return "blue";
            }

            function get_node_fill(d) {
                if (d.hasOwnProperty("route_selected")) {
                    return route_color(d.route_selected); 
                }
                return "#8be47c";
            }

            function click_node(d) {
                if (!choosing_path) {
                    return;
                }
                if (path_slot < 0) { // this is the first node clicked.
                    path_slot = selected_path_nodes.findIndex(function(x) { return x === undefined; });
                    if (path_slot >= 0) {
                        selected_path_nodes[path_slot] = {src: d, dst: null};
                    } else {  // create a new slot. 
                        selected_path_nodes.push({src: d, dst: null}); 
                        path_slot = selected_path_nodes.length - 1;
                    }
                    d.route_selected = path_slot;
                    console.log("first path node: ", d.name); 
                    var message = d3.select(".choose-nodes-message")
                                    .text("Node " + d.name + " chosen. Choose node two."); 
                } else {   // this is the second node chosen.
                    console.log("route dst: ", d.name);
                    selected_path_nodes[path_slot].dst = d;
                    show_path(path_slot); 
                    delete selected_path_nodes[path_slot].src.route_selected; // unselect the first node.
                    path_slot = -1; 
                }
            }

            function set_highlight(d) {
                svg.style("cursor", "pointer");
            }

            function exit_highlight(d) {
                svg.style("cursor", "move");
            }

            function link_stroke(d) {

            }

            function link_attrs(d) {
                var atts = {};
                if (d.linknum === null) {
                    // Straight black slightly less opaque line.
                    atts["d"] = "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
                    atts["stroke"] = "black";
                    atts["stroke-opacity"] = 0.25;
                    atts["stroke-width"] = 1.0; 
                } else {
                    var dx = d.target.x - d.source.x,
                        dy = d.target.x - d.source.y,
                        dr = Math.sqrt(((d.linknum+1) * dx * dx) + ((d.linknum+1) * dy * dy));

                    atts["d"] = "M" + d.source.x + "," + d.source.y + 
                                "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;


                    atts["stroke"] = route_color(d.linknum);
                    atts["stroke-opacity"] = 1.0;
                    atts["stroke-width"] = 1.5; 
                    atts["marker-end"] = "url(#end)";
                }

                return atts
            }

            function ticked() {
                var link = link_selection.selectAll("path");
                var node = node_selection.selectAll(".node");
                var circle = node.selectAll("circle");

                link.attrs(function(d) { return link_attrs(d); }); 

                // node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
                node.selectAll("circle").attr("cx", function(d) { return d.x; })
                node.selectAll("circle").attr("cy", function(d) { return d.y; })
                node.selectAll("text").attr("x", function(d) { return d.x + 8; })
                node.selectAll("text").attr("y", function(d) { return d.y; })

                circle.attr("fill", function(d) { return get_node_fill(d); })
                      .attr("stroke", function(d) { return get_node_stroke(d); })
            }

            d3.select(display_route_button_id).on("click", function() {
                d3.select(this).classed("disabled", true);
                choosing_path = true;   // we are now choosing a path.
                var mess_area = d3.select("#message_area")
                    .append("div")
                    .attr("class", "alert alert-success choose-nodes-message")

                mess_area.append("text").text("Choose first node")
            });
    } // end route_topology

    return deterdash;
})(window);
