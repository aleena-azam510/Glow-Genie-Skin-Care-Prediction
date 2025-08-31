from pathlib import Path
import os
import dj_database_url
import sys

# --- CORE SETTINGS FROM ENVIRONMENT VARIABLES ---
BASE_DIR = Path(__file__).resolve().parent.parent

# Get SECRET_KEY from a Fly.io secret
SECRET_KEY = os.environ.get('SECRET_KEY', 'your_insecure_default_key_for_dev')

# Use an environment variable for DEBUG mode
DEBUG = os.environ.get('DEBUG') == 'True'

# Get the app name from Fly.io's environment variable
FLY_APP_NAME = os.environ.get('FLY_APP_NAME')

# Dynamically set ALLOWED_HOSTS for Fly.io and local development
if FLY_APP_NAME:
    ALLOWED_HOSTS = [f"{FLY_APP_NAME}.fly.dev", "localhost", "127.0.0.1"]
else:
    # This is for local development only
    ALLOWED_HOSTS = ['localhost', '127.0.0.1']
    
# Dynamically set CSRF_TRUSTED_ORIGINS
CSRF_TRUSTED_ORIGINS = [f"https://{FLY_APP_NAME}.fly.dev"] if FLY_APP_NAME else []
CSRF_TRUSTED_ORIGINS.extend(["http://localhost:8000"])

# --- APPLICATION DEFINITION ---
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party apps
    'whitenoise.runserver_nostatic', # For serving static files in development
    'corsheaders',
    'jsoneditor',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.facebook',
    'allauth.socialaccount.providers.github',
    'django.contrib.sites',
    # Your project apps
    'predictor',
    'users',
    'reviews',
    'skin_identifier',
    'chatbot',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # WhiteNoise is required for serving static files in production
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'corsheaders.middleware.CorsMiddleware',
]

LOGIN_URL = 'auth_page'
LOGIN_REDIRECT_URL = '/'
CORS_ALLOW_ALL_ORIGINS = True
ROOT_URLCONF = 'skinpredictor.urls'

# --- TEMPLATES ---
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(BASE_DIR, 'templates'),
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'allauth.account.context_processors.account',
                'allauth.socialaccount.context_processors.socialaccount',
            ],
        },
    },
]

WSGI_APPLICATION = 'skinpredictor.wsgi.application'

# --- DATABASE CONFIGURATION FOR FLY.IO ---
# Fly.io automatically sets a DATABASE_URL environment variable.
if os.environ.get('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.config(conn_max_age=600)
    }
else:
    # Fallback to a local SQLite database for development if needed
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# --- AUTHENTICATION & ALLAUTH SETTINGS ---
AUTHENTICATION_BACKENDS = {
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
}

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'APP': {
            'client_id': os.environ.get('GOOGLE_CLIENT_ID'),
            'secret': os.environ.get('GOOGLE_SECRET_KEY'),
        }
    },
    'facebook': {
        'APP': {
            'client_id': os.environ.get('FACEBOOK_CLIENT_ID'),
            'secret': os.environ.get('FACEBOOK_SECRET_KEY'),
        }
    },
    'github': {
        'APP': {
            'client_id': os.environ.get('GITHUB_CLIENT_ID'),
            'secret': os.environ.get('GITHUB_SECRET_KEY'),
        }
    }
}

LOGIN_REDIRECT_URL = '/'
ACCOUNT_LOGOUT_REDIRECT_URL = 'auth_page'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
SITE_ID = 1

# --- STATIC FILES CONFIGURATION FOR PRODUCTION (WHITENOISE) ---
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'skinpredictor', 'static'),
]
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# --- MEDIA FILES (USER UPLOADS) ---
# For production, it is highly recommended to use a cloud storage service
# like AWS S3 or Fly.io Volumes for media files.
# The code below is a simplified setup for local development.
# You will need to change this when deploying to production with large files.

# If you use Fly.io Volumes, your MEDIA_ROOT might look like this:
# MEDIA_URL = "/media/"
# MEDIA_ROOT = "/media_volume" 

# For development, you can keep the local file system.
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# --- SECURITY & LOGGING ---
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
CONTACT_EMAIL = 'skinissuesfyp@gmail.com'
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'stream': sys.stdout, # Log to stdout for Fly.io logs
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO' if DEBUG else 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'predictor': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'chatbot': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}