import http from 'http';
import fs from 'fs';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import sendEmailHandler from './api/send-email';
import sendMessUpdateHandler from './api/send-mess-update';
import requestPasswordResetHandler from './api/auth/request-password-reset';
import verifyAndResetPasswordHandler from './api/auth/verify-and-reset-password';
import loginWithPasswordHandler from './api/auth/login-with-password';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Password Reset (Forgot Password) Flow Routes
  app.post('/api/auth/request-password-reset', requestPasswordResetHandler);
  app.post('/api/auth/verify-and-reset-password', verifyAndResetPasswordHandler);
  app.post('/api/auth/login-with-password', loginWithPasswordHandler);

  // Automated Member-Specific Daily Mess Update Flow Route
  app.all('/api/send-mess-update', sendMessUpdateHandler);

  // General Transactional Email Route
  app.all('/api/send-email', sendEmailHandler);

  // Android TWA / Digital Asset Links Endpoint
  app.get('/.well-known/assetlinks.json', (_req, res) => {
    const assetlinksPath = path.resolve(__dirname, 'public/.well-known/assetlinks.json');
    if (fs.existsSync(assetlinksPath)) {
      res.setHeader('Content-Type', 'application/json');
      return res.sendFile(assetlinksPath);
    }
    const distAssetlinksPath = path.resolve(__dirname, 'dist/.well-known/assetlinks.json');
    if (fs.existsSync(distAssetlinksPath)) {
      res.setHeader('Content-Type', 'application/json');
      return res.sendFile(distAssetlinksPath);
    }
    return res.status(404).json({ error: 'assetlinks.json not found' });
  });

  // Healthcheck endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasResendKey: !!process.env.RESEND_API_KEY,
      time: new Date().toISOString(),
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite middlewares in development with http server attached for HMR
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        forwardConsole: false,
        hmr: {
          server,
        },
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    // Explicitly transform and serve index.html with all Vite plugins (including @vitejs/plugin-react preamble)
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = await fs.promises.readFile(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // Serve production static assets
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[KhaonKhata Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
