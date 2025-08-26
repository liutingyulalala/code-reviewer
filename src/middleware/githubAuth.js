const crypto = require('crypto');

/**
 * 验证GitHub Webhook签名
 * 确保请求来自GitHub并且payload未被篡改
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象  
 * @param {Function} next - Express next函数
 */
function verifyGitHubSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  // 如果没有配置secret，跳过验证（开发环境）
  if (!secret) {
    console.warn('⚠️  警告: 未设置GITHUB_WEBHOOK_SECRET环境变量，跳过签名验证');
    return next();
  }

  if (!signature) {
    console.error('❌ 缺少GitHub签名头');
    return res.status(401).json({
      error: '未授权',
      message: '缺少GitHub签名'
    });
  }

  try {
    // 计算期望的签名
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(req.body)
      .digest('hex');

    // 使用安全的字符串比较
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );

    if (!isValid) {
      console.error('❌ GitHub签名验证失败');
      return res.status(401).json({
        error: '未授权',
        message: 'GitHub签名验证失败'
      });
    }

    console.log('✅ GitHub签名验证成功');
    next();
  } catch (error) {
    console.error('❌ 签名验证过程中发生错误:', error);
    return res.status(500).json({
      error: '内部服务器错误',
      message: '签名验证失败'
    });
  }
}

module.exports = {
  verifyGitHubSignature
};
