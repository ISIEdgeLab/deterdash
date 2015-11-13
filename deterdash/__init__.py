import logging
from flask import Flask

log = logging.getLogger(__name__)

app = Flask(__name__)

def get_app():
    from deterdash.viz_data import load_default_viz_ui_types
    with app.app_context():
        load_default_viz_ui_types()

    return app

# make sure to import the views here, so all modules have access to them.
import deterdash.views
