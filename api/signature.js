// Vercel Serverless Function for WeChat JS-SDK Signature
const crypto = require('crypto');

const APP_ID = 'wxd312f533bde15d9b';
const APP_SECRET = 'd74462ff1e895773d092f325aa2fa503';

let accessToken = null;
let jsapiTicket = null;
let tokenExpire = 0;
let ticketExpire = 0;

async function getAccessToken() {
  const now = Date.now();
  if (accessToken && now < tokenExpire) {
    return accessToken;
  }
  
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.access_token) {
    accessToken = data.access_token;
    tokenExpire = now + (data.expires_in - 300) * 1000;
    return accessToken;
  }
  throw new Error('Failed to get access_token: ' + JSON.stringify(data));
}

async function getJsApiTicket() {
  const now = Date.now();
  if (jsapiTicket && now < ticketExpire) {
    return jsapiTicket;
  }
  
  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${token}&type=jsapi`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.ticket) {
    jsapiTicket = data.ticket;
    ticketExpire = now + (data.expires_in - 300) * 1000;
    return jsapiTicket;
  }
  throw new Error('Failed to get jsapi_ticket: ' + JSON.stringify(data));
}

function sha1(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

export default async function handler(req, res) {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  try {
    const ticket = await getJsApiTicket();
    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = Math.random().toString(36).substring(2);
    
    const signature = sha1(`jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`);
    
    res.json({
      appId: APP_ID,
      timestamp,
      nonceStr,
      signature
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
