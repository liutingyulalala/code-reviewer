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

## 🚀 Railway 部署指南

### ⚡ 5分钟快速部署

Railway是最适合此项目的免费云平台，提供简单易用的部署体验。

#### 1. 准备代码仓库
```bash
# 将代码推送到GitHub
git add .
git commit -m "GitHub Webhook服务"
git push origin main
```

#### 2. 部署到Railway
1. 访问 [Railway.app](https://railway.app)
2. 使用GitHub账号登录
3. 点击 **"New Project"** → **"Deploy from GitHub repo"**
4. 选择你的代码仓库
5. Railway会自动检测Node.js项目并开始部署

#### 3. 配置环境变量
1. 在Railway项目控制台中，进入 **"Variables"** 选项卡
2. 添加环境变量：
   - `GITHUB_WEBHOOK_SECRET`: 设置一个强密钥（推荐使用随机生成的32位字符串）
   - `NODE_ENV`: `production`

#### 4. 获取服务URL
部署完成后，Railway会提供一个公网URL，格式如：
```
https://your-app-name.railway.app
```

### 🔗 配置GitHub Webhook

在你的GitHub仓库中配置webhook：

1. 进入仓库 **Settings** → **Webhooks**
2. 点击 **"Add webhook"**
3. 配置以下信息：
   - **Payload URL**: `https://your-app-name.railway.app/webhook/github`
   - **Content type**: `application/json`
   - **Secret**: 与Railway环境变量中设置的密钥一致
   - **Events**: 选择 "Pull requests"
4. 点击 **"Add webhook"**

### ✅ 测试验证

1. **健康检查**: 访问 `https://your-app-name.railway.app/health` 应返回健康状态
2. **Webhook测试**: GitHub会自动发送ping事件测试连接
3. **PR测试**: 创建一个测试PR，检查Railway日志是否接收到事件

### 📊 Railway优势

- ✅ **每月500小时免费额度** - 足够小型项目使用
- ✅ **零配置部署** - 自动检测并部署Node.js项目
- ✅ **永不休眠** - 不像其他平台有休眠机制
- ✅ **自动HTTPS** - 自动配置SSL证书
- ✅ **GitHub集成** - 代码推送自动重新部署
- ✅ **实时日志** - 在控制台查看服务日志
- ✅ **自定义域名** - 可绑定自己的域名

### 🔧 Railway故障排除

#### 常见问题解决

1. **部署失败**:
   - 检查 `package.json` 中的 `start` 脚本
   - 确保 `src/server.js` 文件存在

2. **环境变量未生效**:
   - 重新部署服务（Railway会自动重启）
   - 检查变量名拼写是否正确

3. **webhook接收失败**:
   - 检查GitHub设置的URL是否正确
   - 验证Secret密钥是否一致
   - 查看Railway日志排查错误

4. **超出免费额度**:
   - 500小时/月约等于每天16.6小时
   - 可升级到付费计划或优化代码减少资源占用

### 💡 Railway最佳实践

1. **监控使用量**: 定期检查Railway控制台的使用统计
2. **日志监控**: 使用Railway内置日志功能排查问题
3. **自动部署**: 推送到main分支会自动触发重新部署
4. **环境隔离**: 可以为不同分支创建不同的部署环境

## 🔍 故障排除

### 常见问题解决

1. **签名验证失败**
   - 检查Railway环境变量中的`GITHUB_WEBHOOK_SECRET`是否与GitHub设置一致
   - 确认GitHub webhook的Content-Type为`application/json`
   - 重新部署Railway服务以确保环境变量生效

2. **服务无法访问**
   - 确认Railway服务已成功部署并运行
   - 检查Railway提供的URL是否正确
   - 访问 `/health` 端点测试服务状态

3. **事件不触发**
   - 检查GitHub webhook配置的URL格式
   - 查看GitHub webhook发送历史和响应状态
   - 检查Railway服务日志查看错误信息

4. **Railway部署问题**
   - 确保`package.json`包含正确的`start`脚本
   - 检查代码是否成功推送到GitHub
   - 查看Railway部署日志排查构建错误

### 🛠️ 调试方法

1. **本地开发测试**:
   ```bash
   # 安装依赖
   npm install
   
   # 启动开发模式
   npm run dev
   
   # 运行测试
   npm test
   ```

2. **Railway日志监控**:
   - 在Railway控制台查看实时日志
   - 关注错误和警告信息
   - 监控请求响应状态

3. **GitHub Webhook测试**:
   - 使用GitHub提供的"Recent Deliveries"查看请求历史
   - 检查响应状态码和错误信息
   - 重新发送webhook测试连接

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 许可证

MIT License
