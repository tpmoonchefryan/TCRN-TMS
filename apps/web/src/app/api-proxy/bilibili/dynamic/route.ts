import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import type { LegacyFeedResponse, PrimaryFeedResponse } from './normalizers';
import {
    getErrorMessage,
    normalizeLegacyFeedItems,
    normalizePrimaryFeedItems,
} from './normalizers';

export const dynamic = 'force-dynamic';

interface WbiNavResponse {
    data?: {
        wbi_img?: {
            img_url?: string;
            sub_url?: string;
        };
    };
}

interface BilibiliLiveUserInfoResponse {
    code?: number;
    data?: {
        info?: {
            uname?: string;
            face?: string;
        };
    };
}

function getMixinKey(orig: string) {
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

function encWbi(params: Record<string, string | number>, img_key: string, sub_key: string) {
    const mixin_key = getMixinKey(img_key + sub_key);
    const curr_time = Math.round(Date.now() / 1000);
    const chr_filter = /[!'()*]/g;

    Object.assign(params, { wts: curr_time }); // Attach timestamp

    // Sort keys
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

function generateBuvid3() {
    const mac = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':');
    const md5 = 'infoc'; 
    return `${mac}-${Date.now()}-${md5}`; 
}

const COMMON_HEADERS = {
   'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
   'Referer': 'https://space.bilibili.com/',
   'Origin': 'https://space.bilibili.com',
   'Cookie': `buvid3=${generateBuvid3()};` 
};

// Return keys AND cookies
async function getWbiKeys() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); 
    try {
        const res = await fetch('https://api.bilibili.com/x/web-interface/nav', {
            headers: {
                'User-Agent': COMMON_HEADERS['User-Agent']
            },
            signal: controller.signal,
            next: { revalidate: 3600 } 
        });
        clearTimeout(timeoutId);
        const json: WbiNavResponse = await res.json();
        
        const img_url = json.data?.wbi_img?.img_url || '';
        const sub_url = json.data?.wbi_img?.sub_url || '';
        const cookies = res.headers.get('set-cookie') || '';

        return {
            img_key: img_url.substring(img_url.lastIndexOf('/') + 1, img_url.lastIndexOf('.')),
            sub_key: sub_url.substring(sub_url.lastIndexOf('/') + 1, sub_url.lastIndexOf('.')),
            cookies
        };
    } catch (e) {
        console.warn('Failed to fetch WBI keys, using fallback', e);
        return {
            img_key: '7cd084941338484aae1ad9425b84077c',
            sub_key: '4932caff0ff746eab6f01bf08b70ac45',
            cookies: ''
        };
    }
}

async function fetchPrimary(uid: string) {
    // 1. Get Keys & Cookies
    const { img_key, sub_key, cookies } = await getWbiKeys();

    // 2. Sign Params
    const params = {
        host_mid: uid,
        offset: ''
    };
    const query = encWbi(params, img_key, sub_key);

    // 3. Fetch
    const targetUrl = `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?${query}`;
    
    // Merge cookies
    const sessData = process.env.BILIBILI_SESSDATA || '';



    const requestHeaders = {
        ...COMMON_HEADERS,
        'Cookie': `${COMMON_HEADERS['Cookie']} ${cookies}; SESSDATA=${sessData};` 
    };



    const response = await fetch(targetUrl, {
      headers: requestHeaders,
      next: { revalidate: 60 } 
    });

    if (!response.ok) throw new Error(`${response.status} (Primary)`);
    const data: PrimaryFeedResponse & { code?: number; message?: string } = await response.json();
    if (data.code !== 0) throw new Error(data.message || `API Code ${data.code}`);

    return normalizePrimaryFeedItems(data);
}

async function fetchLegacy(uid: string) {
    const targetUrl = `https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history?host_uid=${uid}&offset_dynamic_id=0`;
    const response = await fetch(targetUrl, {
      headers: COMMON_HEADERS,
      next: { revalidate: 300 }
    });

    if (!response.ok) throw new Error(`${response.status} (Legacy)`);
    const data: LegacyFeedResponse & { code?: number; message?: string } = await response.json();
    if (data.code !== 0) throw new Error(data.message || 'Legacy API Error');

    return normalizeLegacyFeedItems(data);
}

// Fallback to Live API to get basic user info (Low WAF risk)
async function fetchUserInfo(uid: string) {
    try {
        // API: https://api.live.bilibili.com/live_user/v1/Master/info?uid={uid}
        const response = await fetch(`https://api.live.bilibili.com/live_user/v1/Master/info?uid=${uid}`, {
            headers: {
                'User-Agent': COMMON_HEADERS['User-Agent']
            },
            next: { revalidate: 3600 } 
        });
        
        if (!response.ok) return null;
        const data: BilibiliLiveUserInfoResponse = await response.json();
        if (data.code !== 0) return null;

        return {
            name: data.data?.info?.uname || 'Unknown User',
            face: data.data?.info?.face || '',
        };
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get('uid');

  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
  }

  const errors: string[] = [];

  try {
    // Attempt 1: Primary API with WBI
    try {
        const items = await fetchPrimary(uid);
        return NextResponse.json({ items });
    } catch (e) {
        const msg = getErrorMessage(e);
        console.warn('Primary Bilibili API (WBI) failed:', msg);
        errors.push(`Primary: ${msg}`);
    }

    // Attempt 2: Legacy API
    try {
        const items = await fetchLegacy(uid);
        if (items.length === 0) throw new Error("Empty legacy response");
        return NextResponse.json({ items });
    } catch (e) {
        const msg = getErrorMessage(e);
        console.warn('Legacy Bilibili API failed:', msg);
        errors.push(`Legacy: ${msg}`);
    }

    // All failed: Try to get user info for fallback UI
    const userInfo = await fetchUserInfo(uid);
    const sessData = process.env.BILIBILI_SESSDATA || '';
    const hasSessData = !!sessData && sessData.length > 10;

    console.warn(`All APIs failed for uid=${uid}. Returning fallback info.`);

    return NextResponse.json({
        items: [],
        userInfo,
        error: `All attempts failed. ${errors.join(' | ')}`,
        fallback: true
    }, {
        status: 200, // Return 200 so frontend can handle it as "data with fallback"
        headers: { 'X-Debug-SessData': hasSessData ? 'true' : 'false' } 
    });

  } catch (error) {
    console.error('Bilibili dynamic fetch error:', error);
    const sessData = process.env.BILIBILI_SESSDATA || '';
    const hasSessData = !!sessData && sessData.length > 10;
    
    return NextResponse.json({ error: getErrorMessage(error) }, {
        status: 500,
        headers: { 'X-Debug-SessData': hasSessData ? 'true' : 'false' } 
    });
  }
}
