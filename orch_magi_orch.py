#!/usr/bin/env python

import logging
import argparse
import yaml
import json
import tempfile
import subprocess

from sys import stdin
from os.path import isfile

log = logging.getLogger(__name__)

def handleLoggingArgs(args):
    logLevels = {
       u'none': 100,
       u'all': 0,
       u'debug': logging.DEBUG,
       u'info': logging.INFO,
       u'warning': logging.WARNING,
       u'error': logging.ERROR,
       u'critical': logging.CRITICAL
    }
    log_format = u'%(asctime)s %(name)-12s %(levelname)-8s %(message)s'
    log_datefmt = u'%m-%d %H:%M:%S'
    logging.basicConfig(format=log_format, datefmt=log_datefmt,
                        level=logLevels[args.loglevel])

    log.debug('Logging set to {}'.format(args.loglevel))

    return logLevels[args.loglevel]


def addLoggingArgs(ap):
    ap.add_argument("-l", "--loglevel", dest="loglevel",
                    help="The level at which to log. Must be one of "
                    "none, debug, info, warning, error, or critical. Default is none. ("
                    "This is mostly used for debugging.)",
                    default='none', choices=['none', u'all', u'debug', u'info', u'warning',

                                             u'error', u'critical'])

def execute_cmd(cmd, ev):
    proc = subprocess.Popen(cmd.split(), stdout=subprocess.PIPE, universal_newlines=True)
    for stdout_line in iter(proc.stdout.readline, ""):
        yield stdout_line

    proc.stdout.close()
    ev = proc.wait()

if __name__ == '__main__':
    def_conf = '/var/log/magi/config/experiment.conf'
    def_path = '/share/magi/current/magi_orchestrator.py'

    ap = argparse.ArgumentParser(description='Given an AAL on stdin, run the Magi Orchestrator with that AAL.')
    addLoggingArgs(ap)
    ap.add_argument('-c', '--config', type=str, default=def_conf, 
                    help='Full path to default Magi config file. Default is {}.'.format(def_conf))
    ap.add_argument('-p', '--path', type=str, default=def_path,
                    help='Full path to magi orchestrator script. Default is {}.'.format(def_path))
    args = ap.parse_args()
    handleLoggingArgs(args)

    if not isfile(args.config):
        log.critical('Config file does not exist: {}'.format(args.config))
        exit(1)

    log.info('Waiting for AAL...')
    line = stdin.readline()
    log.debug('read line from socket: {}'.format(line))
    aal_json = json.loads(line)
    aal = yaml.safe_load(line)

    log.debug('Got AAL:\n{}'.format(aal))

    exit_code = 0
    try:
        with tempfile.NamedTemporaryFile(mode='w', delete=False) as tmpfile:
            log.debug('AAL read. Saving to tmp file: {}'.format(tmpfile.name))
            yaml.dump(aal, stream=tmpfile)
            tmpfile.flush()

            log.info('Spawning Magi Orchestrator...')
            cmd = '{} --config={} -b localhost -f {} -o /dev/null --nocolor'.format(args.path, args.config, tmpfile.name)
            log.info('running: {}'.format(cmd))
            for l in execute_cmd(cmd, exit_code):
                print(l)

    except Exception as e:
        log.critical('Error: {}'.format(e))
        exit_code = 1

    log.debug('Exiting with code: {}'.format(exit_code))
    exit(exit_code)
