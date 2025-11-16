// Vue 2.7 (Options API) – FRONTEND connected to BACKEND
const API_BASE = "https://node-js-d2bi.onrender.com";

// simple debounce helper for "search as you type"
function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), wait);
  };
}

new Vue({
  el: "#app",
  
  // STATE
  data: {
    // layout + navigation
    navOpen: false,
    showCart: false,     // false → show lessons page, true → show cart page

    
    // toolbar (sorting + searching)
    sortKey: "subject",
    sortDir: "asc",
    query: "",                // text typed by the user
    qDebounced: "",           // debounced version used for backend search
    isLoading: false,

    // UI feedback
    toast: "",
    orderMessage: "",
    theme: "mauritius",
    error: "",

    // server data
    lessons: [],
    total: 0,
    page: 1,
    limit: 9,

    // cart + checkout
    cart: [],                 // holds one entry per unit added to the cart
    order: { name: "", phone: "" },
  },

  // LIFECYCLE
  created() {
    // restore theme from localStorage if available
    const saved = localStorage.getItem("theme");
    if (saved) this.theme = saved;

    this.applyTheme();
    // initial GET fetch: load all lessons from backend
    this.fetchLessons();
  },

  // WATCHERS
  watch: {
    // persist theme and apply CSS variable
    theme(newVal) {
      this.applyTheme();
      localStorage.setItem("theme", newVal);
    },

    // search-as-you-type:
    // every time user types, we update qDebounced after a short delay
    // and call /lessons or /search on the backend.
    query(val) {
      clearTimeout(this._qt);
      this._qt = setTimeout(() => {
        this.qDebounced = val;
        this.page = 1;

        const q = (this.qDebounced || "").trim();
        if (q === "") {
          // empty search → show full list from /lessons
          this.fetchLessons();
        } else {
          // non-empty → use backend /search (Approach 2 + "search as you type")
          this.fetchSearch();
        }
      }, 150);
    },
    
    // when sorting changes, reload lessons from backend
    sortKey() {
      this.page = 1;
      this.fetchLessons();
    },
    sortDir() {
      this.page = 1;
      this.fetchLessons();
    },
  },

  // DERIVED VALUES
  computed: {
    // number of units in the cart
    cartCount() {
      return this.cart.length;
    },

    // simple validation for name and phone
    validName() {
      return /^[A-Za-z ]+$/.test(this.order.name);
    },
    validPhone() {
      return /^\d{8}$/.test(this.order.phone);
    },

    // total number of units (sum of quantities)
    totalQty(){ 
      return this.groupedCart.reduce((n,e)=> n + e.qty, 0); 
    },

    // VAT and grand total (frontend only, for display)
    vatAmount(){ 
      return this.cartSubtotal * 0.15;
    },
    grandTotal(){
      return this.cartSubtotal + this.vatAmount; 
    },


    // Group identical lessons in the cart by ID
    // This feeds both sidebar and main cart view.
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

    // subtotal of all items in cart
    cartSubtotal() {
      return this.groupedCart.reduce((sum, e) => sum + e.price * e.qty, 0);
    },

    // lessons used on the lessons grid – here we only sort;
    // all filtering (search) is done BACKEND-side (Approach 2).
    displayedLessons() {
      let list = (this.lessons || []).slice();

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

    // apply CSS theme using data-theme attribute (used in CSS)
    applyTheme() {
      document.documentElement.setAttribute("data-theme", this.theme);
    },

    // pretty-print values in Mauritian Rupees (MUR)
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

    // small toast message (top-right)
    flashToast(msg) {
      this.toast = msg;
      setTimeout(() => (this.toast = ""), 1200);
    },

    // ==================== Navigation ====================
    toggleNav() {
      this.navOpen = !this.navOpen;
    },

    // switch back to lessons page
    goLessons() {
      this.showCart = false;
      this.navOpen = false;
    },

    // switch to cart page and scroll to it
    goToCart() {
      this.showCart = true;
      this.showProduct = false; // switch to cart page
      this.$nextTick(() => {
        const el = document.querySelector(".cart");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      });
    },

    // clear input and reload full lesson list
    clearSearch() {
      this.query = "";
      this.fetchLessons();
    },

    // ===================== Backend search (GET /search) =====================
    // Implements "Approach 2": searching is done on Express + MongoDB.
    async fetchSearch() {
      try {
        const qs = new URLSearchParams({
          q: (this.qDebounced || "").trim(),
          sort: this.sortKey,
          dir: this.sortDir
        });

        const r = await fetch(`${API_BASE}/search?` + qs.toString());
        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const data = await r.json();

        if (Array.isArray(data)) {
          this.lessons = data;
          this.total = data.length;
        } else {
          this.lessons = data.items || [];
          this.total = data.total ?? this.lessons.length;
        }
      } catch (e) {
        console.error(e);
        this.flashToast("Search failed");
      }
    },

    // ==================== Fetch lessons ====================
    // Base listing route – loads all lessons (optionally with sorting).
    async fetchLessons() {
      try {
        const qs = new URLSearchParams({
          search: (this.qDebounced || "").trim(),
          sort: this.sortKey,
          dir: this.sortDir
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
        }
      } catch (err) {
        console.error(err);
        this.flashToast("Failed to load lessons");
      }
    },

    // ===================== Media helpers =====================

    // Determines which image (if any) to show for a lesson.
    // If no image is found, the UI falls back to a Font Awesome icon.
    lessonImage(lesson){
      if (lesson.image) return lesson.image;                       // backend-provided URL
      const slug = this.slug(String(lesson.subject || ''));        // e.g., "coding-beginner"
      return `images/lessons/${slug}.png`;
    },

    // Pick a Font Awesome icon based on the subject keywords
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

  // Convert subject to slug ("Coding (Beginner)" → "coding-beginner")
  slug(str){
    return str
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g,'') // strip accents
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/(^-|-$)/g,'');
  },

    // ===================== Cart helpers =====================

    // get a stable ID whether Mongo uses _id or a custom id
    getId(obj) {
      return obj._id || obj.id;
    },

    // how many units of a given lesson are already in cart
    countInCart(lesson) {
      const id = this.getId(lesson);
      return this.cart.filter((i) => this.getId(i) === id).length;
    },

    // available spaces for a lesson, taking cart content into account
    remainingSpaces(lesson) {
      const total = Number(lesson.spaces) || 0;
      return Math.max(0, total - this.countInCart(lesson));
    },

    // remaining spaces using an ID key (used by groupedCart)
    remainingSpacesById(id) {
      const lesson = this.lessons.find((l) => this.getId(l) === id);
      const total = Number(lesson?.spaces) || 0;
      return Math.max(0, total - this.countInCart({ id }));
    },

    // Add one unit of a lesson to the cart
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

    // Increase quantity for a grouped entry (used in side cart)
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

    // Decrease one unit from a grouped entry (used in side cart)
    decQty(entry) {
      const idx = this.cart.findIndex(
        (i) => this.getId(i) === entry.key
      );
      if (idx > -1) this.cart.splice(idx, 1);
    },

    // Remove all units of a grouped entry (used in main cart)
    removeEntry(entry) {
      this.cart = this.cart.filter((i) => this.getId(i) !== entry.key);
    },

    // ==================== Checkout ====================
    async submitOrder() {
       // basic frontend validation
      if (!(this.validName && this.validPhone && this.cart.length > 0)) return;

      this.isLoading = true;

      try {
         // group cart items by lesson ID
        const grouped = this.groupedCart.map((g) => ({
          lessonId: g.key,
          qty: g.qty,
        }));

         // B. POST fetch – create new order (required by rubric)
        const r = await fetch(`${API_BASE}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: this.order.name,
            phone: this.order.phone,
            items: grouped,
          }),
        });

        // C. PUT fetch – update spaces for each lesson (required by rubric)
        // This demonstrates /lessons/:id from the FRONT-END.
        for (const g of grouped) {     // grouped = [{ lessonId, qty }]
          try {
            // Find the lesson in the lessons array
            const lesson = this.lessons.find(l => (l._id || l.id) === g.lessonId);
            if (!lesson) continue;

            const newSpaces = Math.max(0, Number(lesson.spaces) - g.qty);

            await fetch(`${API_BASE}/lessons/${g.lessonId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ spaces: newSpaces }),
            });
          } catch (e) {
             // ignore individual PUT errors in the UI;
            // backend transaction in /orders is the source of truth.
          }
        }


        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "Order failed");

        this.orderMessage = `Order submitted for ${this.order.name}.`;
        this.cart = [];
        await this.fetchLessons();  // refresh spaces after ordering
        this.flashToast("Order placed");
      } catch (e) {
        alert(e.message || "Order failed");
      } finally {
        this.isLoading = false;
      }
    },

    // Scroll to checkout form when user clicks "Proceed to Checkout"
    scrollToCheckout(){
      this.$nextTick(()=>{
        const el = document.getElementById('checkout');
        if (el)
           el.scrollIntoView({
           behavior: 'smooth', 
           block: 'start' 
          });
      });
    },

    // badge colour class depending on remaining spaces
    spaceClass(spaces) {
      if (spaces === 0) return "spaces-zero";
      if (spaces <= 2) return "spaces-low";
      return "spaces-ok";
    },
  },
});

