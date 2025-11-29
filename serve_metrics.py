import http.server
import socketserver
import os

PORT = 8000

METRICS_DIR = os.path.join(os.getcwd(), "metrics")

class MetricsHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET")
        self.send_header("Access-Control-Allow-Headers", "*")
        return super().end_headers()

    def translate_path(self, path):
        # Only serve metrics folder
        if path.startswith("/metrics"):
            rel = path[len("/metrics"):]
            return os.path.join(METRICS_DIR, rel.strip("/"))
        return http.server.SimpleHTTPRequestHandler.translate_path(self, path)

print(f"Serving metrics at http://0.0.0.0:{PORT}/metrics/")
os.makedirs(METRICS_DIR, exist_ok=True)

with socketserver.TCPServer(("", PORT), MetricsHandler) as httpd:
    httpd.serve_forever()
