import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Parse the URL
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // Handle static assets
      if (pathname.startsWith('/_next/static/')) {
        // Try multiple possible static asset locations
        const possiblePaths = [
          path.join(process.cwd(), '.next', 'static'),
          path.join(process.cwd(), '.next', 'standalone', '.next', 'static'),
          path.join(process.cwd(), 'public')
        ];

        let filePath = null;
        for (const staticPath of possiblePaths) {
          const testPath = path.join(staticPath, pathname.replace('/_next/static/', ''));
          if (fs.existsSync(testPath)) {
            filePath = testPath;
            break;
          }
        }

        if (filePath) {
          const ext = path.extname(filePath);
          const contentType = {
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.woff2': 'font/woff2',
            '.woff': 'font/woff',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject',
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.ico': 'image/x-icon',
          }[ext] || 'application/octet-stream';

          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          
          const stream = fs.createReadStream(filePath);
          stream.pipe(res);
          return;
        }
      }

      // Handle all other requests with Next.js
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Handle port conflicts
  const startServer = (portToTry) => {
    server.listen(portToTry, (err) => {
      if (err) {
        if (err.code === 'EADDRINUSE') {
          console.log(`⚠️ Port ${portToTry} is busy, trying ${portToTry + 1}...`);
          startServer(portToTry + 1);
        } else {
          console.error('Server error:', err);
        }
      } else {
        console.log(`✅ Server ready on http://${hostname}:${portToTry}`);
      }
    });
  };

  startServer(port);
}); 