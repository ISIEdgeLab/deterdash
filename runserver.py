#!/usr/bin/env python

import logging
import argparse
from deterdash.argParseLog import handleLoggingArgs, addLoggingArgs

log = logging.getLogger(__name__)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='DETER Situational Awareness Application')
    addLoggingArgs(parser)
    parser.add_argument('-p', '--port', type=int, default=5000, 
                        help='Port to serve on. Default is 5000.')
    parser.add_argument('-a', '--agentdir', type=str, default='./agents',
                        help='Path to Magi Agents to serve via this server.')
    args = parser.parse_args()
    loglevel = handleLoggingArgs(args)
    
    # quiet the URL messages. 
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)

    from deterdash import get_app

    app = get_app()

    # Do some initialization of the app/database/context before we start the server itself.
    with app.app_context():
        # Load the static viz types (topology, time plot, etc)
        from deterdash.viz_data import load_default_viz_ui_types
        load_default_viz_ui_types()

        # Load the agents that this server will serve. 
        if args.agentdir:
            from deterdash.exe_agents import load_static_agents
            load_static_agents(args.agentdir)

    app.run(host='0.0.0.0', port=args.port, debug=loglevel==logging.DEBUG)
