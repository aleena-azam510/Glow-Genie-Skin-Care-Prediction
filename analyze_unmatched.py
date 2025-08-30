from django.core.management.base import BaseCommand
from collections import Counter

class Command(BaseCommand):
    help = "Analyze unmatched queries log and show top queries"

    def handle(self, *args, **kwargs):
        log_file_path = "unmatched_queries.log"
        try:
            with open(log_file_path, "r") as f:
                queries = f.read().splitlines()
        except FileNotFoundError:
            self.stdout.write(f"Log file '{log_file_path}' not found.")
            return

        counter = Counter(queries)
        most_common = counter.most_common(20)

        self.stdout.write(f"Top 20 unmatched queries:\n")
        for i, (query, count) in enumerate(most_common, start=1):
            self.stdout.write(f"{i}. {query} (asked {count} times)")
