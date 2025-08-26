# GitHub Pull Request Webhook 服务

一个用于处理GitHub Pull Request webhook事件的Node.js服务，可以自动响应仓库中的PR操作并进行相应的处理。

## 功能特性

- 🔗 **Webhook接收**: 自动接收GitHub发送的Pull Request事件
- 🔐 **安全验证**: 支持GitHub webhook签名验证，确保请求来源可信
- 📝 **详细解析**: 完整解析PR的body参数和相关信息
- 🎯 **事件处理**: 支持多种PR事件类型（创建、关闭、重新打开、同步等）
- ✅ **测试覆盖**: 包含完整的测试用例
- 📊 **健康检查**: 提供服务状态监控端点

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 环境配置

复制环境变量配置文件：
```bash
cp config.example.env .env
```

编辑 `.env` 文件，设置必要的配置：
```env
PORT=3000
NODE_ENV=development
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
```

### 3. 启动服务

开发模式（自动重启）：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

### 4. 运行测试

```bash
npm test
```

监听模式运行测试：
```bash
npm run test:watch
```

## GitHub Webhook 配置

### 1. 在GitHub仓库中添加Webhook

1. 进入你的GitHub仓库
2. 点击 `Settings` > `Webhooks`
3. 点击 `Add webhook`
4. 配置以下信息：
   - **Payload URL**: `http://your-server.com/webhook/github`
   - **Content type**: `application/json`
   - **Secret**: 设置一个安全的密钥（与环境变量中的`GITHUB_WEBHOOK_SECRET`一致）
   - **Events**: 选择 `Pull requests` 或 `Send me everything`

### 2. 测试Webhook

配置完成后，GitHub会发送一个ping事件来测试连接。你可以在服务日志中看到相应的处理信息。

## API 端点

### 健康检查
```
GET /health
```
返回服务运行状态。

**响应示例**:
```json
{
  "status": "ok",
  "message": "GitHub Webhook服务运行正常",
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

### GitHub Webhook
```
POST /webhook/github
```
接收GitHub发送的webhook事件。

**请求头要求**:
- `Content-Type: application/json`
- `X-GitHub-Event: pull_request` (或其他事件类型)
- `X-Hub-Signature-256: sha256=...` (签名验证)

## 支持的事件类型

### Pull Request 事件
- `opened` - PR创建时触发
- `closed` - PR关闭时触发
- `reopened` - PR重新打开时触发
- `synchronize` - PR有新提交推送时触发
- `ready_for_review` - PR准备就绪等待审查时触发

### 其他事件
- `ping` - Webhook测试事件

## Pull Request 信息解析

服务会从webhook payload中提取以下信息：

```javascript
{
  // PR基本信息
  number: 123,
  title: "功能: 添加用户认证",
  body: "这个PR添加了用户认证功能...",
  state: "open",
  draft: false,
  
  // 分支信息
  sourceBranch: "feature/auth",
  targetBranch: "main",
  sourceRepo: "user/repo",
  targetRepo: "user/repo",
  
  // 作者信息
  author: {
    login: "username",
    id: 12345,
    type: "User"
  },
  
  // 代码变更统计
  commits: 3,
  additions: 150,
  deletions: 20,
  changedFiles: 8,
  
  // URL信息
  htmlUrl: "https://github.com/user/repo/pull/123",
  diffUrl: "https://github.com/user/repo/pull/123.diff",
  patchUrl: "https://github.com/user/repo/pull/123.patch"
  
  // ... 更多信息
}
```

## 自定义处理逻辑

你可以在 `src/handlers/pullRequestHandler.js` 中添加自定义的业务逻辑：

```javascript
async function handlePullRequestOpened(prInfo) {
  // 添加你的自定义逻辑
  // 例如：
  // - 自动代码审查
  // - 发送通知
  // - 运行CI/CD流程
  // - 分配标签
  console.log(`新PR创建: #${prInfo.number} - ${prInfo.title}`);
}
```

## 项目结构

```
code-reviewer/
├── src/
│   ├── handlers/
│   │   └── pullRequestHandler.js    # PR事件处理器
│   ├── middleware/
│   │   ├── githubAuth.js           # GitHub签名验证
│   │   └── errorHandler.js         # 错误处理
│   ├── routes/
│   │   └── webhook.js              # Webhook路由
│   └── server.js                   # 主服务器文件
├── tests/
│   └── webhook.test.js             # 测试用例
├── config.example.env              # 环境变量示例
└── package.json                    # 项目配置
```

## 安全注意事项

1. **设置强密钥**: 为`GITHUB_WEBHOOK_SECRET`设置一个强随机密钥
2. **HTTPS部署**: 生产环境请使用HTTPS部署服务
3. **防火墙配置**: 只允许GitHub的IP地址访问webhook端点
4. **日志监控**: 监控异常请求和错误日志

## 部署建议

### 使用PM2部署
```bash
npm install -g pm2
pm2 start src/server.js --name "github-webhook"
```

### 使用Docker部署
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3000
CMD ["npm", "start"]
```

## 故障排除

### 常见问题

1. **签名验证失败**
   - 检查`GITHUB_WEBHOOK_SECRET`是否与GitHub设置一致
   - 确认webhook的Content-Type为`application/json`

2. **服务无法访问**
   - 检查防火墙设置
   - 确认端口配置正确
   - 验证网络连接

3. **事件不触发**
   - 检查GitHub webhook配置
   - 查看webhook发送历史和响应状态

### 调试模式

设置环境变量启用详细日志：
```bash
NODE_ENV=development npm run dev
```

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 许可证

MIT License
