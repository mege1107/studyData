# 学习数据同步 API

基于 Vercel Serverless Functions 构建的后端服务，用于将学习记录同步到飞书多维表格。

## 功能特性

- ✅ 接收前端 POST 请求，批量写入学习记录
- ✅ 自动获取飞书 tenant_access_token
- ✅ 逐条写入飞书多维表格（带限流保护）
- ✅ 内置错误重试机制
- ✅ 完整的 CORS 支持（允许前端跨域调用）
- ✅ 清晰的同步结果统计

## 项目结构

```
./学习数据后端/
├── api/
│   ├── sync.js          # 主同步接口
│   └── hello.js         # 测试接口
├── package.json         # 项目依赖
├── vercel.json          # Vercel 配置
└── README.md            # 本文档
```

## 前置准备

### 1. 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取 `App ID` 和 `App Secret`
4. 开启权限：
   - `bitable:app` - 多维表格读写权限
   - `auth:tenant_access_token` - 获取租户访问令牌

### 2. 准备飞书多维表格

1. 在飞书创建多维表格
2. 获取：
   - `Base Token`：从表格 URL 中获取
   - `Table ID`：从表格 URL 中获取
3. 创建字段（字段名必须与下面一致）：
   - `日期` - 日期类型
   - `主题` - 多行文本
   - `学习时长(分钟)` - 数字
   - `标签` - 多选
   - `笔记` - 多行文本

## 部署步骤

### 步骤 1: 注册 Vercel 账号

1. 访问 [vercel.com](https://vercel.com)
2. 使用 GitHub/GitLab 账号登录

### 步骤 2: 连接 GitHub

1. 在 Vercel 控制台点击 "Add New" → "Project"
2. 连接你的 GitHub 账号
3. 导入包含本项目的仓库

### 步骤 3: 配置环境变量

在 Vercel 项目设置 → Environment Variables 中添加：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `FEISHU_APP_ID` | 飞书应用 ID | `cli_xxxxxxxxxxxxxx` |
| `FEISHU_APP_SECRET` | 飞书应用密钥 | `xxxxxxxxxxxxxx` |
| `FEISHU_BASE_TOKEN` | 飞书表格 Base Token | `BbcKb4xxxxxxxxx` |
| `FEISHU_TABLE_ID` | 飞书表格 Table ID | `tblxxxxxxxxxxxx` |

### 步骤 4: 部署

1. 在 Vercel 项目中点击 "Deploy"
2. 等待部署完成（通常 1-2 分钟）

### 步骤 5: 获取 API 地址

部署成功后，你将获得类似这样的地址：
```
https://your-project-name.vercel.app
```

接口地址：
- 测试接口：`https://your-project-name.vercel.app/api/hello`
- 同步接口：`https://your-project-name.vercel.app/api/sync`

## API 使用说明

### 测试接口

```http
GET /api/hello
```

返回示例：
```json
{
  "success": true,
  "message": "学习数据同步 API 运行正常！",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 同步接口

```http
POST /api/sync
Content-Type: application/json

{
  "records": [
    {
      "date": "2024-01-01",
      "topic": "React Hooks 学习",
      "duration": 60,
      "tags": ["React", "前端"],
      "notes": "学习了 useState 和 useEffect"
    },
    {
      "date": "2024-01-02",
      "topic": "Node.js 异步编程",
      "duration": 90,
      "tags": ["Node.js", "后端"],
      "notes": "Promise 和 async/await"
    }
  ]
}
```

返回示例：
```json
{
  "success": true,
  "message": "同步完成",
  "total": 2,
  "success": 2,
  "failed": 0,
  "errors": []
}
```

## 前端对接示例

```javascript
// 前端调用示例
const syncToFeishu = async (records) => {
  const response = await fetch('https://your-project-name.vercel.app/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ records })
  });
  
  const result = await response.json();
  console.log('同步结果:', result);
  return result;
};

// 使用示例
syncToFeishu([
  {
    date: '2024-01-01',
    topic: '学习主题',
    duration: 60,
    tags: ['标签1', '标签2'],
    notes: '学习笔记'
  }
]);
```

## 注意事项

1. **权限配置**：确保飞书应用已获得多维表格的读写权限
2. **限流保护**：接口内置 200ms 间隔限流，避免触发飞书 API 限制
3. **重试机制**：单条记录写入失败会自动重试最多 3 次
4. **环境变量**：不要将敏感信息提交到代码仓库，通过 Vercel 环境变量配置

## 故障排查

### 问题：同步失败，返回 500 错误

**检查项：**
1. 环境变量是否正确配置
2. 飞书应用权限是否开启
3. 飞书表格字段名是否完全匹配

### 问题：飞书 API 返回 99991668 错误

**原因**：触发了飞书 API 限流
**解决**：接口已内置重试机制，通常会自动恢复

### 问题：前端跨域错误

**检查**：vercel.json 中的 headers 配置是否正确，确保有 `Access-Control-Allow-Origin: *`

## 技术栈

- **Vercel Serverless Functions** - 无服务器后端
- **飞书开放平台 API** - 多维表格存储
- **Node.js** - 运行环境

## 许可证

MIT
