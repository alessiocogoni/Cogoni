// Iniezione automatica del Banner Cookie GDPR & Modale Preferenze Cookie su tutte le pagine pubbliche
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/admin/')) return;

    const cookieWrapper = document.createElement('div');
    cookieWrapper.setAttribute('x-data', 'cookieBanner()');
    cookieWrapper.innerHTML = `
        <!-- Banner Cookie Fisso in Basso -->
        <div x-show="showBanner" x-transition.opacity
             class="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 pointer-events-none">
            <div class="max-w-6xl mx-auto bg-slate-950/95 backdrop-blur-xl text-white border-2 border-rose-500 rounded-[28px] p-6 sm:p-7 shadow-2xl pointer-events-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center text-2xl shrink-0">
                        🍪
                    </div>
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[10px] font-extrabold uppercase tracking-widest bg-rose-600 text-white px-2.5 py-0.5 rounded-full">Informativa Cookie GDPR</span>
                            <span class="text-xs font-bold text-rose-300">Outlet DAALE — Nike Store</span>
                        </div>
                        <h3 class="text-lg font-black text-white">Questo sito utilizza i Cookie per offrirti la migliore esperienza</h3>
                        <p class="text-xs text-slate-300 leading-relaxed mt-1 max-w-2xl">
                            Utilizziamo cookie tecnici necessari per il funzionamento del carrello e dell'account, e previo tuo consenso cookie analitici e di marketing per offerte personalizzate Nike. Puoi accettare tutti i cookie, usare solo i necessari o personalizzare le tue scelte.
                        </p>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0">
                    <button type="button" @click="openSettings = true" class="btn-glass !py-3 !px-5 !text-xs">
                        <i class="fa-solid fa-sliders text-rose-400"></i> Personalizza
                    </button>
                    <button type="button" @click="acceptNecessaryOnly()" class="btn-glass !py-3 !px-5 !text-xs">
                        Solo Necessari
                    </button>
                    <button type="button" @click="acceptAll()" class="btn-accent !py-3 !px-6 !text-xs">
                        <i class="fa-solid fa-check-double"></i> Accetta Tutti i Cookie
                    </button>
                </div>
            </div>
        </div>

        <!-- Modale Personalizzazione Cookie -->
        <div x-show="openSettings" x-transition.opacity
             class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div @click.outside="openSettings = false" class="bg-white text-slate-900 rounded-[32px] border-2 border-slate-200 max-w-lg w-full p-7 shadow-2xl">
                <div class="flex items-center justify-between pb-4 border-b-2 border-slate-100 mb-5">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">🍪</span>
                        <div>
                            <span class="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 block">Centro Privacy GDPR</span>
                            <h3 class="text-xl font-black text-slate-900">Preferenze Cookie</h3>
                        </div>
                    </div>
                    <button type="button" @click="openSettings = false" class="icon-btn w-9 h-9">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="space-y-4 mb-6">
                    <div class="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-4">
                        <div>
                            <h4 class="font-extrabold text-sm text-slate-900">Cookie Tecnici & Carrello (Obbligatori)</h4>
                            <p class="text-xs text-slate-500 mt-0.5">Indispensabili per salvare gli articoli nel carrello, gestire il login e completare gli ordini.</p>
                        </div>
                        <span class="text-[11px] font-extrabold uppercase bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full border border-emerald-300 shrink-0">Sempre Attivi</span>
                    </div>

                    <label class="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-4 cursor-pointer">
                        <div>
                            <h4 class="font-extrabold text-sm text-slate-900">Cookie Analitici & Statistiche</h4>
                            <p class="text-xs text-slate-500 mt-0.5">Ci aiutano a capire quali modelli Nike sono più visitati per migliorare il catalogo.</p>
                        </div>
                        <input type="checkbox" x-model="prefs.analytics" class="w-5 h-5 accent-rose-600 rounded cursor-pointer">
                    </label>

                    <label class="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-4 cursor-pointer">
                        <div>
                            <h4 class="font-extrabold text-sm text-slate-900">Cookie Marketing & Sconti Esclusivi</h4>
                            <p class="text-xs text-slate-500 mt-0.5">Permettono di mostrarti promozioni dedicate e codici sconto personalizzati.</p>
                        </div>
                        <input type="checkbox" x-model="prefs.marketing" class="w-5 h-5 accent-rose-600 rounded cursor-pointer">
                    </label>
                </div>

                <div class="flex flex-wrap gap-3">
                    <button type="button" @click="saveCustom()" class="btn-primary flex-1 !py-3.5 !text-xs">
                        Salva Scelte Selezionate
                    </button>
                    <button type="button" @click="acceptAll()" class="btn-accent flex-1 !py-3.5 !text-xs">
                        Accetta Tutti
                    </button>
                </div>
            </div>
        </div>

        <!-- Pulsantino flottante in basso a sinistra per riaprire i Cookie in qualsiasi momento -->
        <button type="button" x-show="!showBanner" @click="showBanner = true"
                title="Gestisci consenso Cookie"
                class="fixed bottom-4 left-4 z-40 bg-white/95 hover:bg-slate-900 text-slate-800 hover:text-white border-2 border-slate-300 px-3.5 py-2 rounded-full text-xs font-extrabold shadow-lg flex items-center gap-2 transition">
            <span>🍪</span>
            <span class="hidden sm:inline">Cookie</span>
        </button>
    `;
    document.body.appendChild(cookieWrapper);
});

document.addEventListener('alpine:init', () => {
    const CART_KEY = 'outlet_daale_nike_cart_v5';
    const WISHLIST_KEY = 'outlet_daale_nike_wishlist_v4';

    // 0. Controller Banner Cookie GDPR
    Alpine.data('cookieBanner', () => ({
        showBanner: false,
        openSettings: false,
        prefs: {
            analytics: true,
            marketing: true
        },

        init() {
            const saved = DaAleAPI.getCookieConsent();
            if (!saved) {
                this.showBanner = true;
            } else {
                this.prefs.analytics = Boolean(saved.analytics);
                this.prefs.marketing = Boolean(saved.marketing);
            }
        },

        acceptAll() {
            this.prefs.analytics = true;
            this.prefs.marketing = true;
            DaAleAPI.saveCookieConsent({ analytics: true, marketing: true });
            this.showBanner = false;
            this.openSettings = false;
        },

        acceptNecessaryOnly() {
            this.prefs.analytics = false;
            this.prefs.marketing = false;
            DaAleAPI.saveCookieConsent({ analytics: false, marketing: false });
            this.showBanner = false;
            this.openSettings = false;
        },

        saveCustom() {
            DaAleAPI.saveCookieConsent(this.prefs);
            this.showBanner = false;
            this.openSettings = false;
        }
    }));

    // 1. Controller Homepage Catalogo Nike (Immagini Base64 istantanee)
    Alpine.data('ecommerce', () => ({
        searchQuery: '',
        selectedCategory: 'all',
        sortBy: 'featured',
        toastMessage: '',
        apiSourceLabel: 'Catalogo Nike Attivo',
        heroImage: window.HERO_IMAGE_DATA_URI || 'images/hero-nike.png',
        isLoading: false,
        currentUser: DaAleAPI.getCurrentUser(),

        products: window.FALLBACK_PRODUCTS || [],
        cart: JSON.parse(localStorage.getItem(CART_KEY)) || [],
        wishlist: JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [],

        async init() {
            this.currentUser = DaAleAPI.getCurrentUser();
            if (window.HERO_IMAGE_DATA_URI) {
                this.heroImage = window.HERO_IMAGE_DATA_URI;
            }
            const res = await DaAleAPI.getProducts();
            if (res && Array.isArray(res.data) && res.data.length > 0) {
                this.products = res.data;
                this.apiSourceLabel = res.source;
            }
        },

        get filteredProducts() {
            let result = [...this.products];
            if (this.selectedCategory !== 'all') {
                result = result.filter(p => p.category === this.selectedCategory);
            }
            if (this.searchQuery.trim() !== '') {
                const q = this.searchQuery.toLowerCase();
                result = result.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
            }
            if (this.sortBy === 'price-asc') {
                result.sort((a, b) => a.price - b.price);
            } else if (this.sortBy === 'price-desc') {
                result.sort((a, b) => b.price - a.price);
            } else if (this.sortBy === 'rating') {
                result.sort((a, b) => b.rating - a.rating);
            }
            return result;
        },

        get totalCartItems() {
            return this.cart.reduce((sum, item) => sum + Number(item.quantity), 0);
        },

        goToProduct(productId) {
            window.location.href = `product.html?id=${productId}`;
        },

        goToCart() {
            window.location.href = 'cart.html';
        },

        addToCart(product, size = null) {
            const defaultSize = size || (product.category === 'Scarpe' ? '42' : 'M');
            const cartId = `${product.id}-${defaultSize}`;
            const existing = this.cart.find(item => item.cartId === cartId);
            if (existing) {
                existing.quantity = Number(existing.quantity) + 1;
            } else {
                this.cart.push({
                    id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    image: product.image,
                    fallbackImage: product.fallbackImage || product.image,
                    category: product.category,
                    cartId: cartId,
                    size: defaultSize,
                    quantity: 1
                });
            }
            this.saveCart();
            this.showToast(`Aggiunto al carrello: ${product.name} (Taglia ${defaultSize})`);
        },

        saveCart() {
            localStorage.setItem(CART_KEY, JSON.stringify(this.cart));
        },

        toggleWishlist(product) {
            const index = this.wishlist.findIndex(item => item.id === product.id);
            if (index > -1) {
                this.wishlist.splice(index, 1);
                this.showToast('Rimosso dai preferiti');
            } else {
                this.wishlist.push(product);
                this.showToast('Aggiunto ai preferiti');
            }
            localStorage.setItem(WISHLIST_KEY, JSON.stringify(this.wishlist));
        },

        isInWishlist(id) {
            return this.wishlist.some(item => item.id === id);
        },

        showToast(msg) {
            this.toastMessage = msg;
            setTimeout(() => {
                if (this.toastMessage === msg) this.toastMessage = '';
            }, 3000);
        }
    }));

    // 2. Controller Pagina Dettaglio Prodotto Nike
    Alpine.data('productPage', () => ({
        product: (window.FALLBACK_PRODUCTS && window.FALLBACK_PRODUCTS[0]) || null,
        selectedSize: '42',
        quantity: 1,
        currentUser: DaAleAPI.getCurrentUser(),
        cart: JSON.parse(localStorage.getItem(CART_KEY)) || [],

        async init() {
            const urlParams = new URLSearchParams(window.location.search);
            const productId = parseInt(urlParams.get('id')) || 1;
            this.product = await DaAleAPI.getProductById(productId);
            if (this.product) {
                this.selectedSize = this.product.category === 'Scarpe' ? '42' : 'M';
            }
        },

        get availableSizes() {
            if (!this.product) return ['S', 'M', 'L', 'XL'];
            return this.product.category === 'Scarpe'
                ? ['40', '41', '42', '43', '44', '45']
                : ['S', 'M', 'L', 'XL'];
        },

        get totalCartItems() {
            return this.cart.reduce((sum, item) => sum + Number(item.quantity), 0);
        },

        addToCart() {
            if (!this.product) return;
            const cartId = `${this.product.id}-${this.selectedSize}`;
            let cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
            const existing = cart.find(item => item.cartId === cartId);
            
            if (existing) {
                existing.quantity = Number(existing.quantity) + Number(this.quantity);
            } else {
                cart.push({
                    id: this.product.id,
                    name: this.product.name,
                    price: Number(this.product.price),
                    image: this.product.image,
                    fallbackImage: this.product.fallbackImage || this.product.image,
                    category: this.product.category,
                    cartId: cartId,
                    size: this.selectedSize,
                    quantity: Number(this.quantity)
                });
            }
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
            window.location.href = 'cart.html';
        }
    }));

    // 3. Controller Pagina Carrello & Invio Email Conferma Ordine al Cliente
    Alpine.data('cartPage', () => ({
        cart: JSON.parse(localStorage.getItem(CART_KEY)) || [],
        currentUser: DaAleAPI.getCurrentUser(),
        promoInput: '',
        promoMessage: '',
        discount: 0,
        isCheckoutOpen: false,
        isOrderSuccessOpen: false,
        orderError: '',
        isSubmitting: false,
        lastSavedOrder: null,
        ownerEmail: '',
        toastMessage: '',

        checkoutForm: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            zip: '',
            paymentMethod: 'Carta di Credito'
        },

        async init() {
            if (this.currentUser) {
                this.checkoutForm.firstName = this.currentUser.firstName || '';
                this.checkoutForm.lastName = this.currentUser.lastName || '';
                this.checkoutForm.email = this.currentUser.email || '';
                this.checkoutForm.phone = this.currentUser.phone || '';
                this.checkoutForm.address = this.currentUser.address || '';
                this.checkoutForm.city = this.currentUser.city || '';
                this.checkoutForm.zip = this.currentUser.zip || '';
            }
            const cfg = await DaAleAPI.getConfig();
            if (cfg && cfg.notification_email && !cfg.notification_email.includes('inserisci-qui')) {
                this.ownerEmail = cfg.notification_email;
            }
        },

        get totalCartItems() {
            return this.cart.reduce((sum, item) => sum + Number(item.quantity), 0);
        },

        get cartSubtotal() {
            return this.cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
        },

        get discountAmount() {
            return this.cartSubtotal * this.discount;
        },

        get shippingCost() {
            let sub = this.cartSubtotal - this.discountAmount;
            return (sub >= 50 || sub === 0) ? 0 : 4.99;
        },

        get cartTotal() {
            return Math.max(0, this.cartSubtotal - this.discountAmount + this.shippingCost);
        },

        get previewOrderName() {
            return DaAleAPI.buildOrderName(this.cart);
        },

        updateQuantity(cartId, amount) {
            const item = this.cart.find(i => i.cartId === cartId);
            if (item) {
                item.quantity = Number(item.quantity) + amount;
                if (item.quantity <= 0) {
                    this.cart = this.cart.filter(i => i.cartId !== cartId);
                }
                this.saveCart();
            }
        },

        removeFromCart(cartId) {
            this.cart = this.cart.filter(i => i.cartId !== cartId);
            this.saveCart();
            this.showToast('Articolo rimosso dal carrello');
        },

        saveCart() {
            localStorage.setItem(CART_KEY, JSON.stringify(this.cart));
        },

        applyPromo() {
            if (this.promoInput.trim().toUpperCase() === 'ALE20') {
                this.discount = 0.20;
                this.promoMessage = 'Codice ALE20 applicato (-20%)!';
                this.showToast('Sconto del 20% applicato!');
            } else {
                this.discount = 0;
                this.promoMessage = 'Codice non valido o scaduto';
            }
        },

        async completeOrder() {
            if (this.cart.length === 0 || this.isSubmitting) return;
            this.isSubmitting = true;

            const orderName = DaAleAPI.buildOrderName(this.cart);
            // Non salviamo le pesanti stringhe base64 dentro orders.json così l'invio email e il DB sono leggerissimi
            const lightItems = this.cart.map(i => ({
                id: i.id,
                name: i.name,
                price: i.price,
                size: i.size,
                quantity: i.quantity,
                category: i.category
            }));

            const payload = {
                orderName: orderName,
                userId: this.currentUser ? this.currentUser.id : null,
                authProvider: this.currentUser ? this.currentUser.provider : 'Ospite',
                customer: { ...this.checkoutForm },
                items: lightItems,
                subtotal: Number(this.cartSubtotal.toFixed(2)),
                discount: Number(this.discountAmount.toFixed(2)),
                shipping: Number(this.shippingCost.toFixed(2)),
                total: Number(this.cartTotal.toFixed(2))
            };

            this.orderError = '';
            try {
                const res = await DaAleAPI.createOrder(payload);
                if (!res.success) {
                    this.orderError = res.error || 'Ordine non confermato. Riprova più tardi.';
                    return;
                }
                this.lastSavedOrder = res.order;
                if (!res.order.demo) {
                    this.cart = [];
                    this.saveCart();
                }
                this.isCheckoutOpen = false;
                this.isOrderSuccessOpen = true;
            } catch (e) {
                this.orderError = 'Impossibile verificare la conferma. Contatta il negozio prima di ripetere l’ordine.';
            } finally {
                this.isSubmitting = false;
            }
        },

        getMailtoUrl() {
            if (!this.lastSavedOrder) return '#';
            const dest = this.lastSavedOrder.customer.email || this.ownerEmail;
            return DaAleAPI.buildMailtoLink(this.lastSavedOrder, dest);
        },

        showToast(msg) {
            this.toastMessage = msg;
            setTimeout(() => { if (this.toastMessage === msg) this.toastMessage = ''; }, 3000);
        }
    }));

    // 4. Controller Pagina Registrazione & Login (Google, Facebook, Apple + Modulo Email)
    Alpine.data('authPage', () => ({
        mode: 'register',
        currentUser: DaAleAPI.getCurrentUser(),
        errorMessage: '',
        successMessage: '',
        isSocialModalOpen: false,
        activeProvider: 'Google',

        regForm: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            zip: '',
            password: ''
        },

        loginForm: {
            email: '',
            password: ''
        },

        socialForm: {
            firstName: '',
            lastName: '',
            email: '',
            address: '',
            city: '',
            zip: ''
        },

        openSocialPopup(provider) {
            this.errorMessage = '';
            this.activeProvider = provider;
            this.socialForm.firstName = '';
            this.socialForm.lastName = '';
            this.socialForm.email = '';
            this.isSocialModalOpen = true;
        },

        async confirmSocialLogin() {
            if (!this.socialForm.email || !this.socialForm.firstName) return;
            const res = await DaAleAPI.socialAuth({
                provider: this.activeProvider,
                firstName: this.socialForm.firstName,
                lastName: this.socialForm.lastName,
                email: this.socialForm.email,
                address: this.socialForm.address,
                city: this.socialForm.city,
                zip: this.socialForm.zip
            });
            if (res.success) {
                this.currentUser = res.user;
                this.isSocialModalOpen = false;
                this.successMessage = `Accesso effettuato con successo tramite ${this.activeProvider}!`;
            } else {
                this.errorMessage = res.error || 'Errore durante l\'accesso social.';
            }
        },

        async submitRegister() {
            this.errorMessage = '';
            const res = await DaAleAPI.registerUser(this.regForm);
            if (res.success) {
                this.currentUser = res.user;
                this.successMessage = 'Registrazione completata con successo! Benvenuto in Outlet DAALE.';
            } else {
                this.errorMessage = res.error || 'Errore durante la registrazione.';
            }
        },

        async submitLogin() {
            this.errorMessage = '';
            const res = await DaAleAPI.loginUser(this.loginForm.email, this.loginForm.password);
            if (res.success) {
                this.currentUser = res.user;
                this.successMessage = 'Bentornato su Outlet DAALE!';
            } else {
                this.errorMessage = res.error || 'Credenziali non valide.';
            }
        },

        logout() {
            DaAleAPI.logoutUser();
            this.currentUser = null;
            this.successMessage = '';
        }
    }));
});
