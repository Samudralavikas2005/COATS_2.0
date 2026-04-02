"""
WSGI config for coats project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'coats.settings')

# 🚀 Ensure media directory exists for uploads (Render ephemeral storage)
try:
    media_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'media')
    if not os.path.exists(media_path):
        os.makedirs(media_path, exist_ok=True)
except Exception:
    pass

application = get_wsgi_application()
