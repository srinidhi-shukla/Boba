// script.js (FULL)
let history = [];
let userName = "";
let selectedVibe = "";

// --- AI Recommendation ---
async function getAIRecommendation(mood) {
  try {
    const res = await fetch("http://localhost:3001/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mood,
        userName: userName || "Guest"
      })
    });

    return await res.json();
  } catch (err) {
    console.error("AI recommendation failed", err);
    return null;
  }
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function navigate(to) {
  const current = document.querySelector(".screen.active")?.id;
  if (current) history.push(current);
  showScreen(to);
  if (to === "path-screen") runPathIntro();
}

function goBack() {
  const prev = history.pop();
  if (prev) showScreen(prev);
}

function startOrdering() {
  const nameInput = document.getElementById("user-name");
  const phoneInput = document.getElementById("phone-number");

  if (!nameInput?.value.trim()) {
    nameInput?.focus();
    return;
  }

  const phoneDigits = (phoneInput?.value || "").replace(/\D/g, "");
  const hasPhone = (phoneInput?.value || "").trim().length > 0;
  if (hasPhone && phoneDigits.length < 10) {
    phoneInput?.focus();
    return;
  }

  userName = nameInput.value.trim();

  document.getElementById("welcome-user").innerText =
    `How would you like to order, ${userName}?`;

  document.getElementById("vibe-user").innerText =
    `Your vibe, ${userName}`;

  navigate("path-screen");
}


async function selectVibe(vibe) {
  selectedVibe = vibe;

  goToRecommendations();

  const aiDrink = await getAIRecommendation(vibe);
  console.log("AI RESPONSE 👉", aiDrink); 
  
  // 🧠 Inject AI drink into UI
document.getElementById("ai-drink-name").innerText =
  aiData.drink_name;

document.getElementById("ai-drink-meta").innerText =
  `${aiData.base} · ${aiData.flavor}${aiData.topping ? " · " + aiData.topping : ""}`;


  if (!aiDrink || aiDrink.error) return;
  injectAIDrink(aiDrink);
}



function toggleDescribe() {
  const wrap = document.getElementById("describe-wrap");
  wrap.classList.toggle("open");
  wrap.setAttribute("aria-hidden", wrap.classList.contains("open") ? "false" : "true");

  if (wrap.classList.contains("open")) {
    document.getElementById("mood-text").focus();
  }
}

async function applyMoodText() {
  const text = (document.getElementById("mood-text").value || "").trim();
  if (!text) return;

  selectedVibe = text;
  goToRecommendations();

  const aiDrink = await getAIRecommendation(text);
  if (!aiDrink || aiDrink.error) return;

  injectAIDrink(aiDrink);
}


function clearVibe(clearHistoryToo = true) {
  selectedVibe = "";

  // clear selected styles
  document.querySelectorAll(".vibe-btn").forEach(btn => btn.classList.remove("selected"));

  // clear input + close describe
  const mood = document.getElementById("mood-text");
  if (mood) mood.value = "";
  const wrap = document.getElementById("describe-wrap");
  if (wrap) {
    wrap.classList.remove("open");
    wrap.setAttribute("aria-hidden", "true");
  }

  if (clearHistoryToo) {
    // keep history as-is unless requested
  }
}

function clearRecommendations() {
  // clear vibe + go back to vibe screen
  clearVibe();
  showScreen("vibe-screen");
}

function goToMenu() {
  alert("Full menu coming next!");
}
function goToVibe() {
  navigate("vibe-screen");
}

function goToCategory() {
  navigate("full-menu-screen");
  initMenuSlider(true);
}

function resetOrder() {
  history = [];
  selectedVibe = "";
  userName = "";

  document.querySelectorAll("input").forEach(i => i.value = "");
  document.querySelectorAll(".vibe-btn").forEach(b => b.classList.remove("selected"));

  showScreen("welcome-screen");
}
function goToFullMenu() {
  navigate("full-menu-screen");
  initMenuSlider(true);
}
// --- Item detail modal ---
const itemState = {
  current: "",
  type: "boba",
  basePrice: 0,
  tea: null,
  sweet: "75%",
  ice: "75%",
  toppings: [],
  img: "assets/placeholder.png"
};
let cart = [];
let paymentMethod = "";
let showAllToppings = false;
let orderNumber = "";

const basePrices = {
  boba: 180,
  simple: 150,
  taiyaki: 120,
  hot: 110
};

