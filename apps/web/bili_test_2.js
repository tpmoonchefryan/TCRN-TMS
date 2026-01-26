const https = require('https');
https.get('https://api.live.bilibili.com/room/v1/Room/get_info?room_id=21452505', {headers: {'User-Agent': 'Mozilla/5.0'}}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const d = JSON.parse(data).data;
    const keys = Object.keys(d).filter(k=>k.includes('cover') || k.includes('user_cover') || k.includes('pic'));
    keys.forEach(k => console.log(k, d[k]));
  });
});
