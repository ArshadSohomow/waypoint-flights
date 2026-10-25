# Local static server with the same SPA fallback as Cloudflare's not_found_handling.
import http.server, os, sys
ROOT = os.path.join(os.path.dirname(__file__), '..', 'dist')
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def send_head(self):
        p = self.translate_path(self.path)
        if not os.path.exists(p): self.path = '/index.html'
        return super().send_head()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8787), H).serve_forever()
