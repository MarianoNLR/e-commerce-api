export function sendSuccess(res, data, statusCode = 200, meta = null) {
  const response = {
    success: true,
    data: data ?? null,
    error: null,
    meta: meta ?? null
  }

  return res.status(statusCode).json(response)
}

export function sendError(res, err, statusCode = 500, meta = null) {
  const errorObj = err instanceof Error ? err : (err || {})
  const response = {
    success: false,
    data: null,
    error: {
      code: errorObj.code || 'INTERNAL_ERROR',
      message: errorObj.message || 'Internal server error.',
      details: errorObj.details || null
    }
  }

  if (meta !== null) {
    response.meta = meta
  }

  return res.status(statusCode).json(response)
}
