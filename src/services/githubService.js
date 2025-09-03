const axios = require('axios');

/**
 * GitHub API服务类
 */
class GitHubService {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.baseUrl = 'https://api.github.com';
    
    if (!this.token) {
      console.warn('⚠️  警告: 未设置GITHUB_TOKEN环境变量，部分功能将无法使用');
    }
  }

  /**
   * 获取GitHub API的通用headers
   * @param {boolean} includeAuth - 是否包含认证信息
   * @returns {Object} 请求头
   */
  getHeaders(includeAuth = true) {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitHub-Webhook-Code-Reviewer'
    };
    
    if (includeAuth && this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    
    return headers;
  }

  /**
   * 从diffUrl直接获取Pull Request的diff数据
   * @param {string} diffUrl - GitHub提供的diff URL
   * @returns {Promise<Array<Object>>} 解析后的diff数据
   */
  async getPullRequestDiffFromUrl(diffUrl) {
    try {
      console.log(`🔍 从URL获取diff数据: ${diffUrl}`);
      
      const response = await axios.get(diffUrl, {
        headers: this.getHeaders(false) // 不需要认证
      });

      // 解析diff文本为结构化数据
      const diffData = this.parseDiffToChunks(response.data);
      
      console.log(`✅ 成功获取diff数据，包含${diffData.length}个代码块`);
      return diffData;

    } catch (error) {
      console.error('❌ 获取PR diff失败:', error.message);
      throw new Error(`获取PR diff失败: ${error.message}`);
    }
  }

  /**
   * 解析diff文本为chunk结构（手动实现，无需第三方库）
   * @param {string} diffText - 原始diff文本
   * @returns {Array<Object>} 解析后的chunk数组
   */
  parseDiffToChunks(diffText) {
    try {
      const chunks = [];
      const lines = diffText.split('\n');
      
      let currentFile = null;
      let currentHunk = null;
      let oldLineNumber = 0;
      let newLineNumber = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 检测文件开始: diff --git
        if (line.startsWith('diff --git ')) {
          // 保存前一个hunk
          if (currentHunk && currentFile) {
            chunks.push(this.createChunk(currentFile, currentHunk));
          }
          
          // 开始新文件
          currentFile = {
            oldFilePath: null,
            newFilePath: null,
            fileStatus: 'modified'
          };
          currentHunk = null;
        }
        
        // 检测旧文件路径: --- a/path
        else if (line.startsWith('--- ')) {
          if (currentFile) {
            const path = line.substring(4);
            if (path === '/dev/null') {
              currentFile.oldFilePath = null;
              currentFile.fileStatus = 'added';
            } else if (path.startsWith('a/')) {
              currentFile.oldFilePath = path.substring(2);
            } else {
              currentFile.oldFilePath = path;
            }
          }
        }
        
        // 检测新文件路径: +++ b/path
        else if (line.startsWith('+++ ')) {
          if (currentFile) {
            const path = line.substring(4);
            if (path === '/dev/null') {
              currentFile.newFilePath = null;
              currentFile.fileStatus = 'deleted';
            } else if (path.startsWith('b/')) {
              currentFile.newFilePath = path.substring(2);
            } else {
              currentFile.newFilePath = path;
            }
          }
        }
        
        // 检测hunk头: @@ -oldStart,oldCount +newStart,newCount @@
        else if (line.startsWith('@@')) {
          // 保存前一个hunk
          if (currentHunk && currentFile) {
            chunks.push(this.createChunk(currentFile, currentHunk));
          }
          
          // 解析hunk头信息
          const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
          if (hunkMatch) {
            const oldStart = parseInt(hunkMatch[1]);
            const oldCount = parseInt(hunkMatch[2] || '1');
            const newStart = parseInt(hunkMatch[3]);
            const newCount = parseInt(hunkMatch[4] || '1');
            
            currentHunk = {
              oldStartLine: oldStart,
              oldLines: oldCount,
              newStartLine: newStart,
              newLines: newCount,
              changes: []
            };
            
            oldLineNumber = oldStart;
            newLineNumber = newStart;
          }
        }
        
        // 处理代码行
        else if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
          const type = line.startsWith('+') ? 'add' : 
                      line.startsWith('-') ? 'del' : 'normal';
          const content = line.substring(1); // 去掉前缀符号
          
          const change = {
            type: type,
            content: content,
            oldLineNumber: type !== 'add' ? oldLineNumber : null,
            newLineNumber: type !== 'del' ? newLineNumber : null
          };
          
          currentHunk.changes.push(change);
          
          // 更新行号
          if (type !== 'add') oldLineNumber++;
          if (type !== 'del') newLineNumber++;
        }
      }
      
      // 处理最后一个hunk
      if (currentHunk && currentFile) {
        chunks.push(this.createChunk(currentFile, currentHunk));
      }
      
      return chunks;
    } catch (error) {
      console.error('❌ 解析diff失败:', error);
      return [];
    }
  }

  /**
   * 创建chunk对象
   * @param {Object} file - 文件信息
   * @param {Object} hunk - hunk信息
   * @returns {Object} chunk对象
   */
  createChunk(file, hunk) {
    return {
      // 文件信息
      oldFilePath: file.oldFilePath,
      newFilePath: file.newFilePath,
      fileStatus: file.fileStatus,
      
      // chunk信息
      oldStartLine: hunk.oldStartLine,
      oldLines: hunk.oldLines,
      newStartLine: hunk.newStartLine,
      newLines: hunk.newLines,
      
      // 代码变更
      changes: hunk.changes.map((change, index) => ({
        type: change.type,
        lineNumber: change.newLineNumber || change.oldLineNumber || (hunk.newStartLine + index),
        content: change.content,
        oldLineNumber: change.oldLineNumber,
        newLineNumber: change.newLineNumber
      })),
      
      // 上下文信息
      context: this.extractHunkContext(hunk.changes),
      
      // AI评论字段（初始为空）
      aiComments: [],
      reviewStatus: 'pending'
    };
  }

  /**
   * 提取hunk上下文信息
   * @param {Array} changes - 代码变更数组
   * @returns {Object} 上下文信息
   */
  extractHunkContext(changes) {
    const addedLines = changes.filter(c => c.type === 'add').map(c => c.content);
    const deletedLines = changes.filter(c => c.type === 'del').map(c => c.content);
    const contextLines = changes.filter(c => c.type === 'normal').map(c => c.content);
    
    return {
      addedLines,
      deletedLines,
      contextLines,
      totalChanges: addedLines.length + deletedLines.length,
      isSignificant: addedLines.length + deletedLines.length > 5
    };
  }

  /**
   * 获取Pull Request详细信息
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @param {number} pullNumber - PR编号
   * @returns {Promise<Object>} PR详细信息
   */
  async getPullRequestDetails(owner, repo, pullNumber) {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}`;
      const response = await axios.get(url, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('❌ 获取PR详情失败:', error.message);
      throw new Error(`获取PR详情失败: ${error.message}`);
    }
  }

  /**
   * 添加评论到Pull Request
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @param {number} pullNumber - PR编号
   * @param {string} body - 评论内容
   * @returns {Promise<Object>} 评论响应
   */
  async addPullRequestComment(owner, repo, pullNumber, body) {
    try {
      console.log(`💬 为PR #${pullNumber}添加评论...`);
      
      const url = `${this.baseUrl}/repos/${owner}/${repo}/issues/${pullNumber}/comments`;
      const response = await axios.post(url, {
        body: body
      }, {
        headers: this.getHeaders()
      });

      console.log(`✅ 评论添加成功，评论ID: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('❌ 添加评论失败:', error.message);
      throw new Error(`添加评论失败: ${error.message}`);
    }
  }

  /**
   * 添加行级评论到Pull Request
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @param {number} pullNumber - PR编号
   * @param {string} commitSha - 提交SHA
   * @param {string} path - 文件路径
   * @param {number} line - 行号
   * @param {string} body - 评论内容
   * @returns {Promise<Object>} 评论响应
   */
  async addPullRequestReviewComment(owner, repo, pullNumber, commitSha, path, line, body) {
    try {
      console.log(`💬 为PR #${pullNumber}的${path}:${line}添加行级评论...`);
      
      const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/comments`;
      const response = await axios.post(url, {
        body: body,
        commit_id: commitSha,
        path: path,
        line: line
      }, {
        headers: this.getHeaders()
      });

      console.log(`✅ 行级评论添加成功，评论ID: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('❌ 添加行级评论失败:', error.message);
      throw new Error(`添加行级评论失败: ${error.message}`);
    }
  }

  /**
   * 创建Pull Request审查
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @param {number} pullNumber - PR编号
   * @param {Object} review - 审查对象
   * @returns {Promise<Object>} 审查响应
   */
  async createPullRequestReview(owner, repo, pullNumber, review) {
    try {
      console.log(`📝 为PR #${pullNumber}创建审查...`);
      
      const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`;
      const response = await axios.post(url, review, {
        headers: this.getHeaders()
      });

      console.log(`✅ 审查创建成功，审查ID: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('❌ 创建审查失败:', error.message);
      throw new Error(`创建审查失败: ${error.message}`);
    }
  }
}

module.exports = GitHubService;
