const express = require('express');
const { createServer: createViteServer } = require('vite');

async function startServer() {
  const app = express();
  
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      host: '0.0.0.0',
    },
  });
  
  app.use(vite.middlewares);
  
  app.listen(5173, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:5173');
  });
}

startServer();
