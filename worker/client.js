const $ = id => document.getElementById(id);
const statusNames = { open: "Açık", progress: "Devam ediyor", done: "Tamamlandı" };
const priorityNames = { normal: "Normal", high: "Yüksek", urgent: "Acil" };
const params = new URLSearchParams(location.search);
const ticketId = params.get("talep");
const key = new URLSearchParams(location.hash.slice(1)).get("anahtar");
const date = new Intl.DateTimeFormat("tr-TR", { day:"numeric", month:"short", year:"numeric", timeZone:"Europe/Istanbul" });
const longDate = new Intl.DateTimeFormat("tr-TR", { dateStyle:"medium", timeStyle:"short", timeZone:"Europe/Istanbul" });
let tickets = [];
let filter = "all";
let boardShareKey = null;
const previewUrls = [];
const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
})[character]);
const tag = (value, labels) => '<span class="tag ' + escapeHTML(value) + '">' + escapeHTML(labels[value]) + '</span>';
const shortId = id => "#" + id.split("/")[1].slice(0, 8).toUpperCase();
const link = id => "/?talep=" + encodeURIComponent(id);
const boardLink = shareKey => "/#anahtar=" + encodeURIComponent(shareKey);
async function api(action, options = {}, query = {}) {
  const url = new URL("/api/" + action, location.origin);
  if (ticketId) url.searchParams.set("id", ticketId);
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
  const headers = new Headers(options.headers);
  if (key) headers.set("X-Ticket-Key", key);
  const response = await fetch(url, { ...options, headers, redirect: "error" });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || "Bağlantıyı kontrol edip tekrar deneyin.");
  }
  return action === "photo" ? response.blob() : response.json();
}
function renderBoard() {
  const query = $("search").value.trim().toLocaleLowerCase("tr");
  const isBoardOwner = Boolean(boardShareKey && !key);
  const shown = tickets.filter(ticket => (filter === "all" || ticket.status === filter) &&
    (ticket.title + " " + ticket.body + " " + shortId(ticket.id)).toLocaleLowerCase("tr").includes(query));
  $("ticketList").innerHTML = Object.entries(statusNames).map(([status, label]) => {
    const cards = shown.filter(ticket => ticket.status === status);
    return `<section class="board-column" data-column="${status}">
      <header class="column-head"><h2>${label}</h2><span class="column-count">${cards.length}</span></header>
      <div class="column-cards" data-dropzone="${status}">${cards.length ? cards.map(ticket => `
        <article class="ticket-card" draggable="true" data-ticket="${escapeHTML(ticket.id)}">
          <a class="card-open" href="${link(ticket.id)}${!isBoardOwner && key ? "#anahtar=" + encodeURIComponent(key) : ""}">
            <span class="card-title">${escapeHTML(ticket.title)}</span>
            <span class="card-description">${escapeHTML(ticket.body)}</span>
            <span class="card-tags">${tag(ticket.priority, priorityNames)}${ticket.hasPhoto ? '<span class="attachment">▧ Fotoğraf</span>' : ''}</span>
            <span class="card-foot"><span>${escapeHTML(ticket.name)}</span><span>${date.format(new Date(ticket.created))}</span></span>
          </a>
        </article>`).join("") : '<div class="column-empty">Kartları buraya taşıyın</div>'}</div>
    </section>`;
  }).join("");
  for (const card of $("ticketList").querySelectorAll(".ticket-card")) {
    card.addEventListener("dragstart", event => { event.dataTransfer.setData("text/plain", card.dataset.ticket); card.classList.add("dragging"); });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
  }
  for (const zone of $("ticketList").querySelectorAll("[data-dropzone]")) {
    zone.addEventListener("dragover", event => { event.preventDefault(); zone.classList.add("drop-target"); });
    zone.addEventListener("dragleave", event => { if (!zone.contains(event.relatedTarget)) zone.classList.remove("drop-target"); });
    zone.addEventListener("drop", async event => {
      event.preventDefault(); zone.classList.remove("drop-target");
      const id = event.dataTransfer.getData("text/plain");
      const ticket = tickets.find(item => item.id === id);
      if (!ticket || ticket.status === zone.dataset.dropzone) return;
      const previous = ticket.status;
      ticket.status = zone.dataset.dropzone;
      renderBoard();
      try {
        await api("status", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({status:ticket.status}) }, {id});
      } catch (error) { ticket.status = previous; renderBoard(); alert(error.message); }
    });
  }
}
async function dashboard() {
  const result = await api("list");
  tickets = result.tickets;
  boardShareKey = result.shareKey || null;
  $("account").textContent = result.name;
  $("shareBoard").hidden = !result.isOwner;
  $("newTicket").hidden = !result.isOwner;
  $("tabs").innerHTML = Object.entries({ all:"Tümü", ...statusNames }).map(([value, label]) =>
    '<button type="button" data-filter="' + value + '" aria-pressed="' + (value === filter) + '">' + label + '</button>').join("");
  $("tabs").addEventListener("click", event => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    filter = button.dataset.filter;
    for (const tab of $("tabs").children) tab.setAttribute("aria-pressed", tab === button);
    renderBoard();
  });
  $("search").addEventListener("input", renderBoard);
  renderBoard();
  $("dashboard").hidden = false;
}
const photoButton = (record, id) => record.hasPhoto ?
  '<button type="button" class="photo" data-photo="' + id + '" aria-label="Fotoğrafı büyüt">Fotoğraf yükleniyor…</button>' : "";
function renderMessage(record, photoId) {
  return '<p class="meta">' + escapeHTML(record.name) + ' · ' + longDate.format(new Date(record.created)) +
    '</p><p class="message">' + escapeHTML(record.body) + '</p>' + photoButton(record, photoId);
}
async function loadPhoto(button) {
  try {
    const blob = await api("photo", {}, { reply:button.dataset.photo });
    if (!button.isConnected) return;
    const source = URL.createObjectURL(blob);
    previewUrls.push(source);
    const thumb = new Image();
    thumb.alt = "Eklenen fotoğraf";
    thumb.src = source;
    button.replaceChildren(thumb);
    button.onclick = () => {
      const dialog = $("photoDialog");
      dialog.querySelector("img").src = source;
      dialog.showModal();
    };
  } catch {
    button.replaceWith(document.createTextNode("Fotoğraf yüklenemedi."));
  }
}
async function detail() {
  const { ticket, replies, isOwner, canManage, shareKey } = await api("detail");
  for (const url of previewUrls.splice(0)) URL.revokeObjectURL(url);
  $("detail").innerHTML = `
    ${isOwner || canManage ? '<a class="back" href="' + (isOwner ? "/" : boardLink(key)) + '">← Panoya dön</a>' : ""}
    <header class="detail-head">
      <div><p class="meta">${shortId(ticket.id)}</p><h1>${escapeHTML(ticket.title)}</h1>
        <div class="tags">${tag(ticket.status, statusNames)}${tag(ticket.priority, priorityNames)}</div>
      </div>
    </header>
    <div class="${canManage ? "detail-columns" : ""}">
      <div>
        <section class="card panel"><h2>Talep</h2>${renderMessage(ticket,"main")}</section>
        <section class="card panel"><h2>Yanıtlar (${replies.length})</h2>
          ${replies.length ? replies.map(reply => '<article class="reply">' + renderMessage(reply,reply.id) + '</article>').join("") : '<p class="muted">Henüz yanıt yok.</p>'}
          <form id="replyForm">
            <label>Yanıtınız<textarea name="body" rows="3" maxlength="6000" placeholder="Yanıtınızı yazın…"></textarea></label>
            <label>Fotoğraf <span class="muted">· isteğe bağlı</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG veya WebP · en fazla 5 MB</small></label>
            <p class="error" role="alert"></p>
            <div class="actions"><button class="primary" type="submit">Yanıtı gönder</button></div>
          </form>
        </section>
      </div>
      ${canManage ? `<aside>
        <section class="card panel"><h2>Durum</h2><form id="statusForm">
          <label>Talebin durumu<select name="status">${Object.entries(statusNames).map(([value,label]) =>
              '<option value="' + value + '"' + (value === ticket.status ? " selected" : "") + '>' + label + '</option>').join("")}</select></label>
          <p class="error" role="alert"></p>
          <button type="submit">Durumu güncelle</button>
        </form></section>
        ${isOwner ? `<section class="card panel"><h2>Yanıt bağlantısı</h2><p class="share-help">Bu bağlantıyla yalnızca bu talep yanıtlanabilir.</p>
        <input class="share-input" id="shareUrl" readonly aria-label="Yanıt bağlantısı"><button type="button" id="copy">Bağlantıyı kopyala</button>
        <p class="share-status" id="copyStatus" role="status"></p></section>` : ""}
      </aside>` : ""}
    </div>`;
  $("detail").hidden = false;
  for (const button of $("detail").querySelectorAll("[data-photo]")) loadPhoto(button);
  submit($("replyForm"), async form => {
    await api("reply", { method:"POST", body:new FormData(form) });
    form.reset();
    await detail();
  });
  if (canManage) {
    submit($("statusForm"), async form => {
      await api("status", { method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ status:form.elements.status.value }) });
      await detail();
    });
  }
  if (isOwner) {
    $("shareUrl").value = new URL(link(ticket.id), location.origin).href + "#anahtar=" + shareKey;
    $("copy").onclick = async () => {
      try {
        await navigator.clipboard.writeText($("shareUrl").value);
        $("copyStatus").textContent = "Bağlantı kopyalandı.";
      } catch {
        $("shareUrl").select();
        $("copyStatus").textContent = "Bağlantıyı seçili alandan kopyalayabilirsiniz.";
      }
    };
  }
}
function submit(form, handler) {
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const error = form.querySelector(".error");
    button.disabled = true;
    error.textContent = "";
    try { await handler(form); }
    catch (failure) { error.textContent = failure.message; }
    finally { button.disabled = false; }
  });
}
$("newTicket").onclick = () => $("createDialog").showModal();
$("closeDialog").onclick = () => $("createDialog").close();
$("photoDialog").querySelector("button").onclick = () => $("photoDialog").close();
$("shareBoard").onclick = () => {
  $("boardUrl").value = new URL(boardLink(boardShareKey), location.origin).href;
  $("boardDialog").showModal();
};
$("copyBoard").onclick = async () => {
  try {
    await navigator.clipboard.writeText($("boardUrl").value);
    $("boardCopyStatus").textContent = "Pano bağlantısı kopyalandı.";
  } catch {
    $("boardUrl").select();
    $("boardCopyStatus").textContent = "Bağlantıyı seçili alandan kopyalayabilirsiniz.";
  }
};
submit($("createForm"), async form => {
  const result = await api("create", { method:"POST", body:new FormData(form) });
  location.assign(link(result.id));
});
(async () => {
  try {
    await (ticketId ? detail() : dashboard());
    $("notice").hidden = true;
  } catch (error) {
    $("notice").textContent = error.message;
  }
})();