function openItem(name, type = "boba", img = "assets/placeholder.png") {
  const modal = document.getElementById("item-modal");
  const title = document.getElementById("modal-title");
  const tag = document.getElementById("modal-type");
  const bobaWrap = document.getElementById("boba-options");
  const note = document.getElementById("modal-note");
  const imgEl = document.getElementById("modal-image");
  const modalUpsell = document.getElementById("modal-upsell");

  if (!modal) return;

  itemState.current = name;
  itemState.type = type;
  itemState.basePrice = basePrices[type] || 150;
  itemState.img = img || "assets/placeholder.png";
  itemState.tea = null;
  itemState.sweet = "75%";
  itemState.ice = "75%";
  itemState.toppings = [];

  title.textContent = name;
  tag.textContent = type === "boba" ? "BOBA" : type.toUpperCase();
  if (imgEl) imgEl.src = itemState.img;

  // toggle options visibility
  if (bobaWrap) bobaWrap.style.display = type === "boba" ? "block" : "none";
  if (note) {
    note.textContent = type === "boba"
      ? "Pick up to 2 toppings. Customize your drink, then add to cart."
      : "Ready to add this to your cart.";
  }
  if (modalUpsell) {
    modalUpsell.style.display = type === "boba" && !hasWaffleInCart() ? "flex" : "none";
  }

  // reset option pills
  document.querySelectorAll(".option-pill").forEach(p => p.classList.remove("active"));
  // defaults
  selectSweetness(itemState.sweet);
  selectIce(itemState.ice);
  showAllToppings = false;
  updateToppingsVisibility();

  updatePrice();
  modal.classList.remove("hidden");
}

function closeItem() {
  const modal = document.getElementById("item-modal");
  if (modal) modal.classList.add("hidden");
}

function handleModalBackdrop(e) {
  if (e.target.id === "item-modal") closeItem();
}

function selectTea(label, extra = 0) {
  itemState.tea = { label, extra };
  setSingleActive("tea-options", label);
  updatePrice();
}

function selectSweetness(label) {
  itemState.sweet = label;
  setSingleActive("sweet-options", label);
}

function selectIce(label) {
  itemState.ice = label;
  setSingleActive("ice-options", label);
}

function toggleTopping(label, extra = 0) {
  const existing = itemState.toppings.find(t => t.label === label);
  if (existing) {
    itemState.toppings = itemState.toppings.filter(t => t.label !== label);
  } else {
    if (itemState.toppings.length >= 2) {
      const note = document.getElementById("modal-note");
      if (note) note.textContent = "You can pick up to 2 toppings.";
      return;
    }
    itemState.toppings.push({ label, extra });
  }
  setToggleActive("topping-options", label);
  updatePrice();
}

function toggleToppingsVisibility() {
  showAllToppings = !showAllToppings;
  updateToppingsVisibility();
}

function updateToppingsVisibility() {
  const buttons = document.querySelectorAll("#topping-options .option-pill");
  buttons.forEach((btn, idx) => {
    btn.style.display = showAllToppings || idx < 4 ? "" : "none";
  });
  const toggleBtn = document.querySelector(".topping-toggle-btn");
  if (toggleBtn) {
    toggleBtn.textContent = showAllToppings ? "Hide extra toppings" : "View all toppings";
  }
}

function resetCart() {
  cart = [];
  renderCart();
}

// initialize topping visibility on load
updateToppingsVisibility();

function showPaymentConfirmation(method) {
  const block = document.getElementById("payment-confirm");
  const numberEl = document.getElementById("confirm-number");
  const cashEl = document.getElementById("confirm-cash");
  const statusEl = document.getElementById("confirm-status");
  if (!block) return;

  if (!orderNumber) {
    const ts = Date.now().toString();
    orderNumber = ts.slice(-6);
  }
  orderStatus = "Preparing";
  if (numberEl) numberEl.textContent = `Order #${orderNumber}`;
  if (cashEl) {
    cashEl.classList.toggle("hidden", method !== "cash");
  }
  if (statusEl) {
    statusEl.textContent = `Status: ${orderStatus}`;
  }
  block.classList.remove("hidden");
}

function setSingleActive(containerId, label) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.querySelectorAll(".option-pill").forEach(btn => {
    const matches = btn.textContent.trim().startsWith(label);
    btn.classList.toggle("active", matches);
  });
}

function setToggleActive(containerId, label) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.querySelectorAll(".option-pill").forEach(btn => {
    if (btn.textContent.trim().startsWith(label)) {
      btn.classList.toggle("active");
    }
  });
}

function updatePrice() {
  const priceEl = document.getElementById("modal-price");
  let total = itemState.basePrice;

  if (itemState.tea?.extra) total += itemState.tea.extra;
  itemState.toppings.forEach(t => { total += t.extra || 0; });

  if (priceEl) priceEl.textContent = `${total}`;
}

function addToCart() {
  const total = itemState.basePrice +
    (itemState.tea?.extra || 0) +
    itemState.toppings.reduce((sum, t) => sum + (t.extra || 0), 0);

  cart.push({
    name: itemState.current,
    total,
    type: itemState.type,
    tea: itemState.tea?.label || "",
    sweet: itemState.sweet,
    ice: itemState.ice,
    toppings: itemState.toppings.map(t => t.label),
    qty: 1,
    img: itemState.img || "assets/placeholder.png"
  });

  renderCart();
  closeItem();
  navigate("cart-screen");
}

function hasWaffleInCart() {
  return cart.some(item => item.name === "Bubble Waffle");
}

function addWaffleUpsell() {
  if (hasWaffleInCart()) {
    updateComboUpsells();
    return;
  }
  cart.push({
    name: "Bubble Waffle",
    total: 99,
    type: "simple",
    tea: "",
    sweet: "",
    ice: "",
    toppings: [],
    qty: 1,
    img: "assets/placeholder.png"
  });
  renderCart();
  updateComboUpsells();
}

function updateComboUpsells() {
  const modalUpsell = document.getElementById("modal-upsell");
  const shouldShow = itemState.type === "boba" && !hasWaffleInCart();

  if (modalUpsell) {
    modalUpsell.style.display = shouldShow ? "flex" : "none";
  }
}

function renderCart() {
  const list = document.getElementById("cart-list");
  const totalEl = document.getElementById("cart-total");
  const totalSummaryEl = document.getElementById("cart-total-summary");
  const countEl = document.getElementById("cart-count");
  const badgeEl = document.getElementById("cart-badge");

  if (!list) return;

  if (!cart.length) {
    list.innerHTML = '<p class="note">Your cart is empty.</p>';
    if (totalEl) totalEl.textContent = "0";
    if (totalSummaryEl) totalSummaryEl.textContent = "₹0";
    if (countEl) countEl.textContent = "0";
    if (badgeEl) badgeEl.textContent = "0";
    updateComboUpsells();
    return;
  }

  let total = 0;
  list.innerHTML = "";
  cart.forEach((item, idx) => {
    total += item.total * (item.qty || 1);
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <img class="cart-thumb" src="${item.img}" alt="${item.name}">
      <div class="cart-info">
        <div class="cart-item-title">${item.name}</div>
        <div class="cart-item-meta">
          ${item.type}${item.tea ? " · " + item.tea : ""}${item.toppings.length ? " · " + item.toppings.join(", ") : ""}
        </div>
      </div>
      <div class="cart-controls">
        <select class="cart-qty" onchange="updateCartQty(${idx}, this.value)">
          ${[1,2,3,4,5].map(n => `<option value="${n}" ${n === (item.qty||1) ? "selected" : ""}>${n}</option>`).join("")}
        </select>
        <div class="cart-price">₹${item.total * (item.qty || 1)}</div>
      </div>
    `;
    list.appendChild(div);
  });

  if (totalEl) totalEl.textContent = `${total}`;
  if (totalSummaryEl) totalSummaryEl.textContent = `₹${total}`;
  if (countEl) countEl.textContent = `${cart.length}`;
  if (badgeEl) badgeEl.textContent = `${cart.length}`;
}

function openCart() {
  renderCart();
  navigate("cart-screen");
}

function goToPayment() {
  renderCart();
  navigate("payment-screen");
}

function updateCartQty(index, value) {
  const qty = parseInt(value, 10) || 1;
  if (cart[index]) {
    cart[index].qty = qty;
    renderCart();
  }
}
function selectPayment(method) {
  paymentMethod = method;
  document.querySelectorAll(".payment-card-btn").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.method === method);
  });
  showPaymentConfirmation(method);
}
// --- Recommendation data ---
const sipRecs = [
  {
    title: "Strawberry Milk Tea",
    desc: "Light · Fruity · Crowd favourite",
    img: "assets/placeholder.png"
  },
  {
    title: "Matcha Milk Tea",
    desc: "Earthy · Balanced · Not too sweet",
    img: "assets/placeholder.png"
  },
  {
    title: "Brown Sugar Milk Tea",
    desc: "Rich · Creamy · Bestseller",
    img: "assets/placeholder.png"
  }
];

const eatRecs = [
  {
    title: "Bubble Waffle",
    desc: "Warm · Crispy · Best with boba",
    img: "assets/placeholder.png"
  },
  {
    title: "Taiyaki",
    desc: "Soft · Sweet · Comfort snack",
    img: "assets/placeholder.png"
  }
];

let sipIndex = 0;
let eatIndex = 0;

// --- Navigation ---
function nextSip() {
  sipIndex = (sipIndex + 1) % sipRecs.length;
  updateSip();
}

function nextEat() {
  eatIndex = (eatIndex + 1) % eatRecs.length;
  updateEat();
}

function updateSip() {
  const img = document.getElementById("sip-img");
  const title = document.getElementById("sip-title");
  const desc = document.getElementById("sip-desc");
  const count = document.getElementById("sip-count");

  // If the dynamic sip UI isn't on this page, skip instead of throwing.
  if (!img || !title || !desc || !count) return;

  const r = sipRecs[sipIndex];
  img.src = r.img;
  title.innerText = r.title;
  desc.innerText = r.desc;
  count.innerText = `Recommendation ${sipIndex + 1} of ${sipRecs.length}`;
}

function updateEat() {
  const img = document.getElementById("eat-img");
  const title = document.getElementById("eat-title");
  const desc = document.getElementById("eat-desc");
  const count = document.getElementById("eat-count");

  // Skip if the expected dynamic elements aren't present.
  if (!img || !title || !desc || !count) return;

  const r = eatRecs[eatIndex];
  img.src = r.img;
  title.innerText = r.title;
  desc.innerText = r.desc;
  count.innerText = `Recommendation ${eatIndex + 1} of ${eatRecs.length}`;
}

// Ensure first render is correct
updateSip();
updateEat();

function toggleWhyPanel(el) {
  const card = el.closest(".rec-card");
  const wrap = card?.querySelector(".why-text");
  const swipe = el.closest(".rec-swipe");
  if (!wrap || !swipe) return;

  swipe.querySelectorAll(".why-text.open").forEach(node => {
    if (node !== wrap) node.classList.remove("open");
  });

  wrap.classList.toggle("open");
}

function initRecDots() {
  const viewports = document.querySelectorAll(".rec-viewport");
  viewports.forEach(view => {
    const swipe = view.querySelector(".rec-swipe");
    const dots = view.nextElementSibling;
    if (!swipe || !dots || !dots.classList.contains("rec-dots")) return;
    const cards = swipe.querySelectorAll(".rec-card");
    if (!cards.length) return;

    const update = () => {
      const viewportCenter = swipe.scrollLeft + swipe.clientWidth / 2;
      let active = 0;
      cards.forEach((card, idx) => {
        const rect = card.getBoundingClientRect();
        const left = card.offsetLeft;
        const center = left + rect.width / 2;
        if (Math.abs(center - viewportCenter) < Math.abs((cards[active].offsetLeft + cards[active].getBoundingClientRect().width / 2) - viewportCenter)) {
          active = idx;
        }
      });
      dots.querySelectorAll(".dot").forEach((dot, i) => {
        dot.classList.toggle("active", i === active);
      });
    };

    swipe.addEventListener("scroll", () => requestAnimationFrame(update));
    window.addEventListener("resize", () => requestAnimationFrame(update));
    update();
  });
}

initRecDots();
const moodCopy = {
  fresh: {
    title: "Fresh & easygoing",
    sip: "Light, refreshing drinks",
    eat: "Warm bites that go best with boba"
  },
  chill: {
    title: "Calm & comforting",
    sip: "Smooth, balanced sips",
    eat: "Soft, cozy bites"
  },
  sweet: {
    title: "Sweet & indulgent",
    sip: "Dessert-like treats",
    eat: "Sweet bites to satisfy cravings"
  },
  energy: {
    title: "Energised & focused",
    sip: "Bold flavours to wake you up",
    eat: "Quick bites to keep you going"
  },
  fun: {
    title: "Playful & adventurous",
    sip: "Popular, crowd-pleasing drinks",
    eat: "Snacks made for sharing"
  }
};
function goToRecommendations() {
  const sub = document.getElementById("rec-subtitle");
  const explainer = document.getElementById("rec-explainer");
  const matchTitle = document.getElementById("match-title");
  const sipHelper = document.getElementById("sip-helper");
  const eatHelper = document.getElementById("eat-helper");

  const mood = moodCopy[selectedVibe];
  const vibeExplainers = {
    chill: "A smooth, calming pick that’s easy to sip",
    fresh: "Light, refreshing flavors perfect for now",
    sweet: "Rich and indulgent — just what you’re craving",
    energy: "Bold flavors to give you a boost",
    fun: "Playful flavors with a twist"
  };

  if (sub) {
    sub.textContent = selectedVibe
      ? `Based on: “${selectedVibe}”`
      : "";
  }
  if (explainer) {
    explainer.textContent = vibeExplainers[selectedVibe] || "";
  }



  if (mood) {
    if (matchTitle) matchTitle.textContent = mood.title;
    if (sipHelper) sipHelper.textContent = mood.sip;
    if (eatHelper) eatHelper.textContent = mood.eat;
  }

  navigate("recommendation-screen");
}

// --- Full menu slider ---
const menuTabs = ["fruit", "milk", "waffle", "hot"];
let menuTabIndex = 0;
let menuSwipeStartX = 0;
let menuSwipeStartY = 0;
let menuSwipeStartTime = 0;
let menuSliderInitialized = false;
let isProgrammaticMenuScroll = false;
let pathIntroTimeout;

function bindMenuTabClicks() {
  document.querySelectorAll(".menu-tab").forEach(btn => {
    const tab = btn.getAttribute("data-tab");
    if (!tab || btn.dataset.menuTabBound === "true") return;

    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      goToMenuSlide(tab);
    };

    btn.addEventListener("click", handler, { passive: false });
    btn.addEventListener("pointerup", handler, { passive: false });
    btn.dataset.menuTabBound = "true";
  });
}

function setMenuTab(idx, smooth = true) {
  if (!Number.isFinite(idx) || idx < 0 || idx >= menuTabs.length) return;

  const slider = document.getElementById("menu-slider");
  if (!slider) return;

  menuTabIndex = idx;
  slider.style.transition = "none";
  slider.style.transform = "none";
  const slide = slider.querySelector(`.menu-slide[data-tab="${menuTabs[idx]}"]`);
  if (slide) {
    isProgrammaticMenuScroll = true;
    slide.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "nearest",
      inline: "start"
    });
    const fullMenuShell = document.querySelector("#full-menu-screen .card.scroll");
    if (fullMenuShell) {
      fullMenuShell.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
    }
    setTimeout(() => {
      isProgrammaticMenuScroll = false;
    }, smooth ? 350 : 0);
  }

  document.querySelectorAll(".menu-tab").forEach(btn => {
    const tab = btn.getAttribute("data-tab");
    btn.classList.toggle("active", tab === menuTabs[idx]);
  });
}

function goToMenuSlide(key) {
  const idx = menuTabs.indexOf(key);
  if (idx === -1) return;
  setMenuTab(idx, false); // jump directly to avoid intermediate snapping
}

function menuPrev() {
  if (menuTabIndex > 0) setMenuTab(menuTabIndex - 1);
}

function menuNext() {
  if (menuTabIndex < menuTabs.length - 1) setMenuTab(menuTabIndex + 1);
}

function handleMenuSwipeStart(e) {
  const t = e.changedTouches ? e.changedTouches[0] : e;
  menuSwipeStartX = t.clientX;
  menuSwipeStartY = t.clientY;
  menuSwipeStartTime = Date.now();
}

function handleMenuSwipeEnd(e) {
  const t = e.changedTouches ? e.changedTouches[0] : e;
  const dx = t.clientX - menuSwipeStartX;
  const dy = Math.abs(t.clientY - menuSwipeStartY);
  const dt = Date.now() - menuSwipeStartTime;

  // ignore vertical or long drags
  if (dy > 80 || dt > 800) return;
  if (Math.abs(dx) < 10 && dy < 10) return; // treat tiny movement as a tap

  if (dx < -50) {
    menuNext();
  } else if (dx > 50) {
    menuPrev();
  }
}

function syncMenuFromScroll() {
  if (isProgrammaticMenuScroll) return;

  const slider = document.getElementById("menu-slider");
  if (!slider) return;

  const slides = Array.from(slider.querySelectorAll(".menu-slide"));
  if (!slides.length) return;

  const scrollLeft = slider.scrollLeft;
  let nearestIdx = 0;
  let nearestDistance = Math.abs(slides[0].offsetLeft - scrollLeft);

  slides.forEach((slide, idx) => {
    const dist = Math.abs(slide.offsetLeft - scrollLeft);
    if (dist < nearestDistance) {
      nearestIdx = idx;
      nearestDistance = dist;
    }
  });

  if (nearestIdx !== menuTabIndex) {
    setMenuTab(nearestIdx, false);
  }
}

function initMenuSlider(force = false) {
  if (menuSliderInitialized && !force) return;

  const sliderEl = document.getElementById("menu-slider");
  const wrapEl = document.querySelector(".menu-slider-wrap");
  if (!sliderEl || !wrapEl) return;

  bindMenuTabClicks();

  if (!menuSliderInitialized) {
    ["touchstart", "pointerdown", "mousedown"].forEach(evt =>
      wrapEl.addEventListener(evt, handleMenuSwipeStart, { passive: true })
    );
    ["touchend", "pointerup", "mouseup"].forEach(evt =>
      wrapEl.addEventListener(evt, handleMenuSwipeEnd, { passive: true })
    );

    sliderEl.addEventListener("scroll", syncMenuFromScroll, { passive: true });
    menuSliderInitialized = true;
  }

  sliderEl.scrollLeft = 0;
  requestAnimationFrame(() => setMenuTab(menuTabIndex, false));
}

// --- Swipe back gesture (mobile friendly) ---
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

function handleTouchStart(e) {
  const t = e.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchStartTime = Date.now();
}

function handleTouchEnd(e) {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = Math.abs(t.clientY - touchStartY);
  const dt = Date.now() - touchStartTime;

  // Skip if interacting with horizontal carousels/navs to avoid conflict.
  if (
    e.target.closest(".rec-swipe") ||
    e.target.closest(".menu-nav") ||
    e.target.closest(".menu-slider-wrap")
  ) return;

  if (dx > 60 && dy < 60 && dt < 600) {
    goBack();
  }
}

const appRoot = document.querySelector(".app");
if (appRoot) {
  appRoot.addEventListener("touchstart", handleTouchStart, { passive: true });
  appRoot.addEventListener("touchend", handleTouchEnd, { passive: true });
}

// Init menu slider once DOM is ready (support late script load)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMenuSlider);
} else {
  initMenuSlider();
}

function runPathIntro() {
  const screen = document.getElementById("path-screen");
  if (!screen) return;

  screen.classList.remove("path-anim");
  if (pathIntroTimeout) clearTimeout(pathIntroTimeout);

  // force reflow to restart animation
  void screen.offsetWidth;
  pathIntroTimeout = setTimeout(() => {
    screen.classList.add("path-anim");
  }, 20);
}
function injectAIDrink(aiDrink) {
  const swipe = document.getElementById("rec-swipe-sip");
  if (!swipe) return;

  // remove old AI card if exists
  swipe.querySelectorAll(".ai-rec-card").forEach(c => c.remove());

  const card = document.createElement("div");
  card.className = "rec-card ai-rec-card";

  card.innerHTML = `
    <div class="rec-image">
      <img src="assets/placeholder.png" alt="${aiDrink.drink_name}">
    </div>
    <div class="rec-meta">
      <h3>${aiDrink.drink_name}</h3>
      <p>${aiDrink.base} · ${aiDrink.flavor}${aiDrink.topping ? " · " + aiDrink.topping : ""}</p>

      <button class="rec-primary-btn"
        onclick="openItem('${aiDrink.drink_name}','boba','assets/placeholder.png')">
        Customize & add
      </button>

      <div class="rec-why">
        <button class="why-toggle" onclick="toggleWhyPanel(this)">ⓘ</button>
        <p class="why-text open">
          ${aiDrink.reason}
        </p>
      </div>
    </div>
  `;

  // insert as FIRST recommendation
  swipe.prepend(card);

  // update explainer text
  const explainer = document.getElementById("rec-explainer");
  if (explainer) {
    explainer.textContent = "✨ Custom drink crafted for your mood using our fresh ingredients.";
  }
}
