// All the deter node stats widget code is inside an anon func which we 
// call immediately. This encapsulates our widget code...

console.log('deterdash loaded.');

(function(window) {
    'use strict';

    var deterdash = window.deterdash || {};
    window.deterdash = deterdash;    // GTL this seems wrong.

    var margin = {top: 10, right: 10, bottom: 10, left: 23},
        width = 300,
        height = 200 - margin.top - margin.bottom;

    var context = cubism.context().step(1000).size(width);
    var horizon = context.horizon().height(height); 


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
        var panel_body = panel.append("div")
                                .attr("class", "panel-body")
                                .attr("id", nodename + "_panel_body");
        var panel_footer = panel.append("div").attr("class", "panel-footer")
                                .attr("id", nodename+"_panel_footer");

        build_panel_header(panel_header, nodename);

        function set_footer(agent, unit) {
            panel_footer.text(agent.display + ' - ' + unit.display);
        }

        function unit_change(agent, unit) {
            panel_body.text('Graph for "' + agent.display + ' - ' + unit.display + 
                            '" will go here.'); 
            set_footer(agent, unit); 
        }

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
                    for (var ai=0; ai<agents.length; ai++) {
                        var agent_menu = dropdown.append("li").attr("class", "dropdown-submenu");
                        agent_menu.append("a").attr("href", "#").text(agents[ai].display);

                        var units_menu = agent_menu.append("ul").attr("class", "dropdown-menu");
                        for (var ui=0; ui<agents[ai].units.length; ui++) {
                            // use first agent and first unit as the default display.
                            if (ai === 0 && ui === 0) {
                                unit_change(agents[0], agents[0].units[0]);
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
                }
            ).catch(
                function(reason) {
                    console.log('Error getting agents for ' + nodename + ': ' + reason);
                }
            );
        }

        // horizon.metric(get_node_data);

        // d3.select("#"+nodename+"_panel_body").selectAll(".horizon")
        //         .data([nodename])
        //         .enter()
        //         .append("div")
        //         .attr("class", "horizon")
        //         .call(horizon);

        // d3.select("#"+nodename+"_panel_body").append("div")
        //     .attr("class", "rule")
        //     .call(context.rule());

        // var axis = context.axis();
        // d3.select("#"+nodename+"_panel_body").append("div")
        //     .attr("class", "axis")
        //     .append("g").call(axis);
    }

    return deterdash;
})(window);
