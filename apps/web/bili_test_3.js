const crypto = require('crypto');
const https = require('https');

// --- WBI Logic ---
function getMixinKey(orig) {
    const mixinKeyEncTab = [
        46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
        33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
        61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
        36, 20, 34, 44, 52
    ];
    let temp = '';
    mixinKeyEncTab.forEach((n) => {
        temp += orig[n];
    });
    return temp.slice(0, 32);
}

function encWbi(params, img_key, sub_key) {
    const mixin_key = getMixinKey(img_key + sub_key);
    const curr_time = Math.round(Date.now() / 1000);
    const chr_filter = /[!'()*]/g;

    Object.assign(params, { wts: curr_time });

    const query = Object.keys(params)
        .sort()
        .map((key) => {
            const value = params[key].toString().replace(chr_filter, '');
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        })
        .join('&');

    const wbi_sign = crypto
        .createHash('md5')
        .update(query + mixin_key)
        .digest('hex');

    return query + '&w_rid=' + wbi_sign;
}

// --- CONSTANTS ---
const SESSDATA = "79df0b83%2C1785413775%2C4a0fb%2A11CjBasJQaQPoc7Af59geNjbVBnVbWsQgIhL7OUYS1ve0fAOLWYADH3rGx6fMlwsma_GISVlpZdFlTMW5Fd2lGZU5aUEQyNzRnQnVkcVNmNzZ1UGwyX250VWQyLTFIdFZrQW5kbGNMYm94czBhMkdWY2NZakVPVjFuMEJobUJJQlJaa2M3VHZGeVpnIIEC";
const UID = "434334701"; 

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://space.bilibili.com/',
    'Cookie': `SESSDATA=${SESSDATA};` // Simplest form
};

// --- MAIN ---
async function run() {
    console.log('--- Starting Test ---');
    console.log(`UID: ${UID}`);
    console.log(`SESSDATA length: ${SESSDATA.length}`);

    // 1. Get Nav to get Keys
    // We must use SESSDATA here too, otherwise we get visitor keys? 
    // Actually, usually visitor keys work if you sign properly, but let's use the authenticated session for everything.
    console.log('\nStep 1: Fetching WBI Keys (nav)...');
    
    const navData = await fetchJson('https://api.bilibili.com/x/web-interface/nav');
    
    if (!navData || !navData.data || !navData.data.wbi_img) {
        console.error('Failed to get WBI keys:', navData);
        return;
    }
    
    const { img_url, sub_url } = navData.data.wbi_img;
    const img_key = img_url.substring(img_url.lastIndexOf('/') + 1, img_url.lastIndexOf('.'));
    const sub_key = sub_url.substring(sub_url.lastIndexOf('/') + 1, sub_url.lastIndexOf('.'));
    
    console.log('Got Keys:', { img_key, sub_key });
    console.log('Is Login:', navData.data.isLogin); // This verifies if SESSDATA actually worked

    // 2. Sign and Fetch
    console.log('\nStep 2: Fetching Dynamics...');
    
    const params = {
        host_mid: UID,
        offset: ''
    };
    
    const query = encWbi(params, img_key, sub_key);
    const targetUrl = `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?${query}`;
    
    console.log(`Target URL: ${targetUrl}`);
    
    const dynamicData = await fetchJson(targetUrl);
    
    console.log('\n--- Result ---');
    if (dynamicData.code === 0) {
        console.log('SUCCESS!');
        console.log(`Items found: ${dynamicData.data?.items?.length || 0}`);
    } else {
        console.error('FAILURE!');
        console.error(`Code: ${dynamicData.code}`);
        console.error(`Message: ${dynamicData.message}`);
    }
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: HEADERS }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                	  console.log(`[${url}] Status: ${res.statusCode}`);
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error('JSON parse error', data.substring(0, 100));
                    resolve({});
                }
            });
        }).on('error', (e) => {
            console.error('Network error', e);
            resolve({});
        });
    });
}

run();
