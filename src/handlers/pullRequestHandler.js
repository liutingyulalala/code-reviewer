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
 * 执行AI驱动的代码审查
 * @param {Object} prInfo - PR信息对象
 */
async function performCodeReview(prInfo) {
  console.log(`🔍 开始AI代码审查 PR #${prInfo.number}...`);
  
  const GitHubService = require('../services/githubService');
  const DeepSeekService = require('../services/deepSeekService');
  
  const githubService = new GitHubService();
  const deepSeekService = new DeepSeekService();
  
  try {
    // 步骤1: 获取代码变更diff
    console.log(`📥 获取PR #${prInfo.number}的代码变更...`);
    const chunks = await githubService.getPullRequestDiffFromUrl(prInfo.diffUrl);
    
    if (chunks.length === 0) {
      console.log(`ℹ️  PR #${prInfo.number}没有代码变更，跳过审查`);
      return;
    }
    
    console.log(`📊 输出chunks:${JSON.stringify(chunks,null,2)}`);
    console.log(`📊 发现${chunks.length}个代码变更块，开始AI审查...`);
    
    // 步骤2: 使用DeepSeek AI审查代码
    // const reviewResults = await deepSeekService.reviewMultipleChunks(chunks, {
    //   title: prInfo.title,
    //   author: prInfo.author.login,
    //   sourceBranch: prInfo.sourceBranch,
    //   targetBranch: prInfo.targetBranch,
    //   number: prInfo.number
    // });
    
    // 步骤3: 处理审查结果并更新chunks
    // const reviewedChunks = processReviewResults(chunks, reviewResults);
    
    // 步骤4: 生成审查总结
    // const reviewSummary = deepSeekService.generateReviewSummary(reviewResults, prInfo);
    
    // 步骤5: 添加评论到PR
    // await addReviewCommentsToPR(
    //   githubService, 
    //   prInfo, 
    //   reviewedChunks, 
    //   reviewSummary,
    //   reviewResults
    // );
    
    console.log(`✅ AI代码审查完成 PR #${prInfo.number}`);
    
    // 统计信息
    // const successfulReviews = reviewResults.filter(r => r.review.success).length;
    // const highPriorityIssues = reviewResults.filter(r => 
    //   r.review.aiComments?.some(c => c.severity === 'high')
    // ).length;
    
    // console.log(`📈 审查统计: ${successfulReviews}/${chunks.length}个代码块已审查，发现${highPriorityIssues}个高优先级问题`);
    
  } catch (error) {
    console.error(`❌ AI代码审查失败 PR #${prInfo.number}:`, error.message);
    
    // 发生错误时，添加简单的基础检查评论
    // await performBasicCodeReview(githubService, prInfo);
  }
}

/**
 * 处理AI审查结果，将评论合并到chunks中
 * @param {Array<Object>} chunks - 原始代码chunks
 * @param {Array<Object>} reviewResults - AI审查结果
 * @returns {Array<Object>} 包含AI评论的chunks
 */
function processReviewResults(chunks, reviewResults) {
  const reviewedChunks = chunks.map(chunk => {
    const correspondingReview = reviewResults.find(r => 
      r.chunk.newFilePath === chunk.newFilePath &&
      r.chunk.newStartLine === chunk.newStartLine
    );
    
    if (correspondingReview && correspondingReview.review.success) {
      return {
        ...chunk,
        aiComments: correspondingReview.review.aiComments || [],
        reviewStatus: 'reviewed',
        overallRating: correspondingReview.review.overallRating || 'good',
        suggestions: correspondingReview.review.suggestions || [],
        risks: correspondingReview.review.risks || []
      };
    }
    
    return {
      ...chunk,
      aiComments: [],
      reviewStatus: 'failed',
      overallRating: 'unknown'
    };
  });
  
  return reviewedChunks;
}

/**
 * 将审查评论添加到PR中
 * @param {GitHubService} githubService - GitHub服务实例
 * @param {Object} prInfo - PR信息
 * @param {Array<Object>} reviewedChunks - 包含AI评论的chunks
 * @param {string} reviewSummary - 审查总结
 * @param {Array<Object>} reviewResults - 完整审查结果
 */
