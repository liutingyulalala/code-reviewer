// test
const express = require('express');
const router = express.Router();
// const { verifyGitHubSignature } = require('../middleware/githubAuth');
const { handlePullRequestEvent } = require('../handlers/pullRequestHandler');

/**
 * GitHub Webhook端点
 * 接收GitHub发送的webhook事件
 */
router.post('/github', async (req, res) => {
  try {
    // 获取事件类型
    const eventType = req.headers['x-github-event'];
    const payload = JSON.parse(req.body);

    console.log(`📡 收到GitHub事件: ${eventType}`);

    // 根据事件类型处理
    switch (eventType) {
      case 'pull_request':
        await handlePullRequestEvent(payload, req, res);
        break;
      
      case 'ping':
        // GitHub webhook测试事件
        res.status(200).json({
          message: 'Webhook接收成功！',
          zen: payload.zen
        });
        break;
      
      default:
        console.log(`⚠️  未处理的事件类型: ${eventType}`);
        res.status(200).json({
          message: `事件 ${eventType} 已接收但未处理`,
          processed: false
        });
    }
  } catch (error) {
    console.error('❌ 处理webhook时发生错误:', error);
    res.status(500).json({
      error: '内部服务器错误',
      message: error.message
    });
  }
});

module.exports = router;
