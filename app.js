// Vue 2.7 (Options API) with nicer UX bits
new Vue({
  el: '#app',
  data: {
    navOpen: false,
    showCart: false,
    sortKey: 'subject',
    sortDir: 'asc',
    query: '',
    isLoading: false,
    toast: '',
    // Mock lessons for now – later replace with fetch(`${API_BASE}/lessons`)
    lessons: [
      { id: 1,  subject: 'Mathematics',        location: 'Port Louis',     price: 1000, spaces: 5 },
      { id: 2,  subject: 'English Skills',     location: 'Rose-Hill',      price: 900,  spaces: 5 },
      { id: 3,  subject: 'Science Lab',        location: 'Curepipe',       price: 950,  spaces: 5 },
      { id: 4,  subject: 'History of Mauritius', location: 'Moka',         price: 800,  spaces: 4 },
      { id: 5,  subject: 'Coding (Beginner)',  location: 'Ebène (Online)', price: 1200, spaces: 6 },
      { id: 6,  subject: 'Art & Craft',        location: 'Quatre Bornes',  price: 700,  spaces: 5 },
      { id: 7,  subject: 'Music – Ravanne',    location: 'Vacoas',         price: 850,  spaces: 3 },
      { id: 8,  subject: 'Sega Dance Basics',  location: 'Flic-en-Flac',   price: 900,  spaces: 5 },
      { id: 9,  subject: 'Robotics Club',      location: 'Grand Baie',     price: 1500, spaces: 5 },
      { id: 10, subject: 'PE & Fitness',       location: 'Beau-Bassin',    price: 600,  spaces: 5 }
    ],
    cart: [],
    order: { name: '', phone: '' },
    orderMessage: ''
  },
  computed: {
    cartCount() { return this.cart.length; },
    sortedLessons() {
      const base = this.lessons;
      const key = this.sortKey;
      const dir = this.sortDir;
      return base.slice().sort((a, b) => {
        let va = a[key], vb = b[key];
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    },
    validName() { return /^[A-Za-z ]+$/.test(this.order.name); },
    validPhone(){
      // Accepts: 8 digits, or +230 8 digits, with optional space/dash after code
      return /^(?:\+?230[\s-]?)?\d{8}$/.test(this.order.phone);
    },
  },
  methods: {
    currency(n){
  try{
    return new Intl.NumberFormat('en-MU', {
      style:'currency', currency:'MUR', currencyDisplay:'narrowSymbol', minimumFractionDigits: 2
    }).format(Number(n));
  }catch(e){
    return 'Rs ' + Number(n).toFixed(2); // fallback
  }
},

    toggleCart() { this.showCart = !this.showCart; },
    toggleNav(){ this.navOpen = !this.navOpen; },
    goLessons(){
    this.showCart = false;
    this.navOpen = false;
    },
    goCart(){
    if(this.cartCount === 0) return; // keep UX consistent with disabled button state
    this.showCart = true;
    this.navOpen = false;
    },

    addToCart(lesson) {
      if (lesson.spaces > 0) {
        this.cart.push(Object.assign({}, lesson));
        lesson.spaces -= 1;
        this.flashToast('Added to cart');
      }
    },
    removeFromCart(idx) {
      const removed = this.cart.splice(idx, 1)[0];
      const original = this.lessons.find(l => (l._id || l.id) === (removed._id || removed.id));
      if (original) original.spaces += 1;
      this.flashToast('Removed from cart');
    },
    async submitOrder() {
      if (!(this.validName && this.validPhone && this.cart.length > 0)) return;
      this.isLoading = true;

      // FRONT-END ONLY for now (replace with POST /orders + PUT /lessons/:id later)
      setTimeout(() => {
        this.orderMessage = `Order submitted for ${this.order.name}.`;
        this.cart = [];
        this.isLoading = false;
        this.flashToast('Order placed');
      }, 500);
    },
    runSearch() {
      if (!this.query) return;
      const q = this.query.toLowerCase();
      this.lessons = this.lessons.filter(l =>
        String(l.subject).toLowerCase().includes(q) ||
        String(l.location).toLowerCase().includes(q) ||
        String(l.price).toLowerCase().includes(q) ||
        String(l.spaces).toLowerCase().includes(q)
      );
    },
    clearSearch() {
      this.query = '';
      window.location.reload(); // simple reset for mock data
    },
    flashToast(msg) {
      this.toast = msg;
      setTimeout(() => { this.toast = ''; }, 1200);
    },
    spaceClass(spaces) {
      if (spaces === 0) return 'spaces-zero';
      if (spaces <= 2) return 'spaces-low';
      return 'spaces-ok';
    }
  }
});
