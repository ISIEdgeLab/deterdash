import logging
from pymongo import ASCENDING
from libdeterdash import DeterDashboard
from db import magi_db

log = logging.getLogger(__name__)

def get_notifications(timestamp):
    log.debug('Getting notifcations from {}'.format(timestamp))
    db = magi_db()
    cursor = db.experiment_data.find({
        'agent': DeterDashboard.viz_notifications_table,
        'created': {'$gte': float(timestamp)}
    }, {
        '_id': False,
        'notifer': True,
        'text': True,
        'host': True,
        'level': True,
        'created': True
    }).sort('created', ASCENDING)

    if cursor.alive:
        notifications = list(cursor)
        log.debug('Found {} notifcations'.format(len(notifications)))
        return notifications
    
    log.debug('Found 0 notifications')
    return None
