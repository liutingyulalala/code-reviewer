/**
 * 处理GitHub Pull Request事件
 * @param {Object} payload - GitHub webhook payload
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function handlePullRequestEvent(payload, req, res) {
  try {
    const { action, pull_request, repository, sender } = payload;
    
    console.log(`🔄 处理Pull Request事件: ${action}`);
    
    // 提取关键信息
    const prInfo = extractPullRequestInfo(payload);
    
    // 根据动作类型处理
    switch (action) {
      case 'opened':
        await handlePullRequestOpened(prInfo);
        break;
      case 'closed':
        await handlePullRequestClosed(prInfo);
        break;
      case 'reopened':
        await handlePullRequestReopened(prInfo);
        break;
      case 'synchronize':
        await handlePullRequestSynchronized(prInfo);
        break;
      case 'ready_for_review':
        await handlePullRequestReadyForReview(prInfo);
        break;
      default:
        console.log(`📝 PR动作 '${action}' 已接收但未特殊处理`);
    }

    // 返回成功响应
    res.status(200).json({
      message: `Pull Request ${action}事件处理成功`,
      pullRequest: {
        number: prInfo.number,
        title: prInfo.title,
        state: prInfo.state
      },
      processed: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 处理Pull Request事件时发生错误:', error);
    throw error;
  }
}

/**
 * 从payload中提取Pull Request关键信息
 * @param {Object} payload - GitHub webhook payload
 * @returns {Object} 提取的PR信息
 */
function extractPullRequestInfo(payload) {
  const { pull_request, repository, sender } = payload;
  
  return {
    // PR基本信息
    number: pull_request.number,
    title: pull_request.title,
    body: pull_request.body,
    state: pull_request.state,
    draft: pull_request.draft,
    
    // 分支信息
    sourceBranch: pull_request.head.ref,
    targetBranch: pull_request.base.ref,
    sourceRepo: pull_request.head.repo.full_name,
    targetRepo: pull_request.base.repo.full_name,
    
    // 作者信息
    author: {
      login: pull_request.user.login,
      id: pull_request.user.id,
      type: pull_request.user.type
    },
    
    // 提交信息
    commits: pull_request.commits,
    additions: pull_request.additions,
    deletions: pull_request.deletions,
    changedFiles: pull_request.changed_files,
    
    // 仓库信息
    repository: {
      name: repository.name,
      fullName: repository.full_name,
      owner: repository.owner.login,
      private: repository.private
    },
    
    // 触发者信息
    sender: {
      login: sender.login,
      id: sender.id,
      type: sender.type
    },
    
    // URL信息
    htmlUrl: pull_request.html_url,
    diffUrl: pull_request.diff_url,
    patchUrl: pull_request.patch_url,
    
    // 时间信息
    createdAt: pull_request.created_at,
    updatedAt: pull_request.updated_at
  };
}

/**
 * 处理PR创建事件
 * @param {Object} prInfo - PR信息对象
 */
async function handlePullRequestOpened(prInfo) {
  console.log(`🆕 新的Pull Request创建:`);
  console.log(`   #${prInfo.number}: ${prInfo.title}`);
  console.log(`   作者: ${prInfo.author.login}`);
  console.log(`   分支: ${prInfo.sourceBranch} → ${prInfo.targetBranch}`);
  console.log(`   更改: +${prInfo.additions} -${prInfo.deletions} (${prInfo.changedFiles}个文件)`);
  
  // 在这里添加自定义业务逻辑
  // 例如：自动代码审查、通知相关人员、标签分配等
  await performCodeReview(prInfo);
}

/**
 * 处理PR关闭事件
 * @param {Object} prInfo - PR信息对象
 */
async function handlePullRequestClosed(prInfo) {
  console.log(`🔒 Pull Request已关闭:`);
  console.log(`   #${prInfo.number}: ${prInfo.title}`);
  console.log(`   作者: ${prInfo.author.login}`);
  
  // 在这里添加PR关闭后的处理逻辑
  // 例如：清理临时资源、发送通知、更新统计数据等
}

/**
 * 处理PR重新打开事件
 * @param {Object} prInfo - PR信息对象
 */
async function handlePullRequestReopened(prInfo) {
  console.log(`🔄 Pull Request已重新打开:`);
  console.log(`   #${prInfo.number}: ${prInfo.title}`);
  console.log(`   作者: ${prInfo.author.login}`);
  
  // 重新启动相关流程
}

/**
 * 处理PR同步事件（新提交推送）
 * @param {Object} prInfo - PR信息对象
 */
async function handlePullRequestSynchronized(prInfo) {
  console.log(`🔄 Pull Request已同步（新提交）:`);
  console.log(`   #${prInfo.number}: ${prInfo.title}`);
  console.log(`   作者: ${prInfo.author.login}`);
  
  // 重新进行代码审查
  await performCodeReview(prInfo);
}

/**
 * 处理PR准备审查事件
 * @param {Object} prInfo - PR信息对象
 */
async function handlePullRequestReadyForReview(prInfo) {
  console.log(`✅ Pull Request准备就绪，等待审查:`);
  console.log(`   #${prInfo.number}: ${prInfo.title}`);
  console.log(`   作者: ${prInfo.author.login}`);
  
  // 触发正式审查流程
  await performCodeReview(prInfo);
}

/**
 * 执行代码审查（示例实现）
 * @param {Object} prInfo - PR信息对象
 */
async function performCodeReview(prInfo) {
  console.log(`🔍 开始代码审查 PR #${prInfo.number}...`);
  
  // 这里可以添加实际的代码审查逻辑：
  // 1. 获取代码变更diff
  // 2. 运行静态代码分析
  // 3. 检查编码规范
  // 4. 运行自动化测试
  // 5. 生成审查报告
  // 6. 添加评论到PR
  
  // 示例：简单的文件类型检查
  if (prInfo.changedFiles > 10) {
    console.log(`⚠️  注意: PR包含${prInfo.changedFiles}个文件更改，建议分拆`);
  }
  
  if (prInfo.additions + prInfo.deletions > 500) {
    console.log(`⚠️  注意: PR包含大量代码更改(+${prInfo.additions} -${prInfo.deletions})，请仔细审查`);
  }
  
  console.log(`✅ 代码审查完成 PR #${prInfo.number}`);
}

module.exports = {
  handlePullRequestEvent,
  extractPullRequestInfo
};
