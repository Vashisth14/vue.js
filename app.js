// Vue 2.7 (Options API) – FRONTEND connected to BACKEND
const API_BASE = "http://localhost:8080";

new Vue({
  el: '#app',
  data: {
    navOpen: false,
    showCart: false,

    // UI state
    sortKey: 'subject',
    sortDir: 'asc',
    query: '',
    qDebounced: '',
    isLoading: false,
    toast: '',
    orderMessage: '',
    theme: 'mauritius',
    
    // server data
    lessons: [],
    total: 0,
    page: 1,
    limit: 9,

    // cart/order
    cart: [],
    order: { name: '', phone: '' },
  },
  
  created(){
    const saved = localStorage.getItem('theme');
    if (saved) this.theme = saved;
    this.applyTheme();
    this.fetchLessons();
  },

  watch:{
    theme(newVal){
    this.applyTheme();
    localStorage.setItem('theme', newVal);
  },
    // live search (debounced 150ms)
    query(val){
      clearTimeout(this._qt);
      this._qt = setTimeout(() => {
        this.qDebounced = val;
        this.page = 1;
        this.fetchLessons();             // <— refetch when user stops typing
      }, 150);
    },
    sortKey(){ this.page = 1; this.fetchLessons(); }, // <— refetch on sort change
    sortDir(){ this.page = 1; this.fetchLessons(); }
  },
  computed:{
    cartCount(){ return this.cart.length; },
    validName(){ return /^[A-Za-z ]+$/.test(this.order.name); },
    validPhone(){ return /^\d{8}$/.test(this.order.phone); }, // 8 digits only
    totalPages(){ return Math.max(1, Math.ceil(this.total/this.limit)); },

    // Fallback: if the backend ever ignores params, we still show correct results
    displayedLessons(){
      const q = (this.qDebounced||'').trim().toLowerCase();
      let list = (this.lessons||[]).slice();

      if (q){
        const n = Number(q);
        const maybeNum = !Number.isNaN(n);
        list = list.filter(l => {
          const subj = (l.subject||'').toLowerCase();
          const loc  = (l.location||'').toLowerCase();
          const price = Number(l.price);
          const spaces = Number(l.spaces);
          return subj.includes(q) || loc.includes(q) ||
                 (maybeNum && (price===n || spaces===n));
        });
      }

      const key = this.sortKey;
      const dir = this.sortDir === 'desc' ? -1 : 1;
      list.sort((a,b)=>{
        let va = a[key], vb = b[key];
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return -1*dir;
        if (va > vb) return  1*dir;
        return 0;
      });

      return list;
    }
  },

  methods:{
    applyTheme(){ document.documentElement.setAttribute('data-theme', this.theme); },

    currency(n){
      try{ return new Intl.NumberFormat('en-MU',{style:'currency',currency:'MUR',currencyDisplay:'narrowSymbol',minimumFractionDigits:2}).format(Number(n)); }
      catch{ return 'Rs ' + Number(n).toFixed(2); }
    },

    toggleNav(){ this.navOpen = !this.navOpen; },
    goLessons(){ this.showCart=false; this.navOpen=false; },
    goCart(){ if(this.cartCount===0) return; this.showCart=true; this.navOpen=false; },

    clearSearch(){ this.query=''; this.fetchLessons(); },

    async fetchLessons(){
      try{
        const qs = new URLSearchParams({
          search: (this.qDebounced||'').trim(),     // <— use debounced value
          sort: this.sortKey,
          dir: this.sortDir,
          page: this.page,
          limit: this.limit
        });
        const r = await fetch(`${API_BASE}/lessons?`+qs.toString());
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();

        // accept both array or paged shape
        if (Array.isArray(data)){
          this.lessons = data;
          this.total   = data.length;
        }else{
          this.lessons = data.items || [];
          this.total   = data.total ?? this.lessons.length;
          this.page    = data.page  ?? this.page;
          this.limit   = data.limit ?? this.limit;
        }
      }catch(err){
        console.error(err);
        this.flashToast('Failed to load lessons');
      }
    },

    nextPage(){ if (this.page < this.totalPages){ this.page++; this.fetchLessons(); } },
    prevPage(){ if (this.page > 1){ this.page--; this.fetchLessons(); } },

    addToCart(lesson){
      if (lesson.spaces <= 0) return;
      this.cart.push({ _id: lesson._id || lesson.id, subject: lesson.subject, location: lesson.location, price: lesson.price });
      this.flashToast('Added to cart');
    },
    removeFromCart(idx){ this.cart.splice(idx,1); this.flashToast('Removed from cart'); },

    async submitOrder(){
      if (!(this.validName && this.validPhone && this.cart.length>0)) return;
      this.isLoading = true;
      try{
        const items = this.cart.map(i => ({ lessonId: i._id, qty: 1 }));
        const r = await fetch(`${API_BASE}/orders`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ name:this.order.name, phone:this.order.phone, items })
        });
        const data = await r.json().catch(()=>({}));
        if(!r.ok) throw new Error(data.error || 'Order failed');

        this.orderMessage = `Order submitted for ${this.order.name}.`;
        this.cart = [];
        await this.fetchLessons();
        this.flashToast('Order placed');
      }catch(e){ alert(e.message||'Order failed'); }
      finally{ this.isLoading=false; }
    },

    flashToast(msg){ this.toast=msg; setTimeout(()=> this.toast='', 1200); },
    spaceClass(spaces){ if(spaces===0) return 'spaces-zero'; if(spaces<=2) return 'spaces-low'; return 'spaces-ok'; }
  }
});
