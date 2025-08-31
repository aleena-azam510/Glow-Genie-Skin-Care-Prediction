import os
from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.files.storage import default_storage

class Command(BaseCommand):
    help = 'Uploads all local media files to the S3 bucket.'

    def handle(self, *args, **options):
        self.stdout.write("Starting media file upload to S3...")

        # Ensure your MEDIA_ROOT is correctly set in settings.py
        local_media_root = settings.MEDIA_ROOT

        for root, dirs, files in os.walk(local_media_root):
            for filename in files:
                local_path = os.path.join(root, filename)
                relative_path = os.path.relpath(local_path, local_media_root)

                if not default_storage.exists(relative_path):
                    with open(local_path, 'rb') as f:
                        self.stdout.write(f"Uploading: {relative_path}")
                        default_storage.save(relative_path, f)
                else:
                    self.stdout.write(f"Skipping (already exists): {relative_path}")

        self.stdout.write(self.style.SUCCESS("Media file upload complete."))