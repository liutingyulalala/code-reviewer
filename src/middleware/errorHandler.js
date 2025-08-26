/**
 * 全局错误处理中间件
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express next函数
 */
function errorHandler(err, req, res, next) {
  console.error('❌ 应用错误:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // 如果响应已经发送，交给Express默认错误处理器
  if (res.headersSent) {
    return next(err);
  }

  // 根据错误类型返回相应的状态码和信息
  let statusCode = 500;
  let message = '内部服务器错误';

  // 自定义错误类型处理
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '请求数据验证失败';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = '未授权访问';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = '禁止访问';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = '资源未找到';
  } else if (err.message && err.message.includes('JSON')) {
    statusCode = 400;
    message = 'JSON数据格式错误';
  }

  // 返回错误响应
  res.status(statusCode).json({
    error: message,
    message: err.message,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
    // 在生产环境中不返回错误堆栈
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

module.exports = {
  errorHandler
};
