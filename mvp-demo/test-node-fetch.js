// 测试 Node.js 原生 fetch
console.log('测试 Node.js fetch API...\n');

try {
  console.log('1. 测试简单 GET 请求...');
  const response = await fetch('https://calib.ezpdpz.net', {
    method: 'GET',
    signal: AbortSignal.timeout(10000)
  });
  
  console.log(`   状态: ${response.status} ${response.statusText}`);
  console.log(`   Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
  console.log('   ✅ GET 请求成功\n');
  
  console.log('2. 测试 POST 请求...');
  const postResponse = await fetch('https://calib.ezpdpz.net/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ test: 'data' }),
    signal: AbortSignal.timeout(10000)
  });
  
  console.log(`   状态: ${postResponse.status}`);
  console.log('   ✅ POST 请求成功\n');
  
} catch (error) {
  console.error('❌ 错误:', error.message);
  if (error.cause) {
    console.error('   原因:', error.cause.message);
  }
  process.exit(1);
}

console.log('✅ 所有 fetch 测试通过！');