async function addReviewCommentsToPR(githubService, prInfo, reviewedChunks, reviewSummary, reviewResults) {
  try {
    // 添加总结评论
    await githubService.addPullRequestComment(
      prInfo.repository.owner,
      prInfo.repository.name,
      prInfo.number,
      reviewSummary
    );
    
    // 添加具体的行级评论（仅针对有重要问题的代码）
    const highPriorityChunks = reviewedChunks.filter(chunk => 
      chunk.aiComments.some(comment => comment.severity === 'high' || comment.severity === 'medium')
    );
    
    for (const chunk of highPriorityChunks.slice(0, 5)) { // 限制评论数量，避免刷屏
      const importantComments = chunk.aiComments.filter(comment => 
        comment.severity === 'high' || comment.severity === 'medium'
      );
      
      for (const comment of importantComments.slice(0, 2)) { // 每个chunk最多2条评论
        try {
          // 获取最新的commit SHA
          const prDetails = await githubService.getPullRequestDetails(
            prInfo.repository.owner,
            prInfo.repository.name,
            prInfo.number
          );
          
          await githubService.addPullRequestReviewComment(
            prInfo.repository.owner,
            prInfo.repository.name,
            prInfo.number,
            prDetails.head.sha,
            comment.path,
            comment.line,
            `🤖 **AI代码审查建议**\n\n${comment.content}\n\n*严重程度: ${getSeverityEmoji(comment.severity)} ${comment.severity}*`
          );
          
          // 添加延迟避免API限流
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`❌ 添加行级评论失败: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 添加审查评论失败:', error.message);
  }
}

/**
 * 获取严重程度对应的emoji
 * @param {string} severity - 严重程度
 * @returns {string} emoji
 */
function getSeverityEmoji(severity) {
  switch (severity) {
    case 'high': return '🚨';
    case 'medium': return '⚠️';
    case 'low': return 'ℹ️';
    default: return '📝';
  }
}

/**
 * 执行基础代码审查（当AI审查失败时的备用方案）
 * @param {GitHubService} githubService - GitHub服务实例
 * @param {Object} prInfo - PR信息对象
 */
async function performBasicCodeReview(githubService, prInfo) {
  try {
    console.log(`🔄 执行基础代码审查 PR #${prInfo.number}...`);
    
    let basicReviewComment = `## 📝 基础代码审查报告\n\n`;
    
    // 基础检查
    if (prInfo.changedFiles > 10) {
      basicReviewComment += `⚠️ **文件数量**: PR包含${prInfo.changedFiles}个文件更改，建议考虑拆分为更小的PR以便审查。\n\n`;
    }
    
    if (prInfo.additions + prInfo.deletions > 500) {
      basicReviewComment += `⚠️ **代码量**: PR包含大量代码更改(+${prInfo.additions} -${prInfo.deletions}行)，请确保充分测试。\n\n`;
    }
    
    if (prInfo.additions + prInfo.deletions > 1000) {
      basicReviewComment += `🚨 **超大变更**: 代码变更量超过1000行，强烈建议拆分PR并进行详细的人工审查。\n\n`;
    }
    
    // 分支命名检查
    const branchName = prInfo.sourceBranch.toLowerCase();
    if (!branchName.includes('feature/') && !branchName.includes('fix/') && !branchName.includes('hotfix/')) {
      basicReviewComment += `💡 **分支命名**: 建议使用规范的分支命名格式 (feature/, fix/, hotfix/)。\n\n`;
    }
    
    basicReviewComment += `### ✅ 检查项目\n`;
    basicReviewComment += `- [x] 代码量检查\n`;
    basicReviewComment += `- [x] 文件数量检查\n`;
    basicReviewComment += `- [x] 分支命名检查\n\n`;
    basicReviewComment += `*注意: AI代码审查暂时不可用，这是基础检查结果。建议进行人工代码审查。*`;
    
    await githubService.addPullRequestComment(
      prInfo.repository.owner,
      prInfo.repository.name,
      prInfo.number,
      basicReviewComment
    );
    
    console.log(`✅ 基础代码审查完成 PR #${prInfo.number}`);
    
  } catch (error) {
    console.error(`❌ 基础代码审查失败 PR #${prInfo.number}:`, error.message);
  }
}

module.exports = {
  handlePullRequestEvent,
  extractPullRequestInfo
};
