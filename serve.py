import http.server
import socket
import socketserver
import webbrowser
import os
import sys
import mimetypes

# Set stdout to UTF-8 to prevent Windows charmap issues
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8082
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "www")

# Ensure proper MIME types for WebAssembly and ES modules
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('application/javascript', '.js')

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    local_ip = get_local_ip()
    print("=" * 65)
    print("  [RUST + WASM] Clinometer Trigonometry Lab Server")
    print("=" * 65)
    print(f"  Local URL (this PC):        http://localhost:{PORT}")
    print(f"  Network URL (phone/tablet): http://{local_ip}:{PORT}")
    print("=" * 65)
    print(f"  Serving directory: {DIRECTORY}")
    print("  Press Ctrl+C to stop the server.")
    print("=" * 65)

    # Automatically launch default web browser
    try:
        webbrowser.open(f"http://localhost:{PORT}")
    except Exception:
        pass

    try:
        with ThreadedHTTPServer(("", PORT), Handler) as httpd:
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nServer gracefully stopped by user.")
    except Exception as e:
        print(f"Server error: {e}")
