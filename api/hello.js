/**
 * 测试接口
 * 用于验证部署是否成功
 */

// CORS 响应头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

module.exports = (req, res) => {
  // 设置 CORS 头
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 返回测试信息
  return res.status(200).json({
    success: true,
    message: '学习数据同步 API 运行正常！',
    timestamp: new Date().toISOString(),
    endpoints: {
      sync: '/api/sync - 数据同步接口（POST）',
      hello: '/api/hello - 测试接口（GET）'
    },
    usage: {
      sync: {
        method: 'POST',
        body: {
          records: [
            {
              date: '2024-01-01',
              topic: '学习主题',
              duration: 60,
              tags: ['标签1', '标签2'],
              notes: '学习笔记'
            }
          ]
        }
      }
    }
  });
};
