const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/server');

// 测试用的webhook secret
const TEST_SECRET = 'test_webhook_secret';

/**
 * 生成GitHub webhook签名
 * @param {string} payload - JSON字符串payload
 * @param {string} secret - webhook密钥
 * @returns {string} 签名字符串
 */
function generateGitHubSignature(payload, secret) {
  return 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

describe('GitHub Webhook服务', () => {
  // 设置测试环境变量
  beforeAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = TEST_SECRET;
  });

  // 清理测试环境变量
  afterAll(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  describe('GET /health', () => {
    test('应该返回健康状态', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /webhook/github', () => {
    const mockPullRequestPayload = {
      action: 'opened',
      number: 123,
      pull_request: {
        number: 123,
        title: '测试Pull Request',
        body: '这是一个测试PR的描述',
        state: 'open',
        draft: false,
        commits: 2,
        additions: 10,
        deletions: 5,
        changed_files: 3,
        user: {
          login: 'testuser',
          id: 12345,
          type: 'User'
        },
        head: {
          ref: 'feature/test-branch',
          repo: {
            full_name: 'testuser/test-repo'
          }
        },
        base: {
          ref: 'main',
          repo: {
            full_name: 'testuser/test-repo'
          }
        },
        html_url: 'https://github.com/testuser/test-repo/pull/123',
        diff_url: 'https://github.com/testuser/test-repo/pull/123.diff',
        patch_url: 'https://github.com/testuser/test-repo/pull/123.patch',
        created_at: '2023-01-01T12:00:00Z',
        updated_at: '2023-01-01T12:30:00Z'
      },
      repository: {
        name: 'test-repo',
        full_name: 'testuser/test-repo',
        owner: {
          login: 'testuser'
        },
        private: false
      },
      sender: {
        login: 'testuser',
        id: 12345,
        type: 'User'
      }
    };

    test('应该处理有效的Pull Request webhook', async () => {
      const payload = JSON.stringify(mockPullRequestPayload);
      const signature = generateGitHubSignature(payload, TEST_SECRET);

      const response = await request(app)
        .post('/webhook/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'pull_request')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('processed', true);
      expect(response.body).toHaveProperty('pullRequest');
      expect(response.body.pullRequest).toHaveProperty('number', 123);
      expect(response.body.pullRequest).toHaveProperty('title', '测试Pull Request');
    });

    test('应该处理ping事件', async () => {
      const pingPayload = {
        zen: 'Design for failure.',
        hook_id: 12345
      };
      const payload = JSON.stringify(pingPayload);
      const signature = generateGitHubSignature(payload, TEST_SECRET);

      const response = await request(app)
        .post('/webhook/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'ping')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Webhook接收成功！');
      expect(response.body).toHaveProperty('zen', 'Design for failure.');
    });

    test('应该拒绝无效签名的请求', async () => {
      const payload = JSON.stringify(mockPullRequestPayload);
      const invalidSignature = 'sha256=invalid_signature';

      await request(app)
        .post('/webhook/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'pull_request')
        .set('X-Hub-Signature-256', invalidSignature)
        .send(payload)
        .expect(401);
    });

    test('应该拒绝缺少签名的请求', async () => {
      const payload = JSON.stringify(mockPullRequestPayload);

      await request(app)
        .post('/webhook/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'pull_request')
        .send(payload)
        .expect(401);
    });

    test('应该处理未知事件类型', async () => {
      const unknownPayload = {
        action: 'unknown_action',
        test: 'data'
      };
      const payload = JSON.stringify(unknownPayload);
      const signature = generateGitHubSignature(payload, TEST_SECRET);

      const response = await request(app)
        .post('/webhook/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'unknown_event')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('processed', false);
      expect(response.body.message).toContain('unknown_event');
    });

    test('应该处理不同的PR动作', async () => {
      const actions = ['closed', 'reopened', 'synchronize', 'ready_for_review'];
      
      for (const action of actions) {
        const testPayload = {
          ...mockPullRequestPayload,
          action: action
        };
        
        const payload = JSON.stringify(testPayload);
        const signature = generateGitHubSignature(payload, TEST_SECRET);

        const response = await request(app)
          .post('/webhook/github')
          .set('Content-Type', 'application/json')
          .set('X-GitHub-Event', 'pull_request')
          .set('X-Hub-Signature-256', signature)
          .send(payload)
          .expect(200);

        expect(response.body).toHaveProperty('processed', true);
        expect(response.body.message).toContain(action);
      }
    });
  });

  describe('404处理', () => {
    test('应该返回404对于未知路径', async () => {
      const response = await request(app)
        .get('/unknown-path')
        .expect(404);

      expect(response.body).toHaveProperty('error', '未找到请求的资源');
      expect(response.body).toHaveProperty('path', '/unknown-path');
    });
  });
});
