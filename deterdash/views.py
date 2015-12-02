import logging 
from datetime import datetime
from flask import render_template, jsonify, request

from . import app
from .topology import get_nodes, get_topology
from .viz_data import get_viz_ui_types, get_viz_agents, get_viz_agent
from .viz_data import get_viz_agent_nodes
from .exp_info import get_exp_info

from .horizon_chart import get_viz_horz_data

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
# api paths.
#
@app.route('/api/<datatype>/<agentname>/nodes')
def agent_nodes(datatype, agentname):
    log.debug('Lookging for nodes for {}'.format(agentname))
    nodes = get_viz_agent_nodes(datatype, agentname)
    return jsonify(status=0, nodes=nodes)

@app.route('/api/topology')
def topology():
    nodes, edges = get_topology()
    return jsonify(status=0, nodes=nodes, edges=edges)

@app.route('/api/exp_info')
def exp_info():
    ei = get_exp_info()
    if not ei:
        return jsonify(status=1)
    
    return jsonify(ei, status=0)

@app.route('/api/<data_source>/json', methods=['get'])
def http_client_request(data_source):
    # input should probably be sanitised here. :)
    try:
        start = int(request.args.get('start'))
        stop = int(request.args.get('stop'))
        step = int(request.args.get('step'))
        node = str(request.args.get('node'))
        metric = str(request.args.get('metric'))
        agent = str(request.args.get('agent'))
    except valueerror:
        return jsonify(status=1, error='badly formatted url attributes.')

    # log.debug('{}: {} - {}/{}/{}'.format(
    #     metric,
    #     node,
    #     datetime.fromtimestamp(start).strftime('%h:%m:%s'),
    #     datetime.fromtimestamp(stop).strftime('%h:%m:%s'),
    #     step))
    
    if data_source == 'horizon_chart':
        data = get_viz_horz_data(start, stop, step, node, metric, agent)
    else:
        data = None

    if not data:
        return jsonify(status=1, counts=[], max_extent=0)

    return jsonify(status=0, counts=data, max_extent=max(data))

#
# context processors. this probably should go elsewhere as they are not views.
#

# give the graphable context to rendered templates.
@app.context_processor
def inject_graphables():
    ui_types = get_viz_ui_types()
    log.debug('found ui types: {}'.format(ui_types))
    for ui_type in ui_types:
        agents = get_viz_agents(ui_type['datatype'])
        log.debug('found ui agents for type {}: {}'.format(ui_type['datatype'], agents))
        ui_type.update({'agents': agents})

    return dict(graphables=ui_types)
