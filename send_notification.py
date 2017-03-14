#!/usr/bin/env python

import argparse
from sys import stdin
from libdeterdash import DeterDashboard, DashboardNotificationLevel

if __name__ == '__main__':
    notifs = [n.name for n in DashboardNotificationLevel]
    ap = argparse.ArgumentParser(description='Send a text notification to a running Deter Dashboard instance.')
    ap.add_argument('-f', '--from', help='Who the notification is from.', dest='frm', type=str)
    ap.add_argument('-s', '--server', help='Hostname of notification database server.', dest='server', type=str,
                    default='localhost')
    ap.add_argument('-p', '--port', help='Port of notification database server.', 
                    dest='port', type=int, default=27018)
    ap.add_argument('-t', '--text', help='Text of notification. If -, read from stdin (this is the default).', 
                    dest='text', type=str, default='-')
    ap.add_argument('-l', '--level', 
                    help='The level of notification. Must be one of: {}. Default is INFO.'.format(', '.join(notifs)),
                    default='INFO', dest='level', type=str)  # python Enum not integrated into argparse. 
    args = ap.parse_args()

    try:
        level = DashboardNotificationLevel[args.level.upper()]
    except KeyError:
        print('Bad level given, "{}". Must be one of {}'.format(args.level, notifs))
        exit(1)

    text = args.text
    if text == '-':
        text = ' '.join([line.strip() for line in stdin.readlines()])

    DeterDashboard().send_notification(args.frm, text, level)
