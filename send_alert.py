#!/usr/bin/env python

import argparse
from libdeterdash import DeterDashboard

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Send a text alert to a running Deter Dashboard instance.')
    ap.add_argument('-f', '--from', help='Who the alert is from.', dest='frm', type=str)
    ap.add_argument('-s', '--server', help='Hostname of alert database server.', dest='server', type=str,
                    default='localhost')
    ap.add_argument('-p', '--port', help='Port of alert database server.', dest='port', type=int, default=27018)
    ap.add_argument('-a', '--alert', help='Text of alert.', dest='alert', type=str)
    args = ap.parse_args()

    dash = DeterDashboard()
    dash.send_alert(args.frm, args.alert)
