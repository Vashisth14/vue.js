// Vue 2.7 (Options API) – FRONTEND connected to BACKEND
const API_BASE = "http://localhost:8080";

new Vue({
  el: "#app",
  data: {
    navOpen: false,
    showCart: false,

    // UI
    sortKey: "subject",
    sortDir: "asc",
    query: "",
    qDebounced: "",
    isLoading: false,
    toast: "",
    orderMessage: "",
    theme: "mauritius",

    // Server data
    lessons: [],
    total: 0,
    page: 1,
    limit: 9,

    // Cart / order
    cart: [], // stores one object per unit
    order: { name: "", phone: "" },
  },

  created() {
    const saved = localStorage.getItem("theme");
    if (saved) this.theme = saved;
    this.applyTheme();
    this.fetchLessons();
  },

  watch: {
    theme(newVal) {
      this.applyTheme();
      localStorage.setItem("theme", newVal);
    },
    query(val) {
      clearTimeout(this._qt);
      this._qt = setTimeout(() => {
        this.qDebounced = val;
        this.page = 1;
        this.fetchLessons();
      }, 150);
    },
    sortKey() {
      this.page = 1;
      this.fetchLessons();
    },
    sortDir() {
      this.page = 1;
      this.fetchLessons();
    },
  },

  computed: {
    cartCount() {
      return this.cart.length;
    },
    validName() {
      return /^[A-Za-z ]+$/.test(this.order.name);
    },
    validPhone() {
      return /^\d{8}$/.test(this.order.phone);
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.total / this.limit));
    },

    totalQty(){ return this.groupedCart.reduce((n,e)=> n + e.qty, 0); },
    vatAmount(){ return this.cartSubtotal * 0.15; },
    grandTotal(){ return this.cartSubtotal + this.vatAmount; },


    // Group identical lessons (for sidebar + subtotal)
    groupedCart() {
      const byId = {};
      for (const i of this.cart) {
        const id = i._id || i.id;
        if (!byId[id]) {
          const lesson = this.lessons.find((l) => (l._id || l.id) === id) || i;
          byId[id] = {
            key: id,
            subject: lesson.subject,
            location: lesson.location,
            price: Number(lesson.price) || 0,
            spaces: Number(lesson.spaces) || 0,
            qty: 0,
          };
        }
        byId[id].qty++;
      }
      return Object.values(byId);
    },

    cartSubtotal() {
      return this.groupedCart.reduce((sum, e) => sum + e.price * e.qty, 0);
    },

    displayedLessons() {
      const q = (this.qDebounced || "").trim().toLowerCase();
      let list = (this.lessons || []).slice();
      if (q) {
        const n = Number(q);
        const maybeNum = !Number.isNaN(n);
        list = list.filter((l) => {
          const subj = (l.subject || "").toLowerCase();
          const loc = (l.location || "").toLowerCase();
          const price = Number(l.price);
          const spaces = Number(l.spaces);
          return (
            subj.includes(q) ||
            loc.includes(q) ||
            (maybeNum && (price === n || spaces === n))
          );
        });
      }
      const key = this.sortKey;
      const dir = this.sortDir === "desc" ? -1 : 1;
      list.sort((a, b) => {
        let va = a[key],
          vb = b[key];
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      });
      return list;
    },
  },

  methods: {
    // ==================== Utility ====================
    applyTheme() {
      document.documentElement.setAttribute("data-theme", this.theme);
    },
    currency(n) {
      try {
        return new Intl.NumberFormat("en-MU", {
          style: "currency",
          currency: "MUR",
          currencyDisplay: "narrowSymbol",
          minimumFractionDigits: 2,
        }).format(Number(n));
      } catch {
        return "Rs " + Number(n).toFixed(2);
      }
    },
    flashToast(msg) {
      this.toast = msg;
      setTimeout(() => (this.toast = ""), 1200);
    },

    // ==================== Navigation ====================
    toggleNav() {
      this.navOpen = !this.navOpen;
    },
    goLessons() {
      this.showCart = false;
      this.navOpen = false;
    },
    goCart() {
      if (this.cartCount === 0) return;
      this.showCart = true;
      this.navOpen = false;
    },
    clearSearch() {
      this.query = "";
      this.fetchLessons();
    },

    // ==================== Fetch lessons ====================
    async fetchLessons() {
      try {
        const qs = new URLSearchParams({
          search: (this.qDebounced || "").trim(),
          sort: this.sortKey,
          dir: this.sortDir,
          page: this.page,
          limit: this.limit,
        });
        const r = await fetch(`${API_BASE}/lessons?` + qs.toString());
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (Array.isArray(data)) {
          this.lessons = data;
          this.total = data.length;
        } else {
          this.lessons = data.items || [];
          this.total = data.total ?? this.lessons.length;
          this.page = data.page ?? this.page;
          this.limit = data.limit ?? this.limit;
        }
      } catch (err) {
        console.error(err);
        this.flashToast("Failed to load lessons");
      }
    },

    // Return an image URL if present or if a file with a conventional name exists,
    // else null to use an icon. Adjust the folder/name rule to your setup.
    lessonImage(lesson){
      if (lesson.image) return lesson.image;                       // backend-provided URL
      const slug = this.slug(String(lesson.subject || ''));        // e.g., "coding-beginner"
      // convention: /images/lessons/<slug>.jpg — change extension/folder if needed
      // If you don’t have these files yet, this will 404 and we’ll fall back to icon.
      return `images/lessons/${slug}.png`;
    },

    lessonIcon(lesson){
    const s = String(lesson.subject || '').toLowerCase();

    if (s.includes('coding') || s.includes('program'))
      return 'fa-solid fa-laptop-code';
    if (s.includes('math'))
      return 'fa-solid fa-square-root-variable';
    if (s.includes('english') || s.includes('language'))
      return 'fa-solid fa-book-open';
    if (s.includes('history'))
      return 'fa-solid fa-landmark';
    if (s.includes('music'))
      return 'fa-solid fa-music';
    if (s.includes('art') || s.includes('craft'))
      return 'fa-solid fa-palette';
    if (s.includes('science'))
      return 'fa-solid fa-flask';
    if (s.includes('geography'))
      return 'fa-solid fa-globe-asia';
    if (s.includes('pe') || s.includes('fitness'))
      return 'fa-solid fa-person-running';
    // default
    return 'fa-solid fa-book';
  },

    // Slug helper
    slug(str){
      return str
        .normalize('NFKD').replace(/[\u0300-\u036f]/g,'') // strip accents
        .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    },

    nextPage() {
      if (this.page < this.totalPages) {
        this.page++;
        this.fetchLessons();
      }
    },
    prevPage() {
      if (this.page > 1) {
        this.page--;
        this.fetchLessons();
      }
    },

    // ==================== Quantity + Cart Logic ====================
    getId(obj) {
      return obj._id || obj.id;
    },
    countInCart(lesson) {
      const id = this.getId(lesson);
      return this.cart.filter((i) => this.getId(i) === id).length;
    },
    remainingSpaces(lesson) {
      const total = Number(lesson.spaces) || 0;
      return Math.max(0, total - this.countInCart(lesson));
    },
    remainingSpacesById(id) {
      const lesson = this.lessons.find((l) => this.getId(l) === id);
      const total = Number(lesson?.spaces) || 0;
      return Math.max(0, total - this.countInCart({ id }));
    },

    addToCart(lesson){
      const can = this.remainingSpaces(lesson);
      if (can <= 0) {
        this.flashToast('No spaces left for this lesson.');
        return;
      }
      this.cart.push({
        ...(lesson._id ? { _id: lesson._id } : { id: lesson.id }),
        subject: lesson.subject,
        location: lesson.location,
        price: Number(lesson.price) || 0
      });
    },


    // Sidebar steppers
    incQty(entry) {
      if (this.remainingSpacesById(entry.key) === 0) {
        this.flashToast("No spaces left for this lesson.");
        return;
      }
      const lesson =
        this.lessons.find((l) => this.getId(l) === entry.key) || entry;
      this.cart.push({
        ...(lesson._id ? { _id: lesson._id } : { id: lesson.id }),
        subject: lesson.subject,
        location: lesson.location,
        price: Number(lesson.price) || 0,
      });
    },
    decQty(entry) {
      const idx = this.cart.findIndex(
        (i) => this.getId(i) === entry.key
      );
      if (idx > -1) this.cart.splice(idx, 1);
    },
    removeEntry(entry) {
      this.cart = this.cart.filter((i) => this.getId(i) !== entry.key);
    },

    // ==================== Checkout ====================
    async submitOrder() {
      if (!(this.validName && this.validPhone && this.cart.length > 0)) return;
      this.isLoading = true;
      try {
        const grouped = this.groupedCart.map((g) => ({
          lessonId: g.key,
          qty: g.qty,
        }));
        const r = await fetch(`${API_BASE}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: this.order.name,
            phone: this.order.phone,
            items: grouped,
          }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "Order failed");

        this.orderMessage = `Order submitted for ${this.order.name}.`;
        this.cart = [];
        await this.fetchLessons();
        this.flashToast("Order placed");
      } catch (e) {
        alert(e.message || "Order failed");
      } finally {
        this.isLoading = false;
      }
    },

    scrollToCheckout(){
      this.$nextTick(()=>{
        const el = document.getElementById('checkout');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },

    // ==================== Visual helpers ====================
    spaceClass(spaces) {
      if (spaces === 0) return "spaces-zero";
      if (spaces <= 2) return "spaces-low";
      return "spaces-ok";
    },
  },
});

