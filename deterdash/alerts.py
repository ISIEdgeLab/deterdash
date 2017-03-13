import logging
from pymongo import ASCENDING
from libdeterdash import DeterDashboard
from db import magi_db

log = logging.getLogger(__name__)

def get_alerts(timestamp):
    log.debug('Getting alerts from {}'.format(timestamp))
    db = magi_db()
    cursor = db.experiment_data.find({
        'agent': DeterDashboard.viz_alerts_table,
        'created': {'$gte': float(timestamp)}
    }, {
        '_id': False,
        'alerter': True,
        'text': True,
        'host': True
    }).sort('created', ASCENDING)

    if cursor.alive:
        alerts = list(cursor)
        log.debug('Found {} alerts'.format(len(alerts)))
        return alerts
    
    log.debug('Found 0 alerts')
    return None
