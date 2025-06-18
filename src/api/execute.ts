import { Hono } from 'hono';
import type { ExecutionRequest } from '@/types/execution';
import { CodeExecutor } from '@/engine/executor';
import { asyncHandler, sendResponse, validateRequest } from '@/utils/apiHandler';

const executeApi = new Hono();
const executor = new CodeExecutor();

// Validator for execution request
const isExecutionRequest = (data: unknown): data is ExecutionRequest => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    'language' in data &&
    typeof (data as any).code === 'string' &&
    typeof (data as any).language === 'string'
  );
};

executeApi.post('/execute', asyncHandler(async (c) => {
  const body = await c.req.json();
  const request = validateRequest(body, isExecutionRequest);
  
  const result = await executor.execute(request);
  
  return sendResponse(c, 200, result, 'Code executed successfully');
}));

executeApi.get('/languages', asyncHandler(async (c) => {
  const languages = executor.getSupportedLanguages();
  
  return sendResponse(c, 200, { languages }, 'Supported languages retrieved');
}));

export { executeApi };