import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, '../../Healther-linker/output/pipeline_output.json');

export function createPipelineRouter() {
  const router = Router();

  router.get('/output', (_req, res) => {
    if (!fs.existsSync(OUTPUT_PATH)) {
      res.status(404).json({ message: 'pipeline_output.json not found' });
      return;
    }
    const raw = fs.readFileSync(OUTPUT_PATH, 'utf-8');
    res.type('json').send(raw);
  });

  return router;
}
