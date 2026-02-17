"""
WSGI entry-point.

Usage (dev):
    flask run --host=0.0.0.0 --port=5000 --reload

The FLASK_APP env-var is NOT needed because this file exposes `app`.
"""

from app import createApp

app = createApp()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
