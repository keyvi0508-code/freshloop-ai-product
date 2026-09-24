import { defineConfig, loadEnv } from 'vite';
import generateRecipe from './server/api/generate-recipe.js';
import analyzeInventory from './server/api/analyze-inventory.js';
import ingredientGuidance from './server/api/ingredient-guidance.js';
import recipeImage from './server/api/recipe-image.js';

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 48 * 1024 * 1024) {
        reject(new Error('上传内容超过 48 MiB 限制'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(new Error('请求内容不是有效 JSON')); }
    });
    request.on('error', reject);
  });
}

function devApi(handler) {
  return async (request, response) => {
    response.status = (statusCode) => { response.statusCode = statusCode; return response; };
    response.json = (payload) => {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(payload));
    };
    try {
      request.body = await readJsonBody(request);
      await handler(request, response);
    } catch (error) {
      if (!response.headersSent) response.status(400).json({ error: error.message });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (!process.env.DEEPSEEK_API_KEY && env.DEEPSEEK_API_KEY) process.env.DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;
  return {
    plugins: [{
      name: 'freshloop-local-api',
      configureServer(server) {
        server.middlewares.use('/api/generate-recipe', devApi(generateRecipe));
        server.middlewares.use('/api/analyze-inventory', devApi(analyzeInventory));
        server.middlewares.use('/api/ingredient-guidance', devApi(ingredientGuidance));
        server.middlewares.use('/api/recipe-image', devApi(recipeImage));
      }
    }]
  };
});
