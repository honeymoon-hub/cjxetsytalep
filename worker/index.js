const statuses = ["open", "progress", "done"];
const priorities = ["normal", "high", "urgent"];
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const ticketPattern = /^[a-f0-9]{64}\/[a-f0-9-]{36}$/;
const responsePattern = /^[a-f0-9-]{36}$/;
const maxImage = 5 * 1024 * 1024;
const siteOwnerEmail = "esmabayeaktar963@gmail.com";
const encoder = new TextEncoder();
const json = (value, status = 200) => Response.json(value, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
});
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
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
async function api(request, bucket, url, user, owner, name, email) {
  if (!user) fail("Devam etmek için giriş yapın.", 401);
  if (!bucket) fail("Depolama şu anda kullanılamıyor.", 503);
  const action = url.pathname.slice(5);
  if (request.method === "GET" && action === "list") {
    let boardOwner = owner;
    let board = await read(bucket, "boards/" + owner);
    const supplied = request.headers.get("X-Ticket-Key");
    let isOwner = email?.toLowerCase() === siteOwnerEmail && !supplied;
    if (supplied) {
      const boards = await list(bucket, "boards/");
      board = null;
      for (const object of boards) {
        const candidate = await read(bucket, object.key);
        if (candidate?.token === supplied) {
          board = candidate;
          break;
        }
      }
      if (!board) fail("Pano bağlantısı geçersiz veya erişiminiz yok.", 404);
      boardOwner = board.owner;
      isOwner = boardOwner === owner && email?.toLowerCase() === siteOwnerEmail;
    }
    if (isOwner && !board) {
      board = { owner, token: crypto.randomUUID() + crypto.randomUUID() };
      await bucket.put("boards/" + owner, JSON.stringify(board));
    }
    const objects = await list(bucket, "tickets/" + boardOwner + "/");
    const tickets = objects.map(object => {
      const info = object.customMetadata;
      return { ...info, id: object.key.slice(8) };
    });
    return json({ tickets: tickets.sort((a, b) => b.created.localeCompare(a.created)), name, isOwner, ...(isOwner ? { shareKey: board.token } : {}) });
  }
  if (request.method === "POST") {
    if (request.headers.get("Origin") !== url.origin) fail("İstek doğrulanamadı.", 403);
    if (Number(request.headers.get("Content-Length")) > maxImage + 65536) fail("Dosya çok büyük.", 413);
  }
  if (request.method === "POST" && action === "create") {
    if (email?.toLowerCase() !== siteOwnerEmail) fail("Yeni talepleri yalnızca pano sahibi açabilir.", 403);
    const form = await request.formData();
    const title = required(form, "title", 120);
    const body = required(form, "body", 6000);
    const priority = required(form, "priority", 10);
    if (!priorities.includes(priority)) fail("Geçerli bir öncelik seçin.");
    const uuid = crypto.randomUUID();
    const id = owner + "/" + uuid;
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
  if (!ticketPattern.test(id)) fail("Talep bulunamadı.", 404);
  const key = "tickets/" + id;
  const ticket = await read(bucket, key);
  const isOwner = id.startsWith(owner + "/") && email?.toLowerCase() === siteOwnerEmail;
  const token = request.headers.get("X-Ticket-Key");
  let hasBoardAccess = false;
  if (!isOwner && token) {
    const board = await read(bucket, "boards/" + id.split("/")[0]);
    hasBoardAccess = Boolean(board && board.token === token);
  }
  if (!ticket || (!isOwner && !hasBoardAccess && (!token || token !== ticket.token))) fail("Talep bulunamadı veya erişiminiz yok.", 404);
  const { token: shareKey, ...visible } = ticket;
  if (request.method === "GET" && action === "detail") {
    const objects = await list(bucket, "replies/" + id + "/");
    const replies = (await Promise.all(objects.map(object => read(bucket, object.key))))
      .filter(Boolean).sort((a, b) => a.created.localeCompare(b.created));
    return json({ ticket: visible, replies, isOwner, canManage: isOwner || hasBoardAccess, ...(isOwner ? { shareKey } : {}) });
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
    const photo = form.get("photo");
    if ((!body && !(photo instanceof File && photo.size)) || body.length > 6000) fail("Bir yanıt yazın veya fotoğraf ekleyin.");
    const reply = { id: crypto.randomUUID(), name, body, created: new Date().toISOString(), hasPhoto: false };
    const suffix = id + "/" + reply.id;
    await saveRecord(bucket, "replies/" + suffix, "photos/" + suffix, reply, photo);
    return json({ ok: true }, 201);
  }
  if (request.method === "POST" && action === "status") {
    if (!isOwner && !hasBoardAccess) fail("Bu panoda durumu değiştirme yetkiniz yok.", 403);
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
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' blob:; frame-ancestors 'self' https://chatgpt.com"
      }
    });
    if (!url.pathname.startsWith("/api/")) return new Response(null, { status: 404 });
    try {
      const user = request.headers.get("oai-authenticated-user-id");
      let name = request.headers.get("oai-authenticated-user-full-name") || request.headers.get("oai-authenticated-user-email") || "Kullanıcı";
      if (request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
        try { name = decodeURIComponent(name); } catch {}
      }
      const email = request.headers.get("oai-authenticated-user-email") || "";
      return await api(request, env.BUCKET, url, user, user && await digest(user), name, email);
    } catch (error) {
      if (!error.status) console.error(error.message);
      return json({ error: error.status ? error.message : "İşlem tamamlanamadı. Tekrar deneyin." }, error.status || 500);
    }
  }
};
    if (!isOwner && !supplied) fail("Pano bağlantısı geçersiz veya erişiminiz yok.", 404);
