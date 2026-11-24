import type { ErrorRequestHandler } from 'express';
import { ConflictError, NotFoundError, ValidationError } from '../../domain/domain-error';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
  } else if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
  } else if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message });
  } else if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'JSON inválido' });
  } else {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
};
