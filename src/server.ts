import app from './app';

const port = process.env.PORT || 3000;

console.log(`🚀 Valkode server starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};