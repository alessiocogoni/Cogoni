/**
 * OUTLET DAALE - CLIENT REST API, IMMAGINI NIKE INCORPORATE, COOKIE & EMAIL "ORDINE CONFERMATO"
 */

(function purgeLegacyCache() {
    const legacyKeys = [
        'da_ale_json_products_mirror',
        'da_ale_custom_json_products',
        'outlet_daale_products_v3',
        'outlet_daale_nike_cart_v4',
        'da_ale_elite_cart',
        'da_ale_pro_cart',
        'da_ale_cart',
        'modavibe_cart'
    ];
    if (localStorage.getItem('outlet_daale_nike_version') !== 'v5_real_nike_photos') {
        legacyKeys.forEach(k => localStorage.removeItem(k));
        localStorage.setItem('outlet_daale_nike_version', 'v5_real_nike_photos');
    }
})();

const DaAleAPI = {
    adminTokenKey: 'da_ale_admin_api_token',
    currentUserKey: 'outlet_daale_logged_user_v3',
    localUsersSyncKey: 'outlet_daale_users_mirror_v3',
    localOrdersSyncKey: 'outlet_daale_orders_v4',
    cookieConsentKey: 'outlet_daale_cookie_consent_v1',

    getCookieConsent() {
        try {
            return JSON.parse(localStorage.getItem(this.cookieConsentKey) || 'null');
        } catch (e) {
            return null;
        }
    },

    saveCookieConsent(prefs) {
        const data = {
            necessary: true,
            analytics: Boolean(prefs.analytics),
            marketing: Boolean(prefs.marketing),
            updatedAt: new Date().toLocaleString('it-IT')
        };
        localStorage.setItem(this.cookieConsentKey, JSON.stringify(data));
        return data;
    },

    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem(this.currentUserKey) || 'null');
        } catch (e) {
            return null;
        }
    },

    setCurrentUser(user) {
        if (user) {
            localStorage.setItem(this.currentUserKey, JSON.stringify(user));
        } else {
            localStorage.removeItem(this.currentUserKey);
        }
    },

    logoutUser() {
        localStorage.removeItem(this.currentUserKey);
    },

    _mirrorUserLocally(user) {
        const list = JSON.parse(localStorage.getItem(this.localUsersSyncKey) || '[]');
        const idx = list.findIndex(u => String(u.email).toLowerCase() === String(user.email).toLowerCase());
        if (idx !== -1) {
            list[idx] = { ...list[idx], ...user };
        } else {
            list.unshift(user);
        }
        localStorage.setItem(this.localUsersSyncKey, JSON.stringify(list));
    },

    async registerUser(payload) {
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (res.ok && json.success) {
                this._mirrorUserLocally(json.user);
                this.setCurrentUser(json.user);
                return { success: true, user: json.user };
            }
            if (!res.ok && json.error) return { success: false, error: json.error };
        } catch (e) {}

        try {
            const res = await fetch('api.php?endpoint=auth&action=register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (res.ok && json.success) {
                this._mirrorUserLocally(json.user);
                this.setCurrentUser(json.user);
                return { success: true, user: json.user };
            }
            if (!res.ok && json.error) return { success: false, error: json.error };
        } catch (e) {}

        const list = JSON.parse(localStorage.getItem(this.localUsersSyncKey) || '[]');
        const cleanEmail = String(payload.email || '').trim().toLowerCase();
        if (list.find(u => String(u.email).toLowerCase() === cleanEmail)) {
            return { success: false, error: 'Questa email è già registrata. Effettua il login!' };
        }
        const newUser = {
            id: 'USR-' + Math.floor(1000 + Math.random() * 9000),
            firstName: (payload.firstName || '').trim(),
            lastName: (payload.lastName || '').trim(),
            email: cleanEmail,
            phone: (payload.phone || '').trim(),
            address: (payload.address || '').trim(),
            city: (payload.city || '').trim(),
            zip: (payload.zip || '').trim(),
            provider: 'Email',
            password: payload.password,
            createdAt: new Date().toLocaleString('it-IT')
        };
        this._mirrorUserLocally(newUser);
        const { password, ...safeUser } = newUser;
        this.setCurrentUser(safeUser);
        return { success: true, user: safeUser };
    },

    async loginUser(email, password) {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const json = await res.json();
            if (res.ok && json.success) {
                this.setCurrentUser(json.user);
                return { success: true, user: json.user };
            }
            if (!res.ok && json.error) return { success: false, error: json.error };
        } catch (e) {}

        try {
            const res = await fetch('api.php?endpoint=auth&action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const json = await res.json();
            if (res.ok && json.success) {
                this.setCurrentUser(json.user);
                return { success: true, user: json.user };
            }
            if (!res.ok && json.error) return { success: false, error: json.error };
        } catch (e) {}

        const list = JSON.parse(localStorage.getItem(this.localUsersSyncKey) || '[]');
        const cleanEmail = String(email || '').trim().toLowerCase();
        const found = list.find(u => String(u.email).toLowerCase() === cleanEmail);
        if (!found) return { success: false, error: 'Nessun account trovato con questa email. Registrati prima!' };
        if (found.password && found.password !== password) {
            return { success: false, error: 'Password non corretta.' };
        }
        const { password: pw, ...safeUser } = found;
        this.setCurrentUser(safeUser);
        return { success: true, user: safeUser };
    },

    async socialAuth(socialPayload) {
        try {
            const res = await fetch('/api/auth/social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(socialPayload)
            });
            const json = await res.json();
            if (res.ok && json.success) {
                this._mirrorUserLocally(json.user);
                this.setCurrentUser(json.user);
                return { success: true, user: json.user };
            }
        } catch (e) {}

        try {
            const res = await fetch('api.php?endpoint=auth&action=social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(socialPayload)
            });
            const json = await res.json();
            if (res.ok && json.success) {
                this._mirrorUserLocally(json.user);
                this.setCurrentUser(json.user);
                return { success: true, user: json.user };
            }
        } catch (e) {}

        const newUser = {
            id: 'USR-' + Math.floor(1000 + Math.random() * 9000),
            firstName: (socialPayload.firstName || 'Cliente').trim(),
            lastName: (socialPayload.lastName || '').trim(),
            email: String(socialPayload.email || '').trim().toLowerCase(),
            phone: (socialPayload.phone || '').trim(),
            address: (socialPayload.address || '').trim(),
            city: (socialPayload.city || '').trim(),
            zip: (socialPayload.zip || '').trim(),
            provider: socialPayload.provider || 'Google',
            createdAt: new Date().toLocaleString('it-IT')
        };
        this._mirrorUserLocally(newUser);
        this.setCurrentUser(newUser);
        return { success: true, user: newUser };
    },

    async getUsers() {
        const token = localStorage.getItem(this.adminTokenKey);
        if (!token) return { source: 'Accesso riservato', data: [] };
        for (const url of ['/api/users', '../api.php?endpoint=users']) {
            try {
                const res = await fetch(url, { headers: { 'X-Admin-Token': token } });
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem(this.adminTokenKey);
                    window.location.href = 'login.html';
                    return { source: 'Accesso negato', data: [] };
                }
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) return { source: 'Area riservata', data: json.data };
                }
            } catch (e) {}
        }
        return { source: 'Server non disponibile', data: [] };
    },

    async deleteUser(userId) {
        const token = localStorage.getItem(this.adminTokenKey) || '';
        try {
            await fetch(`/api/users/${userId}`, { method: 'DELETE', headers: { 'X-Admin-Token': token } });
        } catch (e) {}
        try {
            await fetch(`../api.php?endpoint=users&id=${userId}`, { method: 'DELETE', headers: { 'X-Admin-Token': token } });
        } catch (e) {}
        let localMirror = JSON.parse(localStorage.getItem(this.localUsersSyncKey) || '[]');
        localMirror = localMirror.filter(u => u.id !== userId);
        localStorage.setItem(this.localUsersSyncKey, JSON.stringify(localMirror));
        return true;
    },

    buildOrderName(items) {
        if (!Array.isArray(items) || items.length === 0) return 'Articoli Nike Outlet DAALE';
        const first = items[0].name || 'Articolo Nike';
        if (items.length === 1) {
            return `${first} (x${items[0].quantity || 1})`;
        }
        const extraCount = items.slice(1).reduce((s, i) => s + Number(i.quantity || 1), 0);
        return `${first} + altri ${extraCount} articol${extraCount === 1 ? 'o' : 'i'}`;
    },

    buildMailtoLink(order, recipientEmail) {
        const to = recipientEmail || (order.customer && order.customer.email) || '';
        const subject = `Ordine Confermato - ${order.orderName} (#${order.id})`;
        const itemsLines = (order.items || [])
            .map(i => `- ${i.name} (Taglia: ${i.size}) x${i.quantity} -> € ${(Number(i.price) * Number(i.quantity)).toFixed(2)}`)
            .join('\n');
        const body = `ORDINE CONFERMATO - ${order.orderName}\n`
            + `Negozio: Outlet DAALE (Nike Official Outlet)\n`
            + `Numero Ordine: #${order.id}\n`
            + `Data: ${order.createdAt}\n\n`
            + `DATI CLIENTE & SPEDIZIONE:\n`
            + `Cliente: ${order.customer.firstName} ${order.customer.lastName}\n`
            + `Email: ${order.customer.email}\n`
            + `Indirizzo: ${order.customer.address}, ${order.customer.city} (${order.customer.zip})\n`
            + `Pagamento: ${order.customer.paymentMethod}\n\n`
            + `ARTICOLI ORDINATI:\n${itemsLines}\n\n`
            + `TOTALE ORDINE CONFERMATO: € ${Number(order.total).toFixed(2)}\n\n`
            + `Grazie per aver acquistato da Outlet DAALE!`;
        return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    },

    // Invio diretto dell'email "Ordine Confermato - [Nome Ordine]" SIA all'email del cliente (order.customer.email) SIA al gestore
    async dispatchConfirmationEmails(order) {
        const cfg = await this.getConfig();
        const ownerEmail = (cfg.notification_email || localStorage.getItem('da_ale_notification_email') || '').trim();
        const customerEmail = (order.customer && order.customer.email ? order.customer.email : '').trim();

        const recipients = [];
        if (customerEmail && customerEmail.includes('@')) {
            recipients.push(customerEmail);
        }
        if (ownerEmail && ownerEmail.includes('@') && !ownerEmail.includes('inserisci-qui') && ownerEmail.toLowerCase() !== customerEmail.toLowerCase()) {
            recipients.push(ownerEmail);
        }

        const subjectLine = `Ordine Confermato - ${order.orderName} (#${order.id})`;
        const itemsSummary = (order.items || [])
            .map(i => `${i.name} [Taglia: ${i.size}] x${i.quantity} (€ ${(Number(i.price) * Number(i.quantity)).toFixed(2)})`)
            .join(' | ');

        let anySent = false;
        for (const emailAddr of recipients) {
            try {
                const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(emailAddr)}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        _subject: subjectLine,
                        _template: 'box',
                        _captcha: 'false',
                        Ordine_Confermato: `${order.orderName} (#${order.id})`,
                        Negozio: 'Outlet DAALE — Nike Official Store',
                        Data_e_Ora: order.createdAt || new Date().toLocaleString('it-IT'),
                        Cliente: `${order.customer.firstName} ${order.customer.lastName}`,
                        Email_Cliente: order.customer.email,
                        Indirizzo_Spedizione: `${order.customer.address}, ${order.customer.city} (${order.customer.zip})`,
                        Metodo_Pagamento: order.customer.paymentMethod,
                        Articoli_Ordinati: itemsSummary,
                        Totale_Pagato: `€ ${Number(order.total).toFixed(2)}`
                    })
                });
                if (res.ok) anySent = true;
            } catch (e) {
                console.warn('Info dispatch email:', e);
            }
        }
        return { sent: anySent, recipients };
    },

    getConfig() {
        // Condivide solo le richieste in corso; la chiamata successiva rilegge dati aggiornati.
        if (!this._getConfigPending) {
            this._getConfigPending = this._loadConfig().finally(() => { this._getConfigPending = null; });
        }
        return this._getConfigPending;
    },

    async _loadConfig() {
        const prefix = window.location.pathname.includes('/admin/') ? '../' : '';
        try {
            const res = await fetch('/api/config', { headers: { 'Accept': 'application/json' } });
            if (res.ok) {
                const cfg = await res.json();
                const savedEmail = localStorage.getItem('da_ale_notification_email');
                if (savedEmail && (!cfg.notification_email || cfg.notification_email.includes('inserisci-qui'))) {
                    cfg.notification_email = savedEmail;
                }
                return cfg;
            }
        } catch (e) {}

        try {
            const res = await fetch(prefix + 'api.php?endpoint=config', { headers: { 'Accept': 'application/json' } });
            if (res.ok) {
                const cfg = await res.json();
                const savedEmail = localStorage.getItem('da_ale_notification_email');
                if (savedEmail && (!cfg.notification_email || cfg.notification_email.includes('inserisci-qui'))) {
                    cfg.notification_email = savedEmail;
                }
                return cfg;
            }
        } catch (e) {}

        return {
            store_name: 'Outlet DAALE',
            sender_name: 'Outlet DAALE',
            notification_email: localStorage.getItem('da_ale_notification_email') || '',
            hero_image: window.HERO_IMAGE_DATA_URI
        };
    },

    async saveEmailAndSmtpConfig(payload) {
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Token': localStorage.getItem(this.adminTokenKey) || '' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            return { success: res.ok && json.success === true, mode: json.error || (res.ok ? 'Configurazione salvata' : 'Salvataggio fallito') };
        } catch (e) {
            return { success: false, mode: 'Salvataggio non disponibile. Avvia il server Node.js.' };
        }
    },

    // Assicura che ogni prodotto abbia SEMPRE l'immagine Base64 funzionante al 100%
    _ensureProductImages(list) {
        const fallbackMap = new Map((window.FALLBACK_PRODUCTS || []).map(p => [Number(p.id), p]));
        return (list || []).map(p => {
            const ref = fallbackMap.get(Number(p.id));
            let img = p.image;
            if (!img || img.startsWith('data:image') || img.startsWith('images/')) {
                img = ref ? ref.image : img;
            }
            const fb = p.fallbackImage || (ref ? ref.fallbackImage : img);
            return { ...p, image: img, fallbackImage: fb };
        });
    },

    getProducts() {
        // Condivide solo le richieste in corso; la chiamata successiva rilegge dati aggiornati.
        if (!this._getProductsPending) {
            this._getProductsPending = this._loadProducts().finally(() => { this._getProductsPending = null; });
        }
        return this._getProductsPending;
    },

    async _loadProducts() {
        const prefix = window.location.pathname.includes('/admin/') ? '../' : '';

        try {
            const res = await fetch('/api/products', { headers: { 'Accept': 'application/json' } });
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    return { source: 'API Server (data/products.json)', data: this._ensureProductImages(json.data) };
                }
            }
        } catch (e) {}

        try {
            const res = await fetch(prefix + 'api.php?endpoint=products', { headers: { 'Accept': 'application/json' } });
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    return { source: 'PHP API (data/products.json)', data: this._ensureProductImages(json.data) };
                }
            }
        } catch (e) {}

        const customAdded = JSON.parse(localStorage.getItem('outlet_daale_custom_products_v5') || '[]');
        return {
            source: 'Catalogo Nike HD (products.json)',
            data: this._ensureProductImages([...customAdded, ...(window.FALLBACK_PRODUCTS || [])])
        };
    },

    async getProductById(id) {
        const res = await this.getProducts();
        return res.data.find(p => Number(p.id) === Number(id)) || res.data[0];
    },

    async createOrder(orderPayload) {
        const payload = { ...orderPayload, orderName: this.buildOrderName(orderPayload.items) };
        if (window.location.protocol === 'file:' || window.DAALE_DEMO === true) {
            const order = {
                ...payload,
                id: 'DEMO-' + Date.now(),
                createdAt: new Date().toLocaleString('it-IT'),
                status: 'Simulazione locale',
                demo: true,
                emailSent: false,
                emailSubject: 'Anteprima conferma - ' + payload.orderName
            };
            return { success: true, order };
        }
        for (const url of ['/api/orders', 'api.php?endpoint=orders']) {
            try {
                const res = await fetch(url, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.status === 404 || res.status === 405) continue;
                const json = await res.json();
                if (res.ok && json.success && json.order) {
                    return { success: true, order: json.order };
                }
                return { success: false, error: json.error || 'Ordine non confermato. Contatta il negozio.' };
            } catch (e) {
                return { success: false, error: 'Impossibile verificare la conferma. Contatta il negozio prima di ripetere l’ordine.' };
            }
        }
        return { success: false, error: 'Servizio ordini non disponibile. Contatta il negozio.' };
    },

    async adminLogin(password) {
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    localStorage.setItem(this.adminTokenKey, json.token);
                    return { success: true };
                }
            }
        } catch (e) {}

        try {
            const res = await fetch('../api.php?endpoint=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    localStorage.setItem(this.adminTokenKey, json.token);
                    return { success: true };
                }
            }
        } catch (e) {}

        return { success: false, error: 'Accesso negato o server non disponibile' };
    },

    async getOrders() {
        const token = localStorage.getItem(this.adminTokenKey);
        if (!token) return { source: 'Accesso riservato', data: [] };
        for (const url of ['/api/orders', '../api.php?endpoint=orders']) {
            try {
                const res = await fetch(url, { headers: { 'X-Admin-Token': token } });
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem(this.adminTokenKey);
                    window.location.href = 'login.html';
                    return { source: 'Accesso negato', data: [] };
                }
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) return { source: 'Area riservata', data: json.data };
                }
            } catch (e) {}
        }
        return { source: 'Server non disponibile', data: [] };
    },

    async updateOrderStatus(orderId, newStatus) {
        const token = localStorage.getItem(this.adminTokenKey) || '';
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) return true;
        } catch (e) {}

        try {
            const res = await fetch(`../api.php?endpoint=orders&id=${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) return true;
        } catch (e) {}

        return false;
    },

    async deleteOrder(orderId) {
        const token = localStorage.getItem(this.adminTokenKey) || '';
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'DELETE',
                headers: { 'X-Admin-Token': token }
            });
            if (res.ok) return true;
        } catch (e) {}

        try {
            const res = await fetch(`../api.php?endpoint=orders&id=${orderId}`, {
                method: 'DELETE',
                headers: { 'X-Admin-Token': token }
            });
            if (res.ok) return true;
        } catch (e) {}

        return false;
    },

    async createProduct(productPayload) {
        const token = localStorage.getItem(this.adminTokenKey) || '';
        const defaultImg = window.FALLBACK_PRODUCTS && window.FALLBACK_PRODUCTS[0] ? window.FALLBACK_PRODUCTS[0].image : '';
        const payloadWithImg = {
            ...productPayload,
            image: (!productPayload.image || productPayload.image === 'images/nike-1.png') ? defaultImg : productPayload.image
        };

        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
                body: JSON.stringify(payloadWithImg)
            });
            if (res.ok) return await res.json();
        } catch (e) {}

        try {
            const res = await fetch('../api.php?endpoint=products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
                body: JSON.stringify(payloadWithImg)
            });
            if (res.ok) return await res.json();
        } catch (e) {}

        const customAdded = JSON.parse(localStorage.getItem('outlet_daale_custom_products_v5') || '[]');
        const newProd = {
            id: Date.now(),
            name: payloadWithImg.name,
            category: payloadWithImg.category || 'Scarpe',
            price: parseFloat(payloadWithImg.price),
            oldPrice: parseFloat(payloadWithImg.oldPrice || payloadWithImg.price * 1.8),
            rating: 5.0,
            reviews: 1,
            badge: payloadWithImg.badge || 'NUOVO',
            stock: parseInt(payloadWithImg.stock || 10),
            image: payloadWithImg.image,
            description: payloadWithImg.description || 'Nuovo articolo Nike aggiunto al catalogo JSON.'
        };
        customAdded.unshift(newProd);
        localStorage.setItem('outlet_daale_custom_products_v5', JSON.stringify(customAdded));
        return { success: true, data: newProd };
    },

    _mirrorOrderLocally(order) {
        const list = JSON.parse(localStorage.getItem(this.localOrdersSyncKey) || '[]');
        list.unshift(order);
        localStorage.setItem(this.localOrdersSyncKey, JSON.stringify(list));
    }
};

window.HERO_IMAGE_DATA_URI = "https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcSZiU2kfR-Sn1TLd1rMvn3clsUOdQBHesXsmMugLXHZBRmIUK2VrcxsBmtLbss5Ew2JvKPq_FovE0FHjsw";
window.FALLBACK_PRODUCTS = [{"id": 1, "name": "Nike Air Max 270 Red Edition", "category": "Scarpe", "price": 79.99, "oldPrice": 169.99, "rating": 4.9, "reviews": 124, "badge": "-53%", "stock": 14, "image": "https://encrypted-tbn1.gstatic.com/licensed-image?q=tbn:ANd9GcTPjQQmM1dhXC_o0GO5l0zwEXU_qRFyNEmWuIu8qJ7-ffWpQWfj_QmzNaUl6AEOlVoTLKRKqO42sBgs4X4", "fallbackImage": "https://encrypted-tbn2.gstatic.com/licensed-image?q=tbn:ANd9GcQXkDWlB8IxleaPF8JTwJEomsdv-mGYplPlerGo-mn2VEs5HkmxiCIl5ln6bPAdyLlZM5SMRDK-8df4BBU", "description": "Sneakers Nike Air Max 270 con unità Max Air visibile a 270 gradi nel tallone per un'ammortizzazione estrema e tomaia traspirante nera e rossa."}, {"id": 2, "name": "Nike Air Jordan 1 Retro High OG Chicago", "category": "Scarpe", "price": 119.99, "oldPrice": 249.99, "rating": 5.0, "reviews": 215, "badge": "-52%", "stock": 8, "image": "https://www.resellzonecesena.com/cdn/shop/files/air-jordan-1-retro-high-og-chicago-lost-and-found-dz5485-612-resellzone-11.jpg?v=1717598416", "fallbackImage": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQXXXA-j1Oz7vjKI0HGByaYE-D4wIctJCb4xaBPhOAFtsx9I6YVFPvlQMh6&s=10", "description": "L'iconica Air Jordan 1 High in vera pelle pieno fiore con colorazione storica Chicago, collo imbottito ad alto profilo e suola preformata con unità Air-Sole."}, {"id": 3, "name": "Nike Air Force 1 '07 Triple White", "category": "Scarpe", "price": 64.99, "oldPrice": 129.99, "rating": 4.9, "reviews": 189, "badge": "-50%", "stock": 25, "image": "https://maxi.gumlet.io/media/catalog/product/n/i/nike-cw2288-air-force-1-07-white-tutte-sneaker-uomo-042099601-111_1.jpg", "fallbackImage": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSxJ3r_3B6YEJHVwiFNLlSXwmXhUhZZvgAGLuD8-38dx3dIVC0ZInNZQ-8&s=10", "description": "Il classico intramontabile del basket firmato Nike. Strati esterni in pelle cucita Triple White, dettagli puliti e ammortizzazione Nike Air."}, {"id": 4, "name": "Nike Dunk Low Retro White Black Panda", "category": "Scarpe", "price": 69.99, "oldPrice": 149.99, "rating": 4.8, "reviews": 94, "badge": "-53%", "stock": 18, "image": "https://www.resellzonecesena.com/cdn/shop/files/nike-dunk-low-retro-white-black-panda-dd1391-100-resellzone.jpg?v=1717964863", "fallbackImage": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcdjP90qDFhtPt9xbsH0ZXwnBEc7919BseNOb2DQx1wkFMmH451kRen2-m&s=10", "description": "Creata per il parquet ma perfetta per lo streetwear. La Nike Dunk Low Panda sfoggia blocchi di colore Black & White, pelle morbida e collare imbottito a taglio basso."}, {"id": 5, "name": "Nike ZoomX Vaporfly Next% Volt", "category": "Scarpe", "price": 89.99, "oldPrice": 219.99, "rating": 4.9, "reviews": 76, "badge": "-59%", "stock": 11, "image": "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcQCQFdm2hKEkCiPxWeMGoRgSw5fSxsm106QjShSxPeHEdxQ_PNXCqbUImsEqhTfMa4ROCqSN6_X47SFqa8", "fallbackImage": "https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcRI9o_anzlbbydXb1TfFq3BqQNJ1OSW3LkFszH8Pl3M5zAOR13c8QHrJI2k3ikFV0bkgthz5lgj_hMxx0c", "description": "Scarpa da running e lifestyle ad alte prestazioni con schiuma Nike ZoomX ultra-reattiva, piatto suola in fibra di carbonio e colorazione Volt ad alta visibilità."}, {"id": 6, "name": "Nike Air Max 90 Infrared Essential", "category": "Scarpe", "price": 74.99, "oldPrice": 159.99, "rating": 4.7, "reviews": 63, "badge": "-53%", "stock": 16, "image": "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcS-QabNLDij77sj_IQRcBqgng4ozhlJgccant4c7ZygkFtQLbSj87IyDjAH7Bh7_oTGSDaKh5jLczmXmEo", "fallbackImage": "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcS-QabNLDij77sj_IQRcBqgng4ozhlJgccant4c7ZygkFtQLbSj87IyDjAH7Bh7_oTGSDaKh5jLczmXmEo", "description": "Fedele alle sue radici anni '90 con la celebre suola con motivo Waffle, strati esterni cuciti e classici dettagli Infrared sull'occhiello e sul tallone."}, {"id": 7, "name": "Nike Sportswear Tech Fleece Hoodie", "category": "Abbigliamento", "price": 59.99, "oldPrice": 129.99, "rating": 4.9, "reviews": 142, "badge": "-54%", "stock": 20, "image": "https://img01.ztat.net/article/spp-media-p1/298124a1df3a46448da785d0f38e84db/3ffe67e5febf491d88068147e80d3fc5.jpg?imwidth=762&filter=packshot", "fallbackImage": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjvMMljVAB-AqxfqVbfSG2pvds7Cd4jf7o4LTOwv57OJeo3o5amcqSEx10&s=10", "description": "Felpa con cappuccio e zip a tutta lunghezza Nike Tech Fleece: calore eccezionale senza ingombro, tasca con zip termosaldata sulla manica e taglio ergonomico."}, {"id": 8, "name": "Nike Sportswear Windrunner Jacket", "category": "Abbigliamento", "price": 54.99, "oldPrice": 119.99, "rating": 4.8, "reviews": 58, "badge": "-54%", "stock": 14, "image": "https://img01.ztat.net/article/spp-media-p1/195eb14602d14b15b5cdde391ebb0b10/799a1cba926f4de8a63be5c0b3a800b3.jpg?imwidth=762&filter=packshot", "fallbackImage": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQL5b9sliFw90hcjQiZtO_qMs1V3_p46HDmzzklBYhJT4ExZIRM4S2ouZP8&s=10", "description": "Giacca antivento e idrorepellente Nike Windrunner con l'iconico design Chevron a V da 26 gradi sul petto, cappuccio regolabile e logo Swoosh."}, {"id": 9, "name": "Nike Sportswear Club Fleece Red", "category": "Abbigliamento", "price": 34.99, "oldPrice": 74.99, "rating": 4.7, "reviews": 87, "badge": "-53%", "stock": 30, "image": "https://img01.ztat.net/article/spp-media-p1/df715bca6eee47cfba98b8d8ba060cf7/132153ea4ded44ac965bc77bd826eec0.jpg?imwidth=762&filter=packshot", "fallbackImage": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcToHI5DTVWewrT4jLr1xFoz9guo60y7sRIftwVE6kFSLN7px4a5s-KaGGdu&s=10", "description": "Felpa Nike Sportswear Club in morbido fleece spazzolato all'interno, grande logo Nike Swoosh bianco a contrasto sul petto e bordi a costine."}, {"id": 10, "name": "Nike Heritage Backpack 25L", "category": "Accessori", "price": 24.99, "oldPrice": 55.0, "rating": 4.8, "reviews": 69, "badge": "-55%", "stock": 22, "image": "https://media.very.co.uk/i/very/WT81I_SQ1_0000000004_BLACK_SLf?$pdp_300x400_x2$&fmt=jpg", "fallbackImage": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjekVEh1nqFEeE3FJ89FoD1upp3jG-2bJIwntmsdJI-mQN4zIzpX0uoiB5&s=10", "description": "Zaino Nike Heritage in poliestere a trama fitta con scomparto interno imbottito per laptop fino a 15 pollici, maxi logo Nike Swoosh e spallacci imbottiti."}, {"id": 11, "name": "Nike Sportswear Heritage86 Cap", "category": "Accessori", "price": 16.99, "oldPrice": 35.0, "rating": 4.6, "reviews": 45, "badge": "-51%", "stock": 35, "image": "https://img01.ztat.net/article/spp-media-p1/65046f8fa3f73b58aed086e3afcf69e9/6ceafb6c36c9434eb889914cf79a8c26.jpg?imwidth=762&filter=packshot", "fallbackImage": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZE4R6gPhCQZwArDGcUhyKzJj9QJr-qWcu9DiPD_NIw0Bhc6HNja5WI7o&s=10", "description": "Cappellino regolabile Nike Sportswear Heritage86 Futura con visiera curva, tessuto traspirante, chiusura posteriore regolabile e logo Nike Swoosh ricamato."}, {"id": 12, "name": "Nike Brasilia 9.5 Training Duffel 60L", "category": "Accessori", "price": 29.99, "oldPrice": 65.0, "rating": 4.9, "reviews": 53, "badge": "-54%", "stock": 17, "image": "https://img01.ztat.net/article/spp-media-p1/89034083f9ff4ac195c6bc5c4eb2bdd5/a20b14355a4e44c7ae53ffafe287e2c0.jpg?imwidth=1800&filter=packshot", "fallbackImage": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjUr7UDmDGuTZd3sNayGh43iSMoWW4EfNGwlY1pCUWk1wLByVf_mudVRQr&s=10", "description": "Borsone sportivo Nike Brasilia 60L capiente e ultra-resistente con scomparto inferiore ventilato per le scarpe, fondo impermeabile e tracolla imbottita."}];
