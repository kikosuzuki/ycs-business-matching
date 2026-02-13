/**
 * YCS Business Matching - Google Apps Script バックエンド
 * スプレッドシートをDBとして使用。認証・JWT・管理者ロールをサーバ側で処理。
 *
 * セットアップ:
 * 1. 新規スプレッドシートを作成
 * 2. 拡張機能 > Apps Script でこのコードを貼り付け
 * 3. スクリプトプロパティで PASSWORD_SALT と JWT_SECRET を設定
 * 4. デプロイ > ウェブアプリ: 実行ユーザー「自分」、アクセス「全員」
 */

const SHEET_NAME = 'Users';

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  const params = method === 'GET' ? (e && e.parameter) || {} : {};
  const action = params.action || (e.postData && e.postData.contents ? JSON.parse(e.postData.contents).action : null);
  let result = { error: 'Invalid request' };
  let status = 400;

  try {
    if (method === 'POST') {
      const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
      if (action === 'register') {
        result = handleRegister(body);
        status = result.error ? 400 : 200;
      } else if (action === 'login') {
        result = handleLogin(body);
        status = result.error ? 401 : 200;
      } else if (action === 'deleteUser') {
        result = handleDeleteUser(body, e);
        status = result.error ? (result.error === 'Unauthorized' ? 401 : 400) : 200;
      } else {
        result = { error: 'Unknown action' };
      }
    } else {
      const authHeader = e && e.headers && (e.headers['Authorization'] || e.headers['authorization']);
      const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : (params.token || '');
      if (action === 'users') {
        result = handleUsersList(token, params);
        status = result.error ? (result.error === 'Unauthorized' ? 401 : 400) : 200;
      } else if (action === 'me') {
        result = handleMe(token);
        status = result.error ? 401 : 200;
      } else if (action === 'members') {
        result = handleMembersList(token, params);
        status = result.error ? 401 : 200;
      } else {
        result = { error: 'Unknown action' };
      }
    }
  } catch (err) {
    result = { error: err.message || 'Server error' };
    status = 500;
  }

  return createJsonResponse(result, status);
}

function createJsonResponse(data, statusCode) {
  const code = statusCode || 200;
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = [
      'id', 'email', 'passwordHash', 'name', 'phone', 'chatworkId',
      'sns1Type', 'sns1Account', 'sns2Type', 'sns2Account', 'sns3Type', 'sns3Account',
      'businessName', 'industry', 'businessDescription', 'country', 'region', 'city',
      'skills', 'interests', 'message', 'mission', 'profileImageUrl', 'role', 'registeredAt'
    ];
    sheet.appendRow(headers);
  }
  return sheet;
}

function getNextId(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 1;
  const ids = sheet.getRange(2, 1, lastRow, 1).getValues().flat();
  const numIds = ids.map(function (x) { return typeof x === 'number' ? x : parseInt(x, 10) || 0; });
  return Math.max.apply(null, numIds) + 1;
}

function hashPassword(password) {
  const salt = getProperty('PASSWORD_SALT');
  if (!salt) throw new Error('PASSWORD_SALT not set in Script Properties');
  const str = salt + password;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  return digest.map(function (b) { return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2); }).join('');
}

function verifyPassword(password, storedHash) {
  return hashPassword(password) === storedHash;
}

function getProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

// Simple JWT (payload + HMAC-SHA256 signature)
function createToken(payload) {
  const secret = getProperty('JWT_SECRET');
  if (!secret) throw new Error('JWT_SECRET not set');
  const exp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days
  const pl = { ...payload, exp: exp };
  const header = { alg: 'HS256', typ: 'JWT' };
  const b64Header = base64UrlEncode(JSON.stringify(header));
  const b64Payload = base64UrlEncode(JSON.stringify(pl));
  const signature = signHmacSha256(b64Header + '.' + b64Payload, secret);
  return b64Header + '.' + b64Payload + '.' + signature;
}

