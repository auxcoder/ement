//#region \0rolldown/runtime.js
var e = Object.defineProperty, t = (t, n) => {
	let r = {};
	for (var i in t) e(r, i, {
		get: t[i],
		enumerable: !0
	});
	return n || e(r, Symbol.toStringTag, { value: "Module" }), r;
}, n = null;
function r(e) {
	let t, r = !0, i = /* @__PURE__ */ new Set();
	return {
		get value() {
			if (r) {
				let a = /* @__PURE__ */ new Set();
				n = a;
				try {
					t = e();
				} finally {
					n = null;
				}
				i = a, r = !1;
			}
			return t;
		},
		invalidate() {
			r = !0;
		},
		get isDirty() {
			return r;
		},
		destroy() {
			i.clear(), r = !0, t = void 0;
		}
	};
}
function i(e) {
	n && n.add(e);
}
//#endregion
//#region src/core/reactive.js
var a = Symbol("__isProxy"), o = Symbol("__raw");
function s(e, t) {
	return e && e[a] ? e : d(e, t, "", /* @__PURE__ */ new WeakMap());
}
function c(e) {
	return e?.[o] ?? e;
}
function l(e) {
	return e?.[a] === !0;
}
var u = /* @__PURE__ */ new Set([
	"push",
	"pop",
	"shift",
	"unshift",
	"splice",
	"sort",
	"reverse",
	"fill",
	"copyWithin"
]);
function d(e, t, n, r) {
	if (r.has(e)) return r.get(e);
	let s = new Proxy(e, {
		get(e, s, c) {
			if (s === a) return !0;
			if (s === o) return e;
			let l = Reflect.get(e, s, c);
			if (typeof s == "string" && i(n ? `${n}.${s}` : s), Array.isArray(e) && u.has(s) && typeof l == "function") return (...r) => {
				let i = l.apply(e, r);
				return t(n || "self", e, e), i;
			};
			if (typeof l == "object" && l) {
				let i = n ? `${n}.${String(s)}` : String(s);
				if (l[a]) {
					let e = l[o];
					return d(e, t, i, /* @__PURE__ */ new WeakMap());
				}
				let u = d(l, t, i, r);
				return Reflect.set(e, s, u, c), u;
			}
			return l;
		},
		set(e, r, i, a) {
			let s = Reflect.get(e, r, a), c = i?.[o] ?? i;
			return Object.is(s, c) || (Reflect.set(e, r, c, a), Array.isArray(e) && r === "length") || t(n ? `${n}.${String(r)}` : String(r), c, s), !0;
		},
		deleteProperty(e, r) {
			if (r in e) {
				let i = e[r];
				delete e[r], t(n ? `${n}.${String(r)}` : String(r), void 0, i);
			}
			return !0;
		}
	});
	return r.set(e, s), s;
}
//#endregion
//#region src/core/scheduler.js
var f = !1, p = /* @__PURE__ */ new Set();
function ee(e) {
	p.add(e), f || (f = !0, queueMicrotask(re));
}
function te() {
	re();
}
function ne() {
	return p.size;
}
function re() {
	let e = [...p];
	p.clear(), f = !1;
	for (let t of e) t();
}
//#endregion
//#region \0@oxc-project+runtime@0.144.0/helpers/esm/checkPrivateRedeclaration.js
function ie(e, t) {
	if (t.has(e)) throw TypeError("Cannot initialize the same private elements twice on an object");
}
//#endregion
//#region \0@oxc-project+runtime@0.144.0/helpers/esm/classPrivateFieldInitSpec.js
function m(e, t, n) {
	ie(e, t), t.set(e, n);
}
//#endregion
//#region \0@oxc-project+runtime@0.144.0/helpers/esm/assertClassBrand.js
function h(e, t, n) {
	if (typeof e == "function" ? e === t : e.has(t)) return arguments.length < 3 ? t : n;
	throw TypeError("Private element is not present on this object");
}
//#endregion
//#region \0@oxc-project+runtime@0.144.0/helpers/esm/classPrivateFieldSet2.js
function g(e, t, n) {
	return e.set(h(e, t), n), n;
}
//#endregion
//#region \0@oxc-project+runtime@0.144.0/helpers/esm/classPrivateFieldGet2.js
function _(e, t) {
	return e.get(h(e, t));
}
//#endregion
//#region src/di/container.js
var v = /* @__PURE__ */ new WeakMap(), y = /* @__PURE__ */ new WeakMap(), b = /* @__PURE__ */ new WeakMap(), x = /* @__PURE__ */ new WeakMap(), ae = class e {
	constructor(e = null) {
		m(this, v, /* @__PURE__ */ new Map()), m(this, y, /* @__PURE__ */ new Map()), m(this, b, null), m(this, x, /* @__PURE__ */ new Set()), g(b, this, e);
	}
	register(e, t, { singleton: n = !0 } = {}) {
		return _(v, this).set(e, {
			factory: t,
			singleton: n
		}), _(y, this).delete(e), this;
	}
	resolve(e) {
		if (_(y, this).has(e)) return _(y, this).get(e);
		let t = _(v, this).get(e);
		if (t) {
			if (_(x, this).has(e)) throw Error(`Circular dependency detected while resolving ${e.toString()}`);
			_(x, this).add(e);
			try {
				let n = t.factory(this);
				return t.singleton && _(y, this).set(e, n), n;
			} finally {
				_(x, this).delete(e);
			}
		}
		if (_(b, this)) return _(b, this).resolve(e);
		throw Error(`No provider registered for ${e.toString()}. Did you forget to register it in the container?`);
	}
	has(e) {
		return _(v, this).has(e) ? !0 : _(b, this) ? _(b, this).has(e) : !1;
	}
	createChild() {
		return new e(this);
	}
}, S = Symbol("__elContainer");
function oe(e, t) {
	e[S] = t;
}
function se(e) {
	let t = e;
	for (; t;) {
		if (t[S]) return t[S];
		t = t.parentElement || t.getRootNode()?.host;
	}
	throw Error("No DI container found in DOM ancestors. Wrap your app with provideContainer(element, container).");
}
var ce = typeof HTMLElement < "u" ? HTMLElement : class {}, C = /* @__PURE__ */ new WeakMap(), le = class extends ce {
	constructor() {
		super(), m(this, C, void 0), g(C, this, new ae()), this[S] = _(C, this);
	}
	get container() {
		return _(C, this);
	}
	set container(e) {
		g(C, this, e), this[S] = e;
	}
};
typeof customElements < "u" && customElements.define("el-provider", le);
//#endregion
//#region \0@oxc-project+runtime@0.144.0/helpers/esm/classPrivateMethodInitSpec.js
function w(e, t) {
	ie(e, t), t.add(e);
}
//#endregion
//#region src/core/element.js
var T = /* @__PURE__ */ new WeakMap(), E = /* @__PURE__ */ new WeakMap(), D = /* @__PURE__ */ new WeakMap(), O = /* @__PURE__ */ new WeakSet(), ue = class extends HTMLElement {
	constructor() {
		super(), w(this, O), m(this, T, void 0), m(this, E, /* @__PURE__ */ new Map()), m(this, D, {}), g(T, this, this.attachShadow({ mode: "open" }));
	}
	get shadowRoot() {
		return _(T, this);
	}
	get container() {
		return se(this);
	}
	async connectedCallback() {
		await this.constructor._ensureResources(), h(O, this, fe).call(this), h(O, this, pe).call(this), this.onInit?.();
	}
	disconnectedCallback() {
		this.onDestroy?.();
	}
	attributeChangedCallback(e, t, n) {
		if (t === n) return;
		let r = e.replace(/-([a-z])/g, (e, t) => t.toUpperCase()), i = h(O, this, de).call(this, r, n, e);
		this[r] = i, this._notifyChange(r);
	}
	static async _ensureResources() {
		if (this._resolvedTemplate === void 0) {
			if (typeof this.template == "string") this._resolvedTemplate = this.template;
			else if (this.templateUrl) {
				let e = await fetch(this.templateUrl);
				this._resolvedTemplate = await e.text();
			} else this._resolvedTemplate = "";
			if (typeof this.styles == "string") this._resolvedStyles = this.styles;
			else if (this.stylesUrl) {
				let e = await fetch(this.stylesUrl);
				this._resolvedStyles = await e.text();
			} else this._resolvedStyles = null;
		}
	}
	_notifyChange(e) {
		_(E, this).has(e) && ee(() => h(O, this, ge).call(this, e));
	}
	show(e, t) {
		let n = _(T, this).querySelector?.(e);
		n && (n.style.display = t ? "" : "none");
	}
	when(e, t, n) {
		let r = _(T, this).querySelector?.(e);
		if (!r) return null;
		let i = `__el_when_${e}`;
		if (t) {
			if (!r[i]) {
				let e = n();
				r.appendChild(e), r[i] = e;
			}
			return r[i];
		}
		return r[i] && (r[i].remove?.(), r[i] = null), null;
	}
	repeat(e, t, n, r = (e, t) => t) {
		let i = _(T, this).querySelector?.(e);
		if (!i) return;
		let a = `__el_repeat_${e}`, o = i[a] || /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), c = [];
		for (let e = 0; e < t.length; e++) {
			let i = t[e], a = r(i, e);
			if (o.has(a)) s.set(a, o.get(a)), o.delete(a);
			else {
				let t = n(i, e);
				t.__elKey = a, s.set(a, t);
			}
			c.push(s.get(a));
		}
		for (let [, e] of o) e.remove?.();
		i.innerHTML !== void 0 && (i.innerHTML = ""), i.childNodes && (i.childNodes.length = 0);
		for (let e of c) i.appendChild(e);
		i[a] = s;
	}
	emit(e, t = null, n = {}) {
		let r = new CustomEvent(e, {
			detail: t,
			bubbles: !0,
			composed: !0,
			cancelable: !0,
			...n
		});
		return this.dispatchEvent(r);
	}
};
function de(e, t, n) {
	let r = this.constructor.propTypes;
	if (!r || !r[e]) return t;
	let i = r[e];
	if (i === Boolean) return t !== null && t !== "false" && t !== "0";
	if (i === Number) {
		if (t === null || t === "") return null;
		let r = Number(t);
		if (Number.isNaN(r)) {
			let r = `[ElElement] Attribute "${n}" received non-numeric value "${t}" (expected Number for property "${e}"). Defaulting to null.`;
			return console.warn(r), null;
		}
		return r;
	}
	return t;
}
function fe() {
	let e = this.constructor._resolvedTemplate, t = this.constructor._resolvedStyles;
	if (t) {
		let e = document.createElement("style");
		e.textContent = t, _(T, this).appendChild(e);
	}
	if (e) {
		let t = document.createElement("template");
		t.innerHTML = e;
		let n = t.content.cloneNode(!0);
		h(O, this, me).call(this, n), _(T, this).appendChild(n);
	}
	for (let [e] of _(E, this)) h(O, this, ge).call(this, e);
}
function pe() {
	for (let e of _(E, this).keys()) {
		let t = this[e];
		_(D, this)[e] = t, Object.defineProperty(this, e, {
			get: () => _(D, this)[e],
			set: (t) => {
				let n = _(D, this)[e];
				Object.is(n, t) || (_(D, this)[e] = t, ee(() => h(O, this, ge).call(this, e)));
			},
			enumerable: !0,
			configurable: !0
		});
	}
}
function me(e) {
	if (typeof document < "u" && document.createTreeWalker) {
		let t = document.createTreeWalker(e, 4);
		for (; t.nextNode();) h(O, this, he).call(this, t.currentNode);
	}
}
function he(e) {
	let t = e.textContent;
	if (!t || !t.includes("{{")) return;
	let n = [...t.matchAll(/\{\{\s*(\w+)\s*\}\}/g)];
	if (n.length !== 0) for (let r of n) {
		let n = r[1];
		_(E, this).has(n) || _(E, this).set(n, []), _(E, this).get(n).push({
			node: e,
			template: t
		});
	}
}
function ge(e) {
	let t = _(E, this).get(e);
	if (t) for (let { node: e, template: n } of t) {
		let t = n;
		for (let [e, n] of h(O, this, _e).call(this)) t = t.replace(RegExp(`\\{\\{\\s*${e}\\s*\\}\\}`, "g"), n ?? "");
		e.textContent = t;
	}
}
function _e() {
	let e = [];
	for (let t of _(E, this).keys()) e.push([t, this[t]]);
	return e;
}
//#endregion
//#region src/di/tokens.js
var ve = Symbol("Http"), ye = Symbol("Router"), be = Symbol("Storage"), xe = Symbol("Auth"), Se = /* @__PURE__ */ new WeakMap(), k = /* @__PURE__ */ new WeakMap(), Ce = /* @__PURE__ */ new WeakMap(), A = /* @__PURE__ */ new WeakMap(), j = /* @__PURE__ */ new WeakMap(), we = /* @__PURE__ */ new WeakMap(), Te = /* @__PURE__ */ new WeakMap(), M = /* @__PURE__ */ new WeakSet(), Ee = class {
	constructor({ baseUrl: e = "", interceptors: t = [], headers: n = {}, timeout: r = 0, retries: i = 0, retryDelay: a = 1e3 } = {}) {
		w(this, M), m(this, Se, void 0), m(this, k, void 0), m(this, Ce, void 0), m(this, A, /* @__PURE__ */ new Set()), m(this, j, void 0), m(this, we, void 0), m(this, Te, void 0), g(Se, this, e), g(k, this, t), g(Ce, this, n), g(j, this, r), g(we, this, i), g(Te, this, a);
	}
	async request(e, t = {}) {
		let n = t.retries ?? _(we, this), r = t.timeout ?? _(j, this), i;
		for (let a = 0; a <= n; a++) try {
			return await h(M, this, De).call(this, e, t, r);
		} catch (e) {
			if (i = e, e.name === "AbortError" || e.name === "TimeoutError" || e instanceof P && e.status >= 400 && e.status < 500) throw e;
			if (a < n) {
				let e = _(Te, this) * 2 ** a;
				await new Promise((t) => setTimeout(t, e));
			}
		}
		throw i;
	}
	cancelAll() {
		for (let e of _(A, this)) e.abort();
		_(A, this).clear();
	}
	get pendingCount() {
		return _(A, this).size;
	}
	async get(e, t = {}) {
		return (await this.request(e, {
			...t,
			method: "GET"
		})).json();
	}
	async post(e, t, n = {}) {
		let { serialized: r, headers: i } = h(M, this, N).call(this, t);
		return (await this.request(e, {
			...n,
			method: "POST",
			body: r,
			headers: {
				...i,
				...n.headers
			}
		})).json();
	}
	async put(e, t, n = {}) {
		let { serialized: r, headers: i } = h(M, this, N).call(this, t);
		return (await this.request(e, {
			...n,
			method: "PUT",
			body: r,
			headers: {
				...i,
				...n.headers
			}
		})).json();
	}
	async patch(e, t, n = {}) {
		let { serialized: r, headers: i } = h(M, this, N).call(this, t);
		return (await this.request(e, {
			...n,
			method: "PATCH",
			body: r,
			headers: {
				...i,
				...n.headers
			}
		})).json();
	}
	async delete(e, t = {}) {
		let n = await this.request(e, {
			...t,
			method: "DELETE"
		});
		return n.headers?.get?.("content-length") === "0" ? null : n.json().catch(() => null);
	}
};
async function De(e, t, n) {
	let r = new AbortController();
	if (_(A, this).add(r), t.signal) {
		if (t.signal.aborted) throw _(A, this).delete(r), new DOMException("Aborted", "AbortError");
		t.signal.addEventListener("abort", () => r.abort());
	}
	let i;
	n > 0 && (i = setTimeout(() => r.abort(), n));
	let a = {
		url: _(Se, this) + e,
		headers: {
			..._(Ce, this),
			...t.headers
		},
		...t,
		signal: r.signal
	};
	for (let e of _(k, this)) e.request && (a = await e.request(a));
	let { url: o, ...s } = a, c;
	try {
		c = await fetch(o, s);
	} catch (e) {
		if (clearTimeout(i), _(A, this).delete(r), n > 0 && e.name === "AbortError" && !t.signal?.aborted) {
			let e = /* @__PURE__ */ Error(`Request timeout after ${n}ms`);
			throw e.name = "TimeoutError", e;
		}
		for (let t of _(k, this)) t.requestError && await t.requestError(e, a);
		throw e;
	}
	for (let e of _(k, this)) e.response && (c = await e.response(c, a));
	if (!c.ok) {
		clearTimeout(i), _(A, this).delete(r);
		let e = new P(c.status, c.statusText, c);
		for (let t of _(k, this)) if (t.responseError) {
			let n = await t.responseError(e, a);
			if (n) return n;
		}
		throw e;
	}
	return clearTimeout(i), _(A, this).delete(r), c;
}
function N(e) {
	return e == null ? {
		serialized: null,
		headers: {}
	} : typeof e == "string" ? {
		serialized: e,
		headers: { "Content-Type": "application/json" }
	} : typeof FormData < "u" && e instanceof FormData || typeof Blob < "u" && e instanceof Blob || typeof ArrayBuffer < "u" && e instanceof ArrayBuffer || typeof ReadableStream < "u" && e instanceof ReadableStream || typeof URLSearchParams < "u" && e instanceof URLSearchParams ? {
		serialized: e,
		headers: {}
	} : {
		serialized: JSON.stringify(e),
		headers: { "Content-Type": "application/json" }
	};
}
var P = class extends Error {
	constructor(e, t, n) {
		super(`HTTP ${e}: ${t}`), this.name = "HttpError", this.status = e, this.response = n;
	}
}, F = /* @__PURE__ */ new WeakMap(), I = /* @__PURE__ */ new WeakMap(), L = /* @__PURE__ */ new WeakMap(), R = /* @__PURE__ */ new WeakMap(), z = /* @__PURE__ */ new WeakMap(), B = /* @__PURE__ */ new WeakSet(), Oe = class extends EventTarget {
	constructor(e) {
		super(), w(this, B), m(this, F, []), m(this, I, /* @__PURE__ */ new Map()), m(this, L, {
			onBefore: [],
			onSuccess: [],
			onError: []
		}), m(this, R, null), m(this, z, null), g(R, this, e), typeof window < "u" && window.addEventListener("popstate", () => h(B, this, V).call(this));
	}
	group(e, { resolve: t } = {}) {
		return _(I, this).set(e, {
			resolve: t,
			data: null,
			resolved: !1
		}), this;
	}
	route(e, t, { resolve: n, group: r } = {}) {
		let i = new URLPattern({ pathname: e });
		return _(F, this).push({
			pattern: e,
			urlPattern: i,
			component: t,
			resolve: n,
			group: r
		}), this;
	}
	onBefore(e) {
		return _(L, this).onBefore.push(e), this;
	}
	onSuccess(e) {
		return _(L, this).onSuccess.push(e), this;
	}
	onError(e) {
		return _(L, this).onError.push(e), this;
	}
	navigate(e) {
		typeof history < "u" && history.pushState(null, "", e), h(B, this, V).call(this, e);
	}
	get current() {
		return _(z, this);
	}
	invalidateGroup(e) {
		let t = _(I, this).get(e);
		t && (t.resolved = !1, t.data = null);
	}
	start() {
		typeof location < "u" && h(B, this, V).call(this, location.pathname + location.search);
	}
};
async function V(e) {
	let t = e || (typeof location < "u" ? location.pathname : "/"), n = new URL(t, "http://localhost");
	for (let e of _(F, this)) {
		let r = e.urlPattern.exec(n);
		if (!r) continue;
		let i = r.pathname.groups, a = _(z, this), o = {
			path: t,
			params: i,
			route: e
		};
		try {
			for (let e of _(L, this).onBefore) {
				let t = await e(a, o);
				if (t === !1) return;
				if (typeof t == "string") {
					this.navigate(t);
					return;
				}
			}
			let t = {};
			if (e.group) {
				let n = _(I, this).get(e.group);
				n && !n.resolved && (n.data = await n.resolve(i), n.resolved = !0), n && (t = { ...n.data });
			}
			if (e.resolve) {
				let n = await e.resolve(i);
				t = {
					...t,
					...n
				};
			}
			h(B, this, ke).call(this, e.component, i, t), g(z, this, o);
			for (let e of _(L, this).onSuccess) await e(a, o, t);
			this.dispatchEvent(new CustomEvent("navigate", { detail: {
				from: a,
				to: o,
				data: t
			} }));
		} catch (e) {
			for (let t of _(L, this).onError) await t(e, a, o);
		}
		return;
	}
}
function ke(e, t, n) {
	if (!_(R, this)) return;
	_(R, this).innerHTML !== void 0 && (_(R, this).innerHTML = "");
	let r = typeof document < "u" ? document.createElement(e) : {
		tagName: e,
		params: null,
		routeData: null
	};
	r.params = t, r.routeData = n, _(R, this).appendChild(r);
}
//#endregion
//#region src/router/links.js
function Ae(e, t) {
	let n = (t) => {
		if (t.button !== 0 || t.metaKey || t.ctrlKey || t.shiftKey || t.altKey) return;
		let n = t.target?.closest?.("a[href]");
		if (!n || n.hasAttribute("data-external") || n.getAttribute("target")) return;
		let r = n.getAttribute("href");
		if (!r || r.startsWith("mailto:") || r.startsWith("tel:") || r.startsWith("#") || n.origin && n.origin !== location?.origin) return;
		t.preventDefault();
		let i = n.pathname + (n.search || "");
		e.navigate(i);
	}, r = t || (typeof document < "u" ? document : null);
	return r?.addEventListener("click", n), () => {
		r?.removeEventListener("click", n);
	};
}
//#endregion
//#region src/core/bootstrap.js
function je(e, t = {}) {
	let { services: n = [], http: r, routes: i, outlet: a = "route-outlet" } = t, o = typeof e == "string" ? document.querySelector(e) : e;
	if (!o) throw Error(`bootstrap: root element "${e}" not found`);
	let s = new ae(), c = new Ee(r || {});
	s.register(ve, () => c);
	for (let [e, t] of n) s.register(e, t);
	oe(o, s);
	let l = null;
	return i && (l = new Oe(o.querySelector(a) || o), s.register(ye, () => l), i(l), Ae(l, o), l.start()), {
		container: s,
		router: l,
		http: c
	};
}
//#endregion
//#region src/router/route-outlet.js
var Me = typeof HTMLElement < "u" ? HTMLElement : class {}, H = /* @__PURE__ */ new WeakMap(), Ne = class extends Me {
	constructor() {
		super(), m(this, H, null);
	}
	get currentComponent() {
		return _(H, this);
	}
	mount(e) {
		this.clear(), g(H, this, e), this.appendChild(e);
	}
	clear() {
		_(H, this) && (_(H, this).remove?.(), g(H, this, null)), this.innerHTML !== void 0 && (this.innerHTML = "");
	}
};
typeof customElements < "u" && customElements.define("route-outlet", Ne);
//#endregion
//#region src/forms/field.js
var U = /* @__PURE__ */ new WeakMap(), Pe = /* @__PURE__ */ new WeakMap(), Fe = /* @__PURE__ */ new WeakMap(), W = /* @__PURE__ */ new WeakMap(), G = /* @__PURE__ */ new WeakMap(), K = /* @__PURE__ */ new WeakMap(), q = /* @__PURE__ */ new WeakMap(), J = /* @__PURE__ */ new WeakMap(), Y = /* @__PURE__ */ new WeakMap(), X = /* @__PURE__ */ new WeakMap(), Z = /* @__PURE__ */ new WeakSet(), Ie = class {
	constructor(e, t = {}) {
		w(this, Z), m(this, U, void 0), m(this, Pe, void 0), m(this, Fe, void 0), m(this, W, void 0), m(this, G, void 0), m(this, K, void 0), m(this, q, void 0), m(this, J, void 0), m(this, Y, void 0), m(this, X, {
			viewValue: "",
			modelValue: void 0,
			valid: !0,
			dirty: !1,
			touched: !1,
			errors: {},
			pending: !1
		});
		let { parsers: n = [], formatters: r = [], validators: i = [], asyncValidators: a = [], onChange: o, debounce: s = 0 } = t;
		g(U, this, e), g(Pe, this, n), g(Fe, this, r), g(W, this, i), g(G, this, a), g(K, this, o), g(q, this, s), e.addEventListener && (e.addEventListener("input", (e) => {
			_(q, this) > 0 ? (clearTimeout(_(J, this)), g(J, this, setTimeout(() => h(Z, this, Le).call(this, e.target.value), _(q, this)))) : h(Z, this, Le).call(this, e.target.value);
		}), e.addEventListener("blur", () => h(Z, this, Ve).call(this)));
	}
	writeValue(e) {
		_(X, this).modelValue = e;
		let t = e;
		for (let e of _(Fe, this)) t = e(t);
		_(X, this).viewValue = t, _(U, this).value !== void 0 && (_(U, this).value = t ?? ""), h(Z, this, Re).call(this, e), h(Z, this, Q).call(this);
	}
	get modelValue() {
		return _(X, this).modelValue;
	}
	get viewValue() {
		return _(X, this).viewValue;
	}
	get valid() {
		return _(X, this).valid;
	}
	get dirty() {
		return _(X, this).dirty;
	}
	get touched() {
		return _(X, this).touched;
	}
	get pending() {
		return _(X, this).pending;
	}
	get errors() {
		return { ..._(X, this).errors };
	}
	get snapshot() {
		return {
			..._(X, this),
			errors: { ..._(X, this).errors }
		};
	}
	markDirty() {
		_(X, this).dirty = !0, h(Z, this, Q).call(this);
	}
	markPristine() {
		_(X, this).dirty = !1, h(Z, this, Q).call(this);
	}
	markTouched() {
		h(Z, this, Ve).call(this);
	}
	reset(e) {
		_(X, this).dirty = !1, _(X, this).touched = !1, _(X, this).errors = {}, this.writeValue(e);
	}
	destroy() {
		_(Y, this)?.abort(), clearTimeout(_(J, this));
	}
};
function Le(e) {
	_(X, this).viewValue = e, _(X, this).dirty = !0;
	let t = e;
	for (let e of _(Pe, this)) if (t = e(t), t === void 0) break;
	_(X, this).modelValue = t, h(Z, this, Re).call(this, t), _(K, this) && _(K, this).call(this, t, this.snapshot), h(Z, this, Q).call(this);
}
function Re(e) {
	if (_(X, this).errors = {}, Array.isArray(_(W, this))) for (let t of _(W, this)) {
		let n = t(e, _(X, this).viewValue);
		n && (_(X, this).errors[n] = !0);
	}
	else if (_(W, this) && typeof _(W, this) == "object") for (let [t, n] of Object.entries(_(W, this))) n(e, _(X, this).viewValue) || (_(X, this).errors[t] = !0);
	_(X, this).valid = Object.keys(_(X, this).errors).length === 0, _(X, this).valid && h(Z, this, ze).call(this) && h(Z, this, Be).call(this, e);
}
function ze() {
	return Array.isArray(_(G, this)) ? _(G, this).length > 0 : _(G, this) && typeof _(G, this) == "object" ? Object.keys(_(G, this)).length > 0 : !1;
}
async function Be(e) {
	_(Y, this)?.abort(), g(Y, this, new AbortController());
	let t = _(Y, this).signal;
	if (_(X, this).pending = !0, h(Z, this, Q).call(this), Array.isArray(_(G, this))) for (let n of _(G, this)) {
		let r = await n(e, t);
		if (t.aborted) return;
		r && (_(X, this).errors[r] = !0);
	}
	else if (_(G, this) && typeof _(G, this) == "object") for (let [n, r] of Object.entries(_(G, this))) {
		let i = await r(e, t);
		if (t.aborted) return;
		i || (_(X, this).errors[n] = !0);
	}
	_(X, this).pending = !1, _(X, this).valid = Object.keys(_(X, this).errors).length === 0, h(Z, this, Q).call(this), _(K, this) && _(K, this).call(this, _(X, this).modelValue, this.snapshot);
}
function Ve() {
	_(X, this).touched = !0, h(Z, this, Q).call(this);
}
function Q() {
	let e = _(U, this).classList;
	e && (e.toggle("el-valid", _(X, this).valid), e.toggle("el-invalid", !_(X, this).valid), e.toggle("el-dirty", _(X, this).dirty), e.toggle("el-pristine", !_(X, this).dirty), e.toggle("el-touched", _(X, this).touched), e.toggle("el-untouched", !_(X, this).touched), e.toggle("el-pending", _(X, this).pending));
}
//#endregion
//#region src/forms/form-group.js
var $ = /* @__PURE__ */ new WeakMap(), He = class {
	constructor(e) {
		m(this, $, /* @__PURE__ */ new Map()), e?.addEventListener && e.addEventListener("submit", (e) => {
			if (!this.valid) {
				e.preventDefault();
				for (let e of _($, this).values()) e.markTouched();
			}
		});
	}
	addField(e, t) {
		return _($, this).set(e, t), this;
	}
	removeField(e) {
		let t = _($, this).get(e);
		t && (t.destroy(), _($, this).delete(e));
	}
	field(e) {
		return _($, this).get(e);
	}
	get valid() {
		for (let e of _($, this).values()) if (!e.valid) return !1;
		return !0;
	}
	get dirty() {
		for (let e of _($, this).values()) if (e.dirty) return !0;
		return !1;
	}
	get touched() {
		for (let e of _($, this).values()) if (e.touched) return !0;
		return !1;
	}
	get pending() {
		for (let e of _($, this).values()) if (e.pending) return !0;
		return !1;
	}
	get errors() {
		let e = {};
		for (let [t, n] of _($, this)) {
			let r = n.errors;
			Object.keys(r).length > 0 && (e[t] = r);
		}
		return e;
	}
	reset(e = {}) {
		for (let [t, n] of _($, this)) n.reset(e[t]);
	}
	destroy() {
		for (let e of _($, this).values()) e.destroy();
		_($, this).clear();
	}
}, Ue = /* @__PURE__ */ t({
	lowercase: () => Ge,
	maxLength: () => Ze,
	stripNonDigits: () => Xe,
	toBoolean: () => Ye,
	toDate: () => Je,
	toNumber: () => qe,
	trim: () => We,
	uppercase: () => Ke
}), We = (e) => e?.trim(), Ge = (e) => e?.toLowerCase(), Ke = (e) => e?.toUpperCase(), qe = (e) => e === "" ? null : Number(e), Je = (e) => e ? new Date(e) : null, Ye = (e) => e === "true" || e === "1", Xe = (e) => e?.replace(/\D/g, ""), Ze = (e) => (t) => t?.slice(0, e), Qe = /* @__PURE__ */ t({
	currency: () => nt,
	date: () => et,
	mask: () => tt,
	percentage: () => rt,
	phone: () => $e
}), $e = (e) => {
	if (!e) return "";
	let t = String(e).replace(/\D/g, "");
	return t.length === 10 ? `(${t.slice(0, 3)}) ${t.slice(3, 6)}-${t.slice(6, 10)}` : e;
}, et = (e) => {
	if (!e) return "";
	let t = e instanceof Date ? e : new Date(e);
	return isNaN(t.getTime()) ? "" : t.toISOString().split("T")[0];
}, tt = (e = 4, t = "•") => (n) => {
	if (!n) return "";
	let r = String(n);
	return r.length <= e ? r : t.repeat(r.length - e) + r.slice(-e);
}, nt = (e = 2, t = void 0) => (n) => n == null ? "" : new Intl.NumberFormat(t, {
	minimumFractionDigits: e,
	maximumFractionDigits: e
}).format(Number(n)), rt = (e = 0) => (t) => t == null ? "" : (Number(t) * 100).toFixed(e), it = /* @__PURE__ */ t({
	email: () => dt,
	max: () => ut,
	maxLength: () => st,
	min: () => lt,
	minLength: () => ot,
	pattern: () => ct,
	required: () => at
}), at = (e) => !e && e !== 0 ? "required" : null, ot = (e) => (t) => t?.length < e ? "minLength" : null, st = (e) => (t) => t?.length > e ? "maxLength" : null, ct = (e, t = "pattern") => (n) => n && !e.test(n) ? t : null, lt = (e) => (t) => t != null && t < e ? "min" : null, ut = (e) => (t) => t != null && t > e ? "max" : null, dt = (e) => e ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? null : "email" : null;
//#endregion
//#region src/animate/animate.js
function ft(e, t, n = {}) {
	return e.animate(t, {
		duration: 300,
		easing: "ease-in-out",
		fill: "forwards",
		...n
	});
}
function pt(e, t, n = {}) {
	let r = e.animate(t, {
		duration: 300,
		easing: "ease-in-out",
		fill: "forwards",
		...n
	});
	return r.onfinish = () => e.remove(), r;
}
function mt(e, t, { delay: n = 50, ...r } = {}) {
	let i = {
		duration: 300,
		easing: "ease-in-out",
		fill: "forwards"
	};
	return Array.from(e).map((e, a) => e.animate(t, {
		...i,
		...r,
		delay: a * n
	}));
}
var ht = {
	fadeIn: [{ opacity: 0 }, { opacity: 1 }],
	fadeOut: [{ opacity: 1 }, { opacity: 0 }],
	slideInDown: [{
		opacity: 0,
		transform: "translateY(-20px)"
	}, {
		opacity: 1,
		transform: "translateY(0)"
	}],
	slideOutUp: [{
		opacity: 1,
		transform: "translateY(0)"
	}, {
		opacity: 0,
		transform: "translateY(-20px)"
	}],
	slideInLeft: [{
		opacity: 0,
		transform: "translateX(-20px)"
	}, {
		opacity: 1,
		transform: "translateX(0)"
	}],
	scaleIn: [{
		opacity: 0,
		transform: "scale(0.9)"
	}, {
		opacity: 1,
		transform: "scale(1)"
	}]
};
//#endregion
//#region src/security/sanitize.js
function gt(e, t = {}) {
	let { allowedTags: n = /* @__PURE__ */ "p.br.b.i.em.strong.a.ul.ol.li.h1.h2.h3.h4.h5.h6.blockquote.code.pre.span.div.img.table.thead.tbody.tr.td.th".split("."), allowedAttrs: r = [
		"href",
		"src",
		"alt",
		"title",
		"class",
		"id",
		"width",
		"height"
	] } = t, i = new Set(n.map((e) => e.toLowerCase())), a = new Set(r.map((e) => e.toLowerCase())), o = _t(e);
	return o ? (yt(o.body, i, a), o.body.innerHTML) : "";
}
function _t(e) {
	return typeof DOMParser > "u" ? vt(e) : new DOMParser().parseFromString(e, "text/html");
}
function vt(e) {
	return { body: {
		innerHTML: e,
		get childNodes() {
			return [];
		}
	} };
}
function yt(e, t, n) {
	if (!e.childNodes) return;
	let r = [];
	for (let i of [...e.childNodes]) {
		if (i.nodeType === 3) continue;
		if (i.nodeType === 8) {
			r.push(i);
			continue;
		}
		if (i.nodeType !== 1) continue;
		let a = i.tagName?.toLowerCase();
		if (!t.has(a)) {
			let t = e.ownerDocument?.createDocumentFragment?.();
			if (t) {
				for (; i.firstChild;) t.appendChild(i.firstChild);
				e.replaceChild(t, i);
			} else r.push(i);
			continue;
		}
		if (i.attributes) for (let e of [...i.attributes]) {
			let t = e.name.toLowerCase();
			if (t.startsWith("on")) {
				i.removeAttribute(e.name);
				continue;
			}
			if ((t === "href" || t === "src") && e.value) {
				let t = e.value.trim().toLowerCase();
				if (t.startsWith("javascript:") || t.startsWith("data:") && !t.startsWith("data:image/")) {
					i.removeAttribute(e.name);
					continue;
				}
			}
			n.has(t) || i.removeAttribute(e.name);
		}
		yt(i, t, n);
	}
	for (let t of r) e.removeChild(t);
}
function bt(e) {
	return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}
