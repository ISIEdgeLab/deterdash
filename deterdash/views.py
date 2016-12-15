import logging 
from datetime import datetime
from flask import render_template, jsonify, request

from . import app
from .topology import get_topology
from .routing import get_route_tables, get_route_path
from .viz_data import get_viz_ui_types, get_viz_agents, get_viz_agent, get_node_viztypes
from .viz_data import get_node_agents
from .viz_data import get_viz_agent_nodes
from .exp_info import get_exp_info, get_exp_nodes, get_node_info
from .exe_agents import get_executable_agents, get_executable_agent

from .time_plots import get_viz_time_plot_data

log = logging.getLogger(__name__)

#
# URL paths.
#
@app.route('/')
def slash():
    log.debug('Rendering index')
    return render_template('blank.html')

@app.route('/index.html')
def index():
    log.debug('Rendering index')
    return render_template('blank.html')

#
# viz paths
#
@app.route('/viz/<endpoint>/<agentname>')
def show_viz(endpoint, agentname):
    log.debug('rendering {} as seen by {}'.format(endpoint, agentname))
    ui_types = get_viz_ui_types()
    for ui_type in ui_types:
        if ui_type['endpoint'] == endpoint:
            agent = get_viz_agent(ui_type['datatype'], agentname)

            if agent: 
                log.debug('found agent: {}'.format(agent))
                return render_template(ui_type['implementation'], agent=agent)

    return render_template('blank.html')

#
# a path just for graphs is not good. 
#
@app.route('/viz/graphs/<agent>')
def show_routes(agent):
    log.debug('looking for graph for agent {}'.format(agent))
    agent = get_viz_agent('force_directed_graph', agent)
    if not agent:
        return render_template("error.html", error='Unable to that agent associated with any graph.')

    return render_template(agent['template'], agent=agent)

#
# display an executable agent.
#
@app.route('/viz/exe_agent/<agent_name>')
def show_exe_agent(agent_name):
    log.debug('showing exe agent {}'.format(agent_name))
    agent = get_executable_agent(agent_name)
    if not agent:
        return render_template("error.html", error='Did not find agent {}'.format(agent_name))

    return render_template('exe_agent.html', agent=agent)

#
# Display information about a node.
#
@app.route('/viz/node_info/<nodename>')
def show_node_info(nodename):
    log.debug('showing info about node {}'.format(nodename))

    nodeinfo = get_node_info(nodename)
    if not nodeinfo:
        return render_template("error.html", error='Unable to get information about node {}.'.format(nodename))

    return render_template('node_info.html', nodeinfo=nodeinfo)

#
# api paths.
#
@app.route('/api/<datatype>/<agentname>/nodes')
def agent_nodes(datatype, agentname):
    log.debug('Looking for nodes for {}'.format(agentname))
    nodes = get_viz_agent_nodes(datatype, agentname)
    if not nodes:
        return jsonify(status=1, error='data not found')

    return jsonify(status=0, nodes=nodes)

@app.route('/api/node_info/<nodename>')
def api_node_info(nodename):
    log.debug('showing info about node {}'.format(nodename))

    nodeinfo = get_node_info(nodename)
    if not nodeinfo:
        return jsonify(status=1, error='Unable to get information about node {}'.format(nodename))

    return jsonify(status=0, nodeinfo=nodeinfo)

@app.route('/api/topology/<agentname>')
def topology(agentname):
    nodes, edges = get_topology(agentname)
    if not nodes:
        return jsonify(status=1, error='topology not found for agent {}'.format(agentname))

    return jsonify(status=0, nodes=nodes, edges=edges)

@app.route('/api/exp_nodes')
def exp_nodes():
    nodes = get_exp_nodes()
    if not nodes:
        return jsonify(status=1, error='Unable to read node information from the database.')

    return jsonify(status=0, nodes=nodes)

@app.route('/api/exp_info')
def exp_info():
    ei = get_exp_info()
    if not ei:
        return jsonify(status=1)
    
    return jsonify(ei, status=0)

@app.route('/api/routing/<node>')
def get_routing(node):
    table = get_route_tables(node, 'routes')
    if not table:
        return jsonify(status=1, error='routing not found. Is the agent running?')

    return jsonify(status=0, table=table)

@app.route('/api/routing/path')
def api_routing_path():
    try:
        node_a = request.args.get('src')
        node_b = request.args.get('dst')
    except ValueError:
        return jsonify(status=1, error='You must give two nodes: via ?src=node&dst=node')

    complete, path = get_route_path(node_a, node_b)
    if not path:
        return jsonify(status=1, error='Unable to find path from {} to {}.'.format(node_a, node_b))

    return jsonify(status=0, path=path, complete=complete)

@app.route('/api/<data_source>/json', methods=['get'])
def http_client_request(data_source):
    try:
        start = request.args.get('start', type=int)
        stop = request.args.get('stop', type=int)
        step = request.args.get('step', default=1000, type=int)
        metric = request.args.get('metric', type=str)
        agent = request.args.get('agent', type=str)
        node = request.args.get('node', default=None, type=str)
    except ValueError:
        return jsonify(status=1, error="Badly formatted URL.") 
   
    if data_source == 'time_plot':
        if not node:
            node = get_viz_agent_nodes('time_plot', agent)

        data = get_viz_time_plot_data(start, stop, step, node, metric, agent)
    else:
        data = None

    if not data:
        return jsonify(status=1, data=None)

    return jsonify(status=0, data=data)

@app.route('/api/<node>/viztypes')
def node_viztypes(node):
    '''Return (in JSON) all things visual for the given node.'''
    # db.experiment_data.find({agent: "viz_data", host: 'crypto1'})
    nvt = get_node_viztypes(node)
    if not nvt:
        return jsonify(status=1)

    return jsonify(status=0, types=nvt)

@app.route('/api/<node>/agents')
def node_agents(node):
    agents = get_node_agents(node)
    if not agents:
        return jsonify(status=1)

    return jsonify(status=0, agents=agents)

#
# context processors. this probably should go elsewhere as they are not views.
#
# give context to rendered templates.
@app.context_processor
def inject_dashboard_variables():
    ui_types = get_viz_ui_types()
    log.debug('found ui types: {}'.format(ui_types))
    for ui_type in ui_types:
        agents = get_viz_agents(ui_type['datatype'])
        log.debug('found ui agents for type {}: {}'.format(ui_type['datatype'], agents))
        ui_type.update({'agents': agents})

    exe_agents = get_executable_agents()
    nodes = get_exp_nodes()
    nodes.sort()

    return dict(graphables=ui_types, exe_agents=exe_agents, nodes=nodes)
