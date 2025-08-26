const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const webhookRoutes = require('./routes/webhook');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet());
app.use(cors());

// JSON解析中间件 - 对于webhook，我们需要原始body用于签名验证
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'GitHub Webhook服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// Webhook路由
app.use('/webhook', webhookRoutes);

// 错误处理中间件
app.use(errorHandler);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: '未找到请求的资源',
    path: req.originalUrl 
  });
});

/**
 * 启动服务器
 */
function startServer() {
  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在端口 ${PORT}`);
    console.log(`📋 健康检查: http://localhost:${PORT}/health`);
    console.log(`🔗 Webhook端点: http://localhost:${PORT}/webhook/github`);
  });
}

// 只有在直接运行此文件时才启动服务器
if (require.main === module) {
  startServer();
}

module.exports = app;