//#endregion
//#region src/filters/intl.js
function xt(e, t = "USD", n = void 0) {
	return new Intl.NumberFormat(n, {
		style: "currency",
		currency: t
	}).format(e);
}
function St(e, t = {}, n = void 0) {
	return new Intl.NumberFormat(n, t).format(e);
}
function Ct(e, t = void 0) {
	return new Intl.NumberFormat(t, { style: "percent" }).format(e);
}
function wt(e, t = "medium", n = void 0) {
	let r = {
		short: { dateStyle: "short" },
		medium: { dateStyle: "medium" },
		long: { dateStyle: "long" },
		full: { dateStyle: "full" }
	};
	return new Intl.DateTimeFormat(n, r[t] || r.medium).format(new Date(e));
}
function Tt(e, t = void 0) {
	let n = Date.now() - new Date(e).getTime(), r = Math.floor(n / 1e3), i = Math.floor(r / 60), a = Math.floor(i / 60), o = Math.floor(a / 24), s = new Intl.RelativeTimeFormat(t, { numeric: "auto" });
	return o > 0 ? s.format(-o, "day") : a > 0 ? s.format(-a, "hour") : i > 0 ? s.format(-i, "minute") : s.format(-r, "second");
}
function Et(e, t = "conjunction", n = void 0) {
	return new Intl.ListFormat(n, {
		style: "long",
		type: t
	}).format(e);
}
function Dt(e, t, n = void 0) {
	return (t[new Intl.PluralRules(n).select(e)] || t.other || "").replace("#", String(e));
}
//#endregion
export { xe as AuthToken, ae as ElContainer, ue as ElElement, Ie as ElField, He as ElFormGroup, Ee as ElHttp, le as ElProvider, Oe as ElRouter, P as HttpError, ve as HttpToken, Ne as RouteOutlet, ye as RouterToken, be as StorageToken, ft as animateIn, pt as animateOut, je as bootstrap, r as computed, bt as escapeHTML, te as flushUpdates, xt as formatCurrency, wt as formatDate, Et as formatList, St as formatNumber, Ct as formatPercent, Dt as formatPlural, Tt as formatRelative, Qe as formatters, Ae as interceptLinks, l as isReactive, Ue as parsers, ne as pendingCount, ht as presets, oe as provideContainer, s as reactive, se as resolveContainer, gt as sanitizeHTML, ee as scheduleUpdate, mt as stagger, c as toRaw, it as validators };

//# sourceMappingURL=index.js.map