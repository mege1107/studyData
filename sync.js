/**
 * 学习数据同步接口
 * 将前端发来的学习记录批量写入飞书多维表格
 * 
 * POST 请求格式:
 * {
 *   "records": [
 *     {
 *       "date": "2024-01-01",
 *       "topic": "学习主题",
 *       "duration": 60,
 *       "tags": ["标签1", "标签2"],
 *       "notes": "学习笔记"
 *     }
 *   ]
 * }
 */

const https = require('https');

// 环境变量
const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID;

// 工具函数: HTTPS 请求封装
function httpsRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 延迟函数 - 用于限流
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 获取飞书 tenant_access_token
async function getTenantAccessToken() {
  const options = {
    hostname: 'open.feishu.cn',
    path: '/open-apis/auth/v3/tenant_access_token/internal',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const data = {
    app_id: FEISHU_APP_ID,
    app_secret: FEISHU_APP_SECRET
  };

  const response = await httpsRequest(options, data);
  
  if (response.data.code !== 0) {
    throw new Error(`获取 tenant_access_token 失败: ${response.data.msg}`);
  }

  return response.data.tenant_access_token;
}

// 写入单条记录到飞书多维表格
async function writeRecordToFeishu(accessToken, record, retryCount = 0) {
  const maxRetries = 3;
  
  const options = {
    hostname: 'open.feishu.cn',
    path: `/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  };

  const data = {
    fields: {
      "日期": record.date || new Date().toISOString().split('T')[0],
      "主题": record.topic || '未命名',
      "学习时长(分钟)": record.duration || 0,
      "标签": record.tags || [],
      "笔记": record.notes || ''
    }
  };

  try {
    const response = await httpsRequest(options, data);
    
    if (response.data.code === 0) {
      return { success: true, data: response.data };
    } else if (response.data.code === 99991668 && retryCount < maxRetries) {
      // 限流错误 - 等待后重试
      await delay(1000 * (retryCount + 1));
      return writeRecordToFeishu(accessToken, record, retryCount + 1);
    } else {
      return { 
        success: false, 
        error: response.data.msg || `错误码: ${response.data.code}`,
        record 
      };
    }
  } catch (error) {
    if (retryCount < maxRetries) {
      await delay(1000 * (retryCount + 1));
      return writeRecordToFeishu(accessToken, record, retryCount + 1);
    }
    return { success: false, error: error.message, record };
  }
}

// 批量写入记录（带限流控制）
async function batchWriteRecords(accessToken, records) {
  const results = {
    total: records.length,
    success: 0,
    failed: 0,
    errors: []
  };

  // 每条写入之间延迟 200ms，避免触发限流
  for (let i = 0; i < records.length; i++) {
    const result = await writeRecordToFeishu(accessToken, records[i]);
    
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({
        index: i,
        record: result.record,
        error: result.error
      });
    }

    // 不是最后一条的话，延迟一下再写下一条
    if (i < records.length - 1) {
      await delay(200);
    }
  }

  return results;
}

// CORS 响应头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// 主处理函数
module.exports = async (req, res) => {
  // 设置 CORS 头
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: '只允许 POST 请求'
    });
  }

  try {
    // 检查环境变量
    if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !FEISHU_BASE_TOKEN || !FEISHU_TABLE_ID) {
      return res.status(500).json({
        success: false,
        error: '服务器配置不完整，请检查环境变量'
      });
    }

    // 解析请求体
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: '请求体必须包含 records 数组'
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'records 数组不能为空'
      });
    }

    // 获取飞书访问令牌
    const accessToken = await getTenantAccessToken();

    // 批量写入记录
    const results = await batchWriteRecords(accessToken, records);

    // 返回结果
    return res.status(200).json({
      success: true,
      message: '同步完成',
      ...results
    });

  } catch (error) {
    console.error('同步出错:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '服务器内部错误'
    });
  }
};