function verifyToken(token) {
  const secret = getProperty('JWT_SECRET');
  if (!secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const sig = signHmacSha256(parts[0] + '.' + parts[1], secret);
  if (sig !== parts[2]) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function base64UrlEncode(str) {
  const base64 = Utilities.base64Encode(Utilities.newBlob(str).getBytes());
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(b64) {
  let s = b64.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Utilities.newBlob(Utilities.base64Decode(s)).getDataAsString();
}

function signHmacSha256(message, secret) {
  const sig = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, message, secret);
  return base64UrlEncode(sig.map(function (b) { return String.fromCharCode(b < 0 ? b + 256 : b); }).join(''));
}

function rowToUser(row, includeHash) {
  const keys = [
    'id', 'email', 'passwordHash', 'name', 'phone', 'chatworkId',
    'sns1Type', 'sns1Account', 'sns2Type', 'sns2Account', 'sns3Type', 'sns3Account',
    'businessName', 'industry', 'businessDescription', 'country', 'region', 'city',
    'skills', 'interests', 'message', 'mission', 'profileImageUrl', 'role', 'registeredAt'
  ];
  const o = {};
  keys.forEach(function (k, i) {
    let v = row[i];
    if (v === undefined || v === null) v = '';
    if (k === 'skills' || k === 'interests') {
      try { v = typeof v === 'string' && v ? JSON.parse(v) : []; } catch (e) { v = []; }
    }
    if (k === 'id' && typeof v === 'string') v = parseInt(v, 10) || 0;
    o[k] = v;
  });
  if (!includeHash) delete o.passwordHash;
  o.location = (o.region || '') + (o.region && o.city ? '・' : '') + (o.city || '');
  o.business = o.businessDescription || o.businessName || '';
  o.profileImage = o.profileImageUrl || null;
  return o;
}

function handleRegister(body) {
  const email = (body.email || '').toString().trim();
  const password = (body.password || '').toString();
  if (!email || !password) return { error: 'email and password required' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters' };

  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === email.toLowerCase()) {
      return { error: 'This email is already registered' };
    }
  }

  const id = getNextId(sheet);
  const passwordHash = hashPassword(password);
  const now = new Date().toISOString().split('T')[0];
  const skills = Array.isArray(body.skills) ? body.skills : [];
  const interests = Array.isArray(body.interests) ? body.interests : [];
  const row = [
    id,
    email,
    passwordHash,
    (body.name || '').toString(),
    (body.phone || '').toString(),
    (body.chatworkId || '').toString(),
    (body.sns1Type || '').toString(),
    (body.sns1Account || '').toString(),
    (body.sns2Type || '').toString(),
    (body.sns2Account || '').toString(),
    (body.sns3Type || '').toString(),
    (body.sns3Account || '').toString(),
    (body.businessName || '').toString(),
    (body.industry || '').toString(),
    (body.businessDescription || '').toString(),
    (body.country || '').toString(),
    (body.region || '').toString(),
    (body.city || '').toString(),
    JSON.stringify(skills),
    JSON.stringify(interests),
    (body.message || '').toString(),
    (body.mission || '').toString(),
    (body.profileImageUrl || body.profileImage || '').toString(),
    (body.role || 'user').toString(),
    now
  ];
  sheet.appendRow(row);
  return { success: true, userId: id };
}

function handleLogin(body) {
  const email = (body.email || '').toString().trim();
  const password = (body.password || '').toString();
  if (!email || !password) return { error: 'email and password required' };

  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === email.toLowerCase()) {
      var row = data[i];
      var storedHash = row[2];
      if (!verifyPassword(password, storedHash)) {
        return { error: 'Invalid email or password' };
      }
      var user = rowToUser(row, false);
      var token = createToken({ userId: user.id, email: user.email, role: user.role || 'user' });
      return { success: true, token: token, user: user };
    }
  }
  return { error: 'Invalid email or password' };
}

function handleMe(token) {
  const payload = verifyToken(token);
  if (!payload) return { error: 'Unauthorized' };
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === payload.userId) {
      return { user: rowToUser(data[i], false) };
    }
  }
  return { error: 'User not found' };
}

function getUsersFromSheet(sheet, params) {
  const data = sheet.getDataRange().getValues();
  const users = [];
  for (var i = 1; i < data.length; i++) {
    users.push(rowToUser(data[i], false));
  }
  var result = users;
  var industry = (params.industry || '').toString().toLowerCase();
  var region = (params.region || '').toString().toLowerCase();
  var skill = (params.skill || '').toString().toLowerCase();
  var interest = (params.interest || '').toString().toLowerCase();
  if (industry || region || skill || interest) {
    result = result.filter(function (u) {
      if (industry && (u.industry || '').toLowerCase().indexOf(industry) === -1) return false;
      if (region && (u.region || '').toLowerCase().indexOf(region) === -1 && (u.city || '').toLowerCase().indexOf(region) === -1) return false;
      if (skill && !(u.skills || []).some(function (s) { return String(s).toLowerCase().indexOf(skill) !== -1; })) return false;
      if (interest && !(u.interests || []).some(function (s) { return String(s).toLowerCase().indexOf(interest) !== -1; })) return false;
      return true;
    });
  }
  return result;
}

function handleUsersList(token, params) {
  const payload = verifyToken(token);
  if (!payload) return { error: 'Unauthorized' };
  if ((payload.role || 'user') !== 'admin') {
    return { error: 'Unauthorized', message: 'Admin only' };
  }
  const sheet = getSheet();
  return { users: getUsersFromSheet(sheet, params) };
}

function handleMembersList(token, params) {
  const payload = verifyToken(token);
  if (!payload) return { error: 'Unauthorized' };
  const sheet = getSheet();
  const list = getUsersFromSheet(sheet, params);
  return { users: list };
}

/**
 * 退会者削除（管理者のみ）
 * body: { userId: number } または { id: number }
 * 自分自身の削除・最後の1人いる管理者の削除は不可。
 */
function handleDeleteUser(body, e) {
  const authHeader = e && e.headers && (e.headers['Authorization'] || e.headers['authorization']);
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : '';
  const payload = verifyToken(token);
  if (!payload) return { error: 'Unauthorized' };
  if ((payload.role || 'user') !== 'admin') {
    return { error: 'Unauthorized', message: 'Admin only' };
  }
  const userId = body.userId != null ? Number(body.userId) : (body.id != null ? Number(body.id) : null);
  if (userId == null || isNaN(userId)) return { error: 'userId required' };
  if (payload.userId === userId) return { error: 'Cannot delete your own account' };

  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  var targetRow = -1;
  var adminCount = 0;
  for (var i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === userId) targetRow = i;
    var roleCol = 24;
    if (data[i][roleCol] === 'admin') adminCount++;
  }
  if (targetRow === -1) return { error: 'User not found' };
  if (data[targetRow][24] === 'admin' && adminCount <= 1) {
    return { error: 'Cannot delete the last admin' };
  }
  sheet.deleteRow(targetRow + 1);
  return { success: true };
}
