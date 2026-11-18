const statuses = ["open", "progress", "done"];
const priorities = ["normal", "high", "urgent"];
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const ticketPattern = /^[a-f0-9]{64}\/[a-f0-9-]{36}$/;
const responsePattern = /^[a-f0-9-]{36}$/;
const maxImage = 5 * 1024 * 1024;
const siteOwnerEmail = "esmabayeaktar963@gmail.com";
const pagesOrigin = "https://honeymoon-hub.github.io";
const encoder = new TextEncoder();
const json = (value, status = 200) => Response.json(value, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
});
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
function addCors(response, origin) {
  if (origin !== pagesOrigin) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", pagesOrigin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Ticket-Key");
  headers.set("Access-Control-Max-Age", "86400");
  headers.append("Vary", "Origin");
  return new Response(response.body, { status:response.status, statusText:response.statusText, headers });
}
let googleKeys = null;
let googleKeysFetchedAt = 0;
function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}
function decodeJwtPart(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}
async function getGoogleKeys(kid) {
  if (!googleKeys || Date.now() - googleKeysFetchedAt > 3600000 || !googleKeys.keys.some(key => key.kid === kid)) {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    if (!response.ok) fail("Google ile giriş doğrulanamadı.", 503);
    googleKeys = await response.json();
    googleKeysFetchedAt = Date.now();
  }
  return googleKeys.keys.find(key => key.kid === kid);
}
async function verifyGoogleToken(token, clientId) {
  if (!clientId || !token) fail("Google hesabıyla giriş yapın.", 401);
  const parts = token.split(".");
  if (parts.length !== 3) fail("Google oturumu geçersiz. Tekrar giriş yapın.", 401);
  let header;
  let claims;
  try { header = decodeJwtPart(parts[0]); claims = decodeJwtPart(parts[1]); }
  catch { fail("Google oturumu geçersiz. Tekrar giriş yapın.", 401); }
  if (!header || !claims || header.alg !== "RS256" || !header.kid) fail("Google oturumu geçersiz. Tekrar giriş yapın.", 401);
  const jwk = await getGoogleKeys(header.kid);
  if (!jwk) fail("Google oturumu geçersiz. Tekrar giriş yapın.", 401);
  const key = await crypto.subtle.importKey("jwk", jwk, { name:"RSASSA-PKCS1-v1_5", hash:"SHA-256" }, false, ["verify"]);
  let signature;
  try { signature = decodeBase64Url(parts[2]); } catch { fail("Google oturumu geçersiz.", 401); }
  const signed = new TextEncoder().encode(parts[0] + "." + parts[1]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signed);
  const now = Math.floor(Date.now() / 1000);
  const audienceMatches = claims.aud === clientId || (Array.isArray(claims.aud) && claims.aud.includes(clientId));
  if (!valid || !["accounts.google.com", "https://accounts.google.com"].includes(claims.iss) ||
      !audienceMatches || (Array.isArray(claims.aud) && claims.azp !== clientId) ||
      !Number.isFinite(claims.exp) || !Number.isFinite(claims.iat) || claims.exp <= now || claims.iat > now + 60 ||
      claims.email_verified !== true || typeof claims.email !== "string" || typeof claims.sub !== "string") {
    fail("Google oturumu geçersiz veya süresi dolmuş. Tekrar giriş yapın.", 401);
  }
  return claims;
}
async function resolveBoardOwner(bucket, email, userOwner) {
  const app = await read(bucket, "app/owner");
  if (app?.owner) return app.owner;
  if (email.toLowerCase() !== siteOwnerEmail) fail("Pano sahibi önce Google hesabıyla giriş yapmalı.", 403);
  const ticketObjects = await list(bucket, "tickets/");
  const owners = new Set(ticketObjects.map(object => object.key.split("/")[1]).filter(Boolean));
  const boardObjects = await list(bucket, "boards/");
  for (const object of boardObjects) owners.add(object.key.slice("boards/".length));
  if (owners.size > 1) fail("Birden fazla eski pano bulundu; yönetici aktarımı gerekiyor.", 409);
  const owner = owners.size === 1 ? [...owners][0] : userOwner;
  await bucket.put("app/owner", JSON.stringify({ owner, email:siteOwnerEmail }));
  let board = await read(bucket, "boards/" + owner);
  if (!board) board = { owner, token:crypto.randomUUID() + crypto.randomUUID() };
  board.ownerEmail = siteOwnerEmail;
  await bucket.put("boards/" + owner, JSON.stringify(board));
  return owner;
}
async function digest(value) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}
async function read(bucket, key) {
  const object = await bucket.get(key);
  return object?.json();
}
async function list(bucket, prefix) {
  const objects = [];
  let cursor;
  do {
    const page = await bucket.list({ prefix, cursor, include: ["customMetadata"] });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return objects;
}
function required(form, key, max) {
  const value = String(form.get(key) || "").trim();
  if (!value || value.length > max) fail("Lütfen zorunlu alanları kontrol edin.");
  return value;
}
async function saveRecord(bucket, key, imageKey, record, photo, metadata) {
  if (photo instanceof File && photo.size) {
    if (photo.size > maxImage || !imageTypes.has(photo.type)) {
      fail("En fazla 5 MB boyutunda JPG, PNG veya WebP yükleyin.");
    }
    await bucket.put(imageKey, photo.stream(), { httpMetadata: { contentType: photo.type } });
    record.hasPhoto = true;
  }
  try {
    await bucket.put(key, JSON.stringify(record), { customMetadata: metadata });
  } catch (error) {
    if (record.hasPhoto) await bucket.delete(imageKey).catch(() => {});
    throw error;
  }
}
async function api(request, bucket, url, claims) {
  if (!bucket) fail("Depolama şu anda kullanılamıyor.", 503);
  const { sub, email, name } = claims;
  const ownerIdentity = await digest(sub);
  const boardOwner = await resolveBoardOwner(bucket, email, ownerIdentity);
  const isOwner = email.toLowerCase() === siteOwnerEmail;
  const board = await read(bucket, "boards/" + boardOwner);
  const action = url.pathname.slice(5);

  if (request.method === "GET" && action === "list") {
    const objects = await list(bucket, "tickets/" + boardOwner + "/");
    const tickets = (await Promise.all(objects.map(object => read(bucket, object.key))))
      .filter(Boolean).map(({ token, ...ticket }) => ticket);
    return json({
      tickets: tickets.sort((a, b) => b.created.localeCompare(a.created)),
      name,
      isOwner,
      ...(isOwner ? { shareKey: board?.token } : {})
    });
  }

  if (request.method === "POST") {
    const origin = request.headers.get("Origin");
    if (origin !== url.origin && origin !== pagesOrigin) fail("İstek doğrulanamadı.", 403);
    if (Number(request.headers.get("Content-Length")) > maxImage + 65536) fail("Dosya çok büyük.", 413);
  }

  if (request.method === "POST" && action === "create") {
    if (!isOwner) fail("Yeni talepleri yalnızca pano sahibi açabilir.", 403);
    const form = await request.formData();
    const title = required(form, "title", 120);
    const body = required(form, "body", 6000);
    const priority = required(form, "priority", 10);
    if (!priorities.includes(priority)) fail("Geçerli bir öncelik seçin.");
    const id = boardOwner + "/" + crypto.randomUUID();
    const ticket = {
      id, title, body, priority, status: "open", name,
      token: crypto.randomUUID() + crypto.randomUUID(),
      created: new Date().toISOString(), hasPhoto: false
    };
    await saveRecord(bucket, "tickets/" + id, "photos/" + id + "/main", ticket,
      form.get("photo"), { title, priority, status: ticket.status, created: ticket.created });
    return json({ id }, 201);
  }

  const id = url.searchParams.get("id") || "";
  if (!ticketPattern.test(id) || !id.startsWith(boardOwner + "/")) fail("Talep bulunamadı.", 404);
  const key = "tickets/" + id;
  const ticket = await read(bucket, key);
  if (!ticket) fail("Talep bulunamadı.", 404);
  const { token: shareKey, ...visible } = ticket;

  if (request.method === "GET" && action === "detail") {
    const objects = await list(bucket, "replies/" + id + "/");
    const replies = (await Promise.all(objects.map(object => read(bucket, object.key))))
      .filter(Boolean).sort((a, b) => a.created.localeCompare(b.created));
    return json({ ticket: visible, replies, isOwner, canManage: true, ...(isOwner ? { shareKey } : {}) });
  }

  if (request.method === "GET" && action === "photo") {
    const reply = url.searchParams.get("reply") || "main";
    if (reply !== "main" && !responsePattern.test(reply)) fail("Fotoğraf bulunamadı.", 404);
    const record = reply === "main" ? ticket : await read(bucket, "replies/" + id + "/" + reply);
    const photo = record?.hasPhoto && await bucket.get("photos/" + id + "/" + reply);
    if (!photo) fail("Fotoğraf bulunamadı.", 404);
    return new Response(photo.body, { headers: {
      "Content-Type": photo.httpMetadata.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    } });
  }

  if (request.method === "POST" && action === "reply") {
    const form = await request.formData();
    const body = String(form.get("body") || "").trim();
    const sku = String(form.get("sku") || "").trim();
    const stockStatus = String(form.get("stockStatus") || "").trim();
    const photo = form.get("photo");
    if (!sku || sku.length > 120 || !stockStatus || stockStatus.length > 160 || body.length > 6000) {
      fail("SKU ve stok durumu alanlarını doldurun.");
    }
    const reply = { id: crypto.randomUUID(), name, body, sku, stockStatus, created: new Date().toISOString(), hasPhoto: false };
    const suffix = id + "/" + reply.id;
    await saveRecord(bucket, "replies/" + suffix, "photos/" + suffix, reply, photo);
    return json({ ok: true }, 201);
  }

  if (request.method === "POST" && action === "status") {
    const { status } = await request.json();
    if (!statuses.includes(status)) fail("Geçerli bir durum seçin.");
    const { title, priority, created } = ticket;
    await bucket.put(key, JSON.stringify({ ...ticket, status }), { customMetadata: { title, priority, created, status } });
    return json({ ok: true });
  }

  fail("İşlem bulunamadı.", 404);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" && request.method === "GET") return new Response(PAGE, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' blob:; frame-src https://accounts.google.com/gsi/; connect-src 'self' https://accounts.google.com/gsi/ https://www.googleapis.com; frame-ancestors 'self' https://chatgpt.com"
      }
    });
    if (!url.pathname.startsWith("/api/")) return new Response(null, { status: 404 });
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return addCors(new Response(null, { status:204 }), origin);
    if (request.method === "GET" && url.pathname === "/api/config") {
      return addCors(json({ clientId:env.GOOGLE_CLIENT_ID || "" }), origin);
    }
    try {
      const authorization = request.headers.get("Authorization") || "";
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
      const claims = await verifyGoogleToken(token, env.GOOGLE_CLIENT_ID);
      return addCors(await api(request, env.BUCKET, url, claims), origin);
    } catch (error) {
      if (!error.status) console.error(error.message);
      return addCors(json({ error: error.status ? error.message : "İşlem tamamlanamadı. Tekrar deneyin." }, error.status || 500), origin);
    }
  }
};
