#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --no-input

# Important: We are NOT running 'python manage.py migrate' here,
# because your db.sqlite3 file is already committed with its schema and data.
# Any schema changes would require re-committing the db.sqlite3 file.