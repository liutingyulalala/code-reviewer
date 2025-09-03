const axios = require('axios');

/**
 * DeepSeek API服务类
 */
class DeepSeekService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    
    if (!this.apiKey) {
      console.warn('⚠️  警告: 未设置DEEPSEEK_API_KEY环境变量，AI代码审查功能将无法使用');
    }
  }

  /**
   * 获取DeepSeek API的通用headers
   * @returns {Object} 请求头
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 生成代码审查的系统提示词
   * @returns {string} 系统提示词
   */
  getCodeReviewSystemPrompt() {
    return `你是一位资深的软件架构师和代码审查专家，具有10年以上的软件开发经验。你的任务是对代码变更进行专业的审查。

## 角色定位
- 经验丰富的软件架构师
- 专业的代码审查员
- 关注代码质量、性能、安全和可维护性

## 审查标准
1. **代码规范**: 遵循业界最佳实践和编码规范
2. **性能优化**: 识别潜在的性能问题和优化机会
3. **安全性**: 检查安全漏洞和风险点
4. **可维护性**: 评估代码的可读性、可扩展性和可测试性
5. **逻辑正确性**: 验证代码逻辑的正确性和完整性
6. **设计模式**: 建议合适的设计模式和架构改进

## 编码规范要求
- 使用camelCase命名变量和函数
- 使用kebab-case命名文件夹
- 所有公共函数必须添加详细注释
- 代码必须包含适当的错误处理
- 优先使用ES6+语法特性
- 遵循单一职责原则

## 输出格式
对每个代码变更块(chunk)，请提供：
1. **总体评价**: 对变更的整体评估(良好/需要改进/存在问题)
2. **具体建议**: 详细的改进建议，包括代码示例
3. **风险评估**: 潜在的风险点和安全隐患
4. **优化建议**: 性能和代码质量的优化建议

请始终保持专业、建设性和友好的语调。`;
  }

  /**
   * 为代码chunk生成审查提示词
   * @param {Object} chunk - 代码变更chunk
   * @param {Object} prContext - PR上下文信息
   * @returns {string} 审查提示词
   */
  generateReviewPrompt(chunk, prContext) {
    const { oldFilePath, newFilePath, changes, context, fileStatus } = chunk;
    
    let prompt = `请审查以下代码变更:

## Pull Request信息
- 标题: ${prContext.title}
- 作者: ${prContext.author}
- 分支: ${prContext.sourceBranch} → ${prContext.targetBranch}

## 文件信息
- 文件: ${newFilePath || oldFilePath}
- 状态: ${fileStatus}
- 变更行数: +${context.addedLines.length} -${context.deletedLines.length}

## 代码变更
\`\`\`diff`;

    // 添加代码变更内容
    changes.forEach(change => {
      const prefix = change.type === 'add' ? '+' : 
                    change.type === 'del' ? '-' : ' ';
      prompt += `\n${prefix} ${change.content}`;
    });

    prompt += `\n\`\`\`

## 上下文分析
- 新增代码行数: ${context.addedLines.length}
- 删除代码行数: ${context.deletedLines.length}
- 是否重要变更: ${context.isSignificant ? '是' : '否'}

请根据以上信息进行代码审查，重点关注代码质量、安全性、性能和可维护性。`;

    return prompt;
  }

  /**
   * 调用DeepSeek API进行代码审查
   * @param {Object} chunk - 代码变更chunk
   * @param {Object} prContext - PR上下文信息
   * @returns {Promise<Object>} AI审查结果
   */
  async reviewCodeChunk(chunk, prContext) {
    try {
      console.log(`🤖 正在使用AI审查代码块: ${chunk.newFilePath || chunk.oldFilePath}`);
      
      if (!this.apiKey) {
        return {
          success: false,
          error: 'DeepSeek API Key未配置',
          aiComments: []
        };
      }

      const reviewPrompt = this.generateReviewPrompt(chunk, prContext);
      
      const response = await axios.post(`${this.baseUrl}/v1/chat/completions`, {
        model: 'deepseek-coder',
        messages: [
          {
            role: 'system',
            content: this.getCodeReviewSystemPrompt()
          },
          {
            role: 'user',
            content: reviewPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        stream: false
      }, {
        headers: this.getHeaders(),
        timeout: 30000 // 30秒超时
      });

      const aiResponse = response.data.choices[0].message.content;
      
      // 解析AI响应并结构化
      const reviewResult = this.parseAIResponse(aiResponse, chunk);
      
      console.log(`✅ AI审查完成: ${chunk.newFilePath || chunk.oldFilePath}`);
      return {
        success: true,
        aiComments: reviewResult.comments,
        overallRating: reviewResult.rating,
        suggestions: reviewResult.suggestions,
        risks: reviewResult.risks
      };

    } catch (error) {
      console.error('❌ AI代码审查失败:', error.message);
      return {
        success: false,
        error: error.message,
        aiComments: []
      };
    }
  }

  /**
   * 解析AI响应内容
   * @param {string} aiResponse - AI原始响应
   * @param {Object} chunk - 代码chunk
   * @returns {Object} 解析后的审查结果
   */
  parseAIResponse(aiResponse, chunk) {
    try {
      // 尝试从AI响应中提取结构化信息
      const comments = [];
      const suggestions = [];
      const risks = [];
      
      // 分割响应内容
      const sections = aiResponse.split(/#{1,3}\s+/);
      
      let overallRating = 'good'; // 默认评级
      
      sections.forEach(section => {
        const content = section.trim();
        
        if (content.includes('总体评价') || content.includes('整体评估')) {
          if (content.includes('需要改进') || content.includes('存在问题')) {
            overallRating = content.includes('存在问题') ? 'needs_attention' : 'needs_improvement';
          }
        }
        
        if (content.includes('具体建议') || content.includes('建议')) {
          suggestions.push(content);
        }
        
        if (content.includes('风险') || content.includes('安全')) {
          risks.push(content);
        }
      });

      // 生成主要评论
      comments.push({
        type: 'review',
        content: aiResponse,
        severity: overallRating === 'needs_attention' ? 'high' : 
                 overallRating === 'needs_improvement' ? 'medium' : 'low',
        line: chunk.newStartLine,
        path: chunk.newFilePath || chunk.oldFilePath
      });

      return {
        comments,
        suggestions,
        risks,
        rating: overallRating
      };

    } catch (error) {
      console.error('❌ 解析AI响应失败:', error);
      return {
        comments: [{
          type: 'review',
          content: aiResponse,
          severity: 'low',
          line: chunk.newStartLine,
          path: chunk.newFilePath || chunk.oldFilePath
        }],
        suggestions: [],
        risks: [],
        rating: 'good'
      };
    }
  }

  /**
   * 批量审查多个代码chunks
   * @param {Array<Object>} chunks - 代码变更chunks数组
   * @param {Object} prContext - PR上下文信息
   * @returns {Promise<Array<Object>>} 审查结果数组
   */
  async reviewMultipleChunks(chunks, prContext) {
    console.log(`🤖 开始批量AI代码审查，共${chunks.length}个代码块`);
    
    const results = [];
    
    // 限制并发数量避免API限流
    const concurrencyLimit = 3;
    const batches = [];
    
    for (let i = 0; i < chunks.length; i += concurrencyLimit) {
      batches.push(chunks.slice(i, i + concurrencyLimit));
    }
    
    for (const batch of batches) {
      const batchPromises = batch.map(chunk => 
        this.reviewCodeChunk(chunk, prContext)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        const chunk = batch[index];
        if (result.status === 'fulfilled') {
          results.push({
            chunk,
            review: result.value
          });
        } else {
          console.error(`❌ 审查失败: ${chunk.newFilePath}`, result.reason);
          results.push({
            chunk,
            review: {
              success: false,
              error: result.reason.message,
              aiComments: []
            }
          });
        }
      });
      
      // 批次间延迟，避免API限流
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ 批量AI审查完成，成功审查${results.filter(r => r.review.success).length}个代码块`);
    return results;
  }

  /**
   * 生成审查总结
   * @param {Array<Object>} reviewResults - 审查结果数组
   * @param {Object} prContext - PR上下文信息
   * @returns {string} 审查总结
   */
  generateReviewSummary(reviewResults, prContext) {
    const successfulReviews = reviewResults.filter(r => r.review.success);
    const totalChunks = reviewResults.length;
    const reviewedChunks = successfulReviews.length;
    
    const highSeverityIssues = successfulReviews.filter(r => 
      r.review.aiComments.some(c => c.severity === 'high')
    ).length;
    
    const mediumSeverityIssues = successfulReviews.filter(r => 
      r.review.aiComments.some(c => c.severity === 'medium')
    ).length;
    
    let summary = `## 🤖 AI代码审查报告

### 📊 审查统计
- **审查文件数**: ${reviewedChunks}/${totalChunks}
- **高优先级问题**: ${highSeverityIssues}个
- **中优先级问题**: ${mediumSeverityIssues}个

### 📋 主要发现\n`;

    // 添加高优先级问题
    if (highSeverityIssues > 0) {
      summary += `\n#### ⚠️ 需要注意的问题\n`;
      successfulReviews.forEach(result => {
        const highSeverityComments = result.review.aiComments.filter(c => c.severity === 'high');
        highSeverityComments.forEach(comment => {
          summary += `- **${result.chunk.newFilePath}:${comment.line}**: ${comment.content.split('\n')[0]}\n`;
        });
      });
    }

    // 添加改进建议
    const allSuggestions = successfulReviews
      .flatMap(r => r.review.suggestions)
      .filter(s => s && s.length > 0);
    
    if (allSuggestions.length > 0) {
      summary += `\n#### 💡 改进建议\n`;
      allSuggestions.slice(0, 3).forEach(suggestion => {
        summary += `- ${suggestion.split('\n')[0]}\n`;
      });
    }

    summary += `\n---\n*本报告由DeepSeek AI生成，仅供参考。建议结合人工审查确保代码质量。*`;

    return summary;
  }
}

module.exports = DeepSeekService;
