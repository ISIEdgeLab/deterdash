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
    args = parser.parse_args()
    loglevel = handleLoggingArgs(args)
    
    # quiet the URL messages. 
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    from deterdash import get_app
    app = get_app()
    app.run(host='0.0.0.0', port=args.port, debug=loglevel==logging.DEBUG)
