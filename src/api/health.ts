import { Hono } from 'hono';
import { asyncHandler, sendResponse } from '@/utils/apiHandler';

const healthApi = new Hono();

healthApi.get('/health', asyncHandler(async (c) => {
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'valkode-executor'
  };
  
  return sendResponse(c, 200, healthData, 'Service is healthy');
}));

export { healthApi };