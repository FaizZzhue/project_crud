document.addEventListener("DOMContentLoaded", () => {
    cacheDom();
    bindEvents();

    if (isStorageExist()) {
        loadDataStorage();
    } else {
        document.dispatchEvent(new Event(RENDER_EVENT));
    }
});

const STORAGE_KEY = "WISHLIST";
const RENDER_EVENT = "render-wishlist";

let items = [];

let uiState = {
    filter: "all",
    query: "",
    sort: "newest",
};

let editingId = null;

const dom = {};
const el = (id) => document.getElementById(id);

function cacheDom() {
    dom.grid = el("grid");
    dom.emptyState = el("emptyState");
    dom.statsText = el("statsText");

    dom.searchInput = el("searchInput");
    dom.sortSelect = el("sortSelect");
    dom.resetBtn = el("resetBtn");

    dom.addBtn = el("addBtn");
    dom.emptyAddBtn = el("emptyAddBtn");

    dom.modalOverlay = el("modalOverlay");
    dom.closeModalBtn = el("closeModalBtn");
    dom.cancelBtn = el("cancelBtn");
    dom.saveBtn = el("saveBtn");

    dom.modalTitle = el("modalTitle");
    dom.formError = el("formError");

    dom.nameInput = el("nameInput");
    dom.priorityInput = el("priorityInput");
    dom.priceInput = el("priceInput");
    dom.notesInput = el("notesInput");
    dom.urlInput = el("urlInput");

    dom.boughtField = el("boughtField");
    dom.boughtInput = el("boughtInput");

    dom.toast = el("toast");
    dom.chips = Array.from(document.querySelectorAll(".chip"));
}

function bindEvents() {
    dom.searchInput.addEventListener("input", () => {
        uiState.query = dom.searchInput.value.trim().toLowerCase();
        document.dispatchEvent(new Event(RENDER_EVENT));
    });

    dom.sortSelect.addEventListener("change", () => {
        uiState.sort = dom.sortSelect.value;
        document.dispatchEvent(new Event(RENDER_EVENT));
    });

    dom.resetBtn.addEventListener("click", () => {
        uiState = { filter: "all", query: "", sort: "newest" };

        dom.searchInput.value = "";
        dom.sortSelect.value = "newest";

        setActiveChip("all");

        document.dispatchEvent(new Event(RENDER_EVENT));
        showToast("Filter direset");
    });

    dom.chips.forEach((chip) => {
        chip.addEventListener("click", () => {
            uiState.filter = chip.dataset.filter;
            setActiveChip(uiState.filter);
            document.dispatchEvent(new Event(RENDER_EVENT));
        });
    });

    dom.addBtn.addEventListener("click", () => openModal("add"));
    dom.emptyAddBtn.addEventListener("click", () => openModal("add"));

    dom.closeModalBtn.addEventListener("click", closeModal);
    dom.cancelBtn.addEventListener("click", closeModal);
    dom.modalOverlay.addEventListener("click", (e) => {
        if (e.target === dom.modalOverlay) closeModal();
    });

    dom.saveBtn.addEventListener("click", onSave);
}

document.addEventListener(RENDER_EVENT, function () {
    const filtered = applyAll(items, uiState);

    renderStats(items);

    dom.grid.innerHTML = "";

    if (filtered.length === 0) {
        dom.emptyState.style.display = "block";

        if (items.length > 0) {
            dom.emptyState.querySelector("h3").textContent = "Tidak ada hasil";
            dom.emptyState.querySelector("p").textContent =
            "Coba ubah kata kunci / filter. Wishlist kamu nggak hilang kok.";
            dom.emptyAddBtn.style.display = "none";
        } else {
            dom.emptyState.querySelector("h3").textContent = "Wishlist kamu masih kosong";
            dom.emptyState.querySelector("p").textContent =
            "Tambahkan barang pertama biar wishlist-nya punya masa depan (nggak cuma angan-angan).";
            dom.emptyAddBtn.style.display = "inline-flex";
        }
        return;
    }

    dom.emptyState.style.display = "none";
    dom.emptyAddBtn.style.display = "inline-flex";

    for (const item of filtered) {
        const card = makeCard(item);
        dom.grid.append(card);
    }
});

function onSave() {
    const name = dom.nameInput.value.trim();
    if (name.length < 2) {
        dom.formError.classList.add("show");
        return;
    }
    dom.formError.classList.remove("show");

    const payload = {
        name,
        priority: dom.priorityInput.value,
        price: Number(dom.priceInput.value || 0),
        notes: dom.notesInput.value.trim(),
        url: dom.urlInput.value.trim(),
    };

    if (editingId) {
        const target = findItem(editingId);
        if (!target) return;

        target.name = payload.name;
        target.priority = payload.priority;
        target.price = payload.price;
        target.notes = payload.notes;
        target.url = payload.url;
        target.bought = !!dom.boughtInput.checked;
        target.updatedAt = new Date().toISOString();

        saveData();
        closeModal();
        document.dispatchEvent(new Event(RENDER_EVENT));
        showToast("Perubahan disimpan");
    } else {
        const newItem = makeItem(payload);
        items.unshift(newItem);

        saveData();
        closeModal();
        document.dispatchEvent(new Event(RENDER_EVENT));
        showToast("Item ditambahkan");
    }
}

function makeCard(item) {
    const container = document.createElement("div");
    container.classList.add("card");
    if (item.bought) container.classList.add("bought");

    const cardTop = document.createElement("div");
    cardTop.classList.add("cardTop");

    const left = document.createElement("div");
    left.classList.add("left");

    const check = document.createElement("div");
    check.classList.add("check");
    if (item.bought) check.classList.add("checked");
    check.title = "Tandai sudah terbeli";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M20 6L9 17l-5-5");
    path.setAttribute("stroke", "#2563eb");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    check.appendChild(svg);

    check.addEventListener("click", () => {
        toggleBought(item.id);
    });

    // meta
    const meta = document.createElement("div");
    meta.classList.add("meta");

    const nameP = document.createElement("p");
    nameP.classList.add("name");
    nameP.textContent = item.name;

    const subline = document.createElement("div");
    subline.classList.add("subline");

    const badge = document.createElement("span");
    badge.classList.add("badge", item.priority);
    badge.textContent = capitalize(item.priority);

    const dot1 = document.createElement("span");
    dot1.textContent = "•";

    const priceSpan = document.createElement("span");
    priceSpan.textContent = item.price > 0 ? `Rp ${formatRupiah(item.price)}` : "-";

    subline.append(badge, dot1, priceSpan);

    if (item.bought) {
        const boughtSpan = document.createElement("span");
        boughtSpan.style.color = "#16a34a";
        boughtSpan.style.fontWeight = "800";
        boughtSpan.textContent = "• Sudah terbeli";
        subline.appendChild(boughtSpan);
    }

    meta.append(nameP, subline);

    left.append(check, meta);
    cardTop.appendChild(left);

    const cardBody = document.createElement("div");
    cardBody.classList.add("cardBody");

    if (item.notes && item.notes.trim() !== "") {
        const notesDiv = document.createElement("div");
        notesDiv.textContent = item.notes;
        cardBody.appendChild(notesDiv);
    } else {
        const noNotes = document.createElement("div");
        noNotes.style.color = "#94a3b8";
        noNotes.textContent = "(Tidak ada catatan)";
        cardBody.appendChild(noNotes);
    }

    if (item.url && item.url.trim() !== "") {
        const linkWrap = document.createElement("div");
        linkWrap.style.marginTop = "6px";

        const a = document.createElement("a");
        a.classList.add("link");
        a.href = item.url;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.textContent = "Buka link";

        linkWrap.appendChild(a);
        cardBody.appendChild(linkWrap);
    }

    const cardBottom = document.createElement("div");
    cardBottom.classList.add("cardBottom");

    const editBtn = document.createElement("button");
    editBtn.classList.add("btn", "btnSmall");
    editBtn.textContent = "✎ Edit";
    editBtn.addEventListener("click", () => openModal("edit", item.id));

    const delBtn = document.createElement("button");
    delBtn.classList.add("btn", "btnSmall", "btnDanger");
    delBtn.textContent = "🗑 Hapus";
    delBtn.addEventListener("click", () => deleteItem(item.id));

    cardBottom.append(editBtn, delBtn);

    container.append(cardTop, cardBody, cardBottom);
    return container;
}

function toggleBought(id) {
    const target = findItem(id);
    if (!target) return;

    target.bought = !target.bought;
    target.updatedAt = new Date().toISOString();

    saveData();
    document.dispatchEvent(new Event(RENDER_EVENT));
    showToast("Status diperbarui");
}

function deleteItem(id) {
    const targetIndex = findItemIndex(id);
    if (targetIndex === -1) return;

    const ok = confirm(`Hapus "${items[targetIndex]?.name || "item"}"?`);
    if (!ok) return;

    items.splice(targetIndex, 1);

    saveData();
    document.dispatchEvent(new Event(RENDER_EVENT));
    showToast("Item dihapus");
}


function openModal(mode, id = null) {
    dom.modalOverlay.classList.add("show");
    dom.modalOverlay.setAttribute("aria-hidden", "false");
    dom.formError.classList.remove("show");

    if (mode === "edit" && id) {
        const item = findItem(id);
        if (!item) return;

        editingId = id;
        dom.modalTitle.textContent = "Edit Barang";
        dom.boughtField.style.display = "block";

        dom.nameInput.value = item.name;
        dom.priorityInput.value = item.priority;
        dom.priceInput.value = item.price || 0;
        dom.notesInput.value = item.notes || "";
        dom.urlInput.value = item.url || "";
        dom.boughtInput.checked = !!item.bought;
    } else {
        editingId = null;
        dom.modalTitle.textContent = "Tambah Barang";
        dom.boughtField.style.display = "none";

        dom.nameInput.value = "";
        dom.priorityInput.value = "medium";
        dom.priceInput.value = "";
        dom.notesInput.value = "";
        dom.urlInput.value = "";
        dom.boughtInput.checked = false;
    }

    setTimeout(() => dom.nameInput.focus(), 50);
}

function closeModal() {
    dom.modalOverlay.classList.remove("show");
    dom.modalOverlay.setAttribute("aria-hidden", "true");
    editingId = null;
}

function applyAll(list, state) {
    let out = [...list];

    if (state.filter === "bought") out = out.filter((it) => it.bought);
    if (state.filter === "unbought") out = out.filter((it) => !it.bought);

    if (state.query) {
        out = out.filter((it) => {
            const n = (it.name || "").toLowerCase();
            const notes = (it.notes || "").toLowerCase();
            return n.includes(state.query) || notes.includes(state.query);
        });
    }

    if (state.sort === "newest") {
        out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (state.sort === "name") {
        out.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (state.sort === "priority") {
        const rank = { high: 3, medium: 2, low: 1 };
        out.sort(
            (a, b) =>
                (rank[b.priority] - rank[a.priority]) ||
                new Date(b.createdAt) - new Date(a.createdAt)
        );
    }

    return out;
}

function renderStats(allItems) {
    const total = allItems.length;
    const bought = allItems.filter((it) => it.bought).length;
    dom.statsText.textContent = `${total} item • ${bought} sudah terbeli`;
}

function generateId() {
    return +new Date().getTime();
}

function makeItem({ name, priority = "medium", price = 0, notes = "", url = "" }) {
    return {
        id: generateId(),
        name,
        priority,
        price,
        notes,
        url,
        bought: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

function findItem(id) {
    for (const it of items) {
        if (it.id === id) return it;
    }
    return null;
}

function findItemIndex(id) {
    for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) return i;
    }
    return -1;
}

function isStorageExist() {
    return typeof Storage !== "undefined";
}

function saveData() {
    if (isStorageExist()) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
}

function loadDataStorage() {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (serialized !== null) {
        const data = JSON.parse(serialized);
        items = Array.isArray(data) ? data : [];
    }
    document.dispatchEvent(new Event(RENDER_EVENT));
}

function setActiveChip(filter) {
    dom.chips.forEach((c) => {
        const isActive = c.dataset.filter === filter;
        c.classList.toggle("active", isActive);
        c.setAttribute("aria-selected", isActive ? "true" : "false");
    });
}

function formatRupiah(num) {
    return (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function capitalize(s) {
    return (s || "").charAt(0).toUpperCase() + (s || "").slice(1);
}

let toastTimer = null;
function showToast(msg) {
    dom.toast.textContent = msg;
    dom.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.remove("show"), 1400);
}
