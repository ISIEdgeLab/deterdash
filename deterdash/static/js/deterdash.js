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
    var horizon = context.horizon().height(height).extent([-10, 10]);

    function get_node_data(node) {
        console.log('getting data for node {}' + node.name);
        var value = 0, values = [], i = Math.random() * 10, last;
        return context.metric(function(start, stop, step, callback) {
            start = +start, stop = +stop;
            if (isNaN(last)) last = start;
            while (last < stop) {
              last += step;
              value = Math.max(-10, 
                        Math.min(10,
                            value + .8 * Math.random() - .4 + .2 * Math.cos(i += 1 * .02)));
              values.push(value);
            }
            callback(null, values = values.slice((start - stop) / step));
          }, node);
    }

    deterdash.node_stats_panel = function(d3, divid, node) {
        console.log('node_stats_panel called for ' + name);

        var panel = d3.select(divid)
                            .append("div")
                                .attr("class", "col-lg-4 node_template")
                                .attr("id", node.name+"_panel")
                            .append("div")
                                .attr("class", "panel panel-default");

        panel.append("div").attr("class", "panel-heading").text("Node: " + node.name);

        var panel_body = panel.append("div")
                                .attr("class", "panel-body")
                                .attr("id", node.name + "_panel_body");

        horizon.metric(get_node_data(node));

        d3.select("#"+node.name+"_panel_body").selectAll(".horizon")
                .data([node.name])
                .enter()
                .append("div")
                .attr("class", "horizon")
                .call(horizon);

        d3.select("#"+node.name+"_panel_body").append("div")
            .attr("class", "rule")
            .call(context.rule());

        var axis = context.axis();
        d3.select("#"+node.name+"_panel_body").append("div")
            .attr("class", "axis")
            .append("g").call(axis);
    }

    return deterdash;
})(window);
