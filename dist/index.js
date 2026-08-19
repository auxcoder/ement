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
	return e && e[a] ? e : ee(e, t, "", /* @__PURE__ */ new WeakMap());
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
function ee(e, t, n, r) {
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
					return ee(e, t, i, /* @__PURE__ */ new WeakMap());
				}
				let u = ee(l, t, i, r);
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
var te = !1, d = /* @__PURE__ */ new Set();
function f(e) {
	d.add(e), te || (te = !0, queueMicrotask(ie));
}
function ne() {
	ie();
}
function re() {
	return d.size;
}
function ie() {
	let e = [...d];
	d.clear(), te = !1;
	for (let t of e) t();
}
//#endregion
//#region \0@oxc-project+runtime@0.144.0/helpers/esm/checkPrivateRedeclaration.js
function ae(e, t) {
	if (t.has(e)) throw TypeError("Cannot initialize the same private elements twice on an object");
}
//#endregion
//#region \0@oxc-project+runtime@0.144.0/helpers/esm/classPrivateFieldInitSpec.js
function p(e, t, n) {
	ae(e, t), t.set(e, n);
}
//#endregion
//#region \0@oxc-project+runtime@0.144.0/helpers/esm/assertClassBrand.js
function m(e, t, n) {
	if (typeof e == "function" ? e === t : e.has(t)) return arguments.length < 3 ? t : n;
	throw TypeError("Private element is not present on this object");
}
//#endregion
//#region \0@oxc-project+runtime@0.144.0/helpers/esm/classPrivateFieldSet2.js
function h(e, t, n) {
	return e.set(m(e, t), n), n;
}
//#endregion
//#region \0@oxc-project+runtime@0.144.0/helpers/esm/classPrivateFieldGet2.js
function g(e, t) {
	return e.get(m(e, t));
}
//#endregion
//#region src/di/container.js
var _ = /* @__PURE__ */ new WeakMap(), v = /* @__PURE__ */ new WeakMap(), y = /* @__PURE__ */ new WeakMap(), b = /* @__PURE__ */ new WeakMap(), oe = class e {
	constructor(e = null) {
		p(this, _, /* @__PURE__ */ new Map()), p(this, v, /* @__PURE__ */ new Map()), p(this, y, null), p(this, b, /* @__PURE__ */ new Set()), h(y, this, e);
	}
	register(e, t, { singleton: n = !0 } = {}) {
		return g(_, this).set(e, {
			factory: t,
			singleton: n
		}), g(v, this).delete(e), this;
	}
	resolve(e) {
		if (g(v, this).has(e)) return g(v, this).get(e);
		let t = g(_, this).get(e);
		if (t) {
			if (g(b, this).has(e)) throw Error(`Circular dependency detected while resolving ${e.toString()}`);
			g(b, this).add(e);
			try {
				let n = t.factory(this);
				return t.singleton && g(v, this).set(e, n), n;
			} finally {
				g(b, this).delete(e);
			}
		}
		if (g(y, this)) return g(y, this).resolve(e);
		throw Error(`No provider registered for ${e.toString()}. Did you forget to register it in the container?`);
	}
	has(e) {
		return g(_, this).has(e) ? !0 : g(y, this) ? g(y, this).has(e) : !1;
	}
	createChild() {
		return new e(this);
	}
}, x = Symbol("__elContainer");
function se(e, t) {
	e[x] = t;
}
function ce(e) {
	let t = e;
	for (; t;) {
		if (t[x]) return t[x];
		t = t.parentElement || t.getRootNode()?.host;
	}
	throw Error("No DI container found in DOM ancestors. Wrap your app with provideContainer(element, container).");
}
var le = typeof HTMLElement < "u" ? HTMLElement : class {}, S = /* @__PURE__ */ new WeakMap(), ue = class extends le {
	constructor() {
		super(), p(this, S, void 0), h(S, this, new oe()), this[x] = g(S, this);
	}
	get container() {
		return g(S, this);
	}
	set container(e) {
		h(S, this, e), this[x] = e;
	}
};
typeof customElements < "u" && customElements.define("el-provider", ue);
//#endregion
//#region \0@oxc-project+runtime@0.144.0/helpers/esm/classPrivateMethodInitSpec.js
function C(e, t) {
	ae(e, t), t.add(e);
}
//#endregion
//#region src/core/element.js
var w = /* @__PURE__ */ new WeakMap(), T = /* @__PURE__ */ new WeakMap(), E = /* @__PURE__ */ new WeakMap(), D = /* @__PURE__ */ new WeakMap(), de = /* @__PURE__ */ new WeakMap(), fe = /* @__PURE__ */ new WeakMap(), O = /* @__PURE__ */ new WeakSet(), pe = class extends HTMLElement {
	constructor() {
		super(), C(this, O), p(this, w, void 0), p(this, T, /* @__PURE__ */ new Map()), p(this, E, {}), p(this, D, null), p(this, de, !1), p(this, fe, []), h(w, this, this.attachShadow({ mode: "open" }));
	}
	get shadowRoot() {
		return g(w, this);
	}
	get container() {
		return ce(this);
	}
	async connectedCallback() {
		await this.constructor._ensureResources(), m(O, this, he).call(this), m(O, this, ge).call(this), this.onInit?.(), h(de, this, !0);
	}
	disconnectedCallback() {
		this.onDestroy?.();
	}
	attributeChangedCallback(e, t, n) {
		if (t === n) return;
		let r = e.replace(/-([a-z])/g, (e, t) => t.toUpperCase()), i = m(O, this, me).call(this, r, n, e);
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
		g(T, this).has(e) && f(() => m(O, this, be).call(this, e));
	}
	show(e, t) {
		let n = g(w, this).querySelector?.(e);
		n && (n.style.display = t ? "" : "none");
	}
	when(e, t, n) {
		let r = g(w, this).querySelector?.(e);
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
		let i = g(w, this).querySelector?.(e);
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
	bind(e, t) {
		let n = g(w, this).querySelectorAll ? [...g(w, this).querySelectorAll(e)] : [g(w, this).querySelector?.(e)].filter(Boolean);
		if (n.length === 0) return;
		let r = {}, i = {};
		for (let [e, n] of Object.entries(t)) m(O, this, Se).call(this, n) ? r[e] = n : i[e] = n;
		for (let e of n) {
			for (let [t, n] of Object.entries(i)) e[t] = n;
			for (let [t, n] of Object.entries(r)) e[t] = n();
		}
		let a = {
			selector: e,
			elements: n,
			inputs: r,
			outputs: i
		};
		g(fe, this).push(a), m(O, this, Ce).call(this, a);
	}
};
function me(e, t, n) {
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
function he() {
	let e = this.constructor._resolvedTemplate, t = this.constructor._resolvedStyles;
	if (t) {
		let e = document.createElement("style");
		e.textContent = t, g(w, this).appendChild(e);
	}
	if (e) {
		let t = document.createElement("template");
		t.innerHTML = e;
		let n = t.content.cloneNode(!0);
		m(O, this, ve).call(this, n), g(w, this).appendChild(n);
	}
	for (let [e] of g(T, this)) m(O, this, be).call(this, e);
}
function ge() {
	for (let e of g(T, this).keys()) {
		let t = this[e];
		g(E, this)[e] = t, Object.defineProperty(this, e, {
			get: () => g(E, this)[e],
			set: (t) => {
				let n = g(E, this)[e];
				Object.is(n, t) || (g(E, this)[e] = t, f(() => m(O, this, be).call(this, e)), m(O, this, _e).call(this, e, n, t));
			},
			enumerable: !0,
			configurable: !0
		});
	}
}
function _e(e, t, n) {
	if (!g(de, this) || !this.onChanges) return;
	let r = t === void 0;
	g(D, this) || (h(D, this, {}), f(() => {
		let e = g(D, this);
		h(D, this, null), this.onChanges(e);
	})), g(D, this)[e] = {
		previous: t,
		current: n,
		firstChange: r
	};
}
function ve(e) {
	if (typeof document < "u" && document.createTreeWalker) {
		let t = document.createTreeWalker(e, 4);
		for (; t.nextNode();) m(O, this, ye).call(this, t.currentNode);
	}
}
function ye(e) {
	let t = e.textContent;
	if (!t || !t.includes("{{")) return;
	let n = [...t.matchAll(/\{\{\s*(\w+)\s*\}\}/g)];
	if (n.length !== 0) for (let r of n) {
		let n = r[1];
		g(T, this).has(n) || g(T, this).set(n, []), g(T, this).get(n).push({
			node: e,
			template: t
		});
	}
}
function be(e) {
	let t = g(T, this).get(e);
	if (t) for (let { node: e, template: n } of t) {
		let t = n;
		for (let [e, n] of m(O, this, xe).call(this)) t = t.replace(RegExp(`\\{\\{\\s*${e}\\s*\\}\\}`, "g"), n ?? "");
		e.textContent = t;
	}
}
function xe() {
	let e = [];
	for (let t of g(T, this).keys()) e.push([t, this[t]]);
	return e;
}
function Se(e) {
	return e.length === 0;
}
function Ce(e) {
	let t = this, n = this.onChanges;
	this.onChanges = function(r) {
		for (let t of e.elements) for (let [n, r] of Object.entries(e.inputs)) {
			let e = r();
			Object.is(t[n], e) || (t[n] = e);
		}
		n && n !== t.onChanges && n.call(t, r);
	};
}
//#endregion
//#region src/di/tokens.js
var we = Symbol("Http"), Te = Symbol("Router"), Ee = Symbol("Storage"), De = Symbol("Auth"), k = /* @__PURE__ */ new WeakMap(), A = /* @__PURE__ */ new WeakMap(), j = /* @__PURE__ */ new WeakMap(), M = /* @__PURE__ */ new WeakMap(), N = /* @__PURE__ */ new WeakMap(), P = /* @__PURE__ */ new WeakMap(), Oe = /* @__PURE__ */ new WeakMap(), F = /* @__PURE__ */ new WeakSet(), ke = class {
	constructor({ baseUrl: e = "", interceptors: t = [], headers: n = {}, timeout: r = 0, retries: i = 0, retryDelay: a = 1e3 } = {}) {
		C(this, F), p(this, k, void 0), p(this, A, void 0), p(this, j, void 0), p(this, M, /* @__PURE__ */ new Set()), p(this, N, void 0), p(this, P, void 0), p(this, Oe, void 0), h(k, this, e), h(A, this, t), h(j, this, n), h(N, this, r), h(P, this, i), h(Oe, this, a);
	}
	async request(e, t = {}) {
		let n = t.retries ?? g(P, this), r = t.timeout ?? g(N, this), i;
		for (let a = 0; a <= n; a++) try {
			return await m(F, this, Ae).call(this, e, t, r);
		} catch (e) {
			if (i = e, e.name === "AbortError" || e.name === "TimeoutError" || e instanceof I && e.status >= 400 && e.status < 500) throw e;
			if (a < n) {
				let e = g(Oe, this) * 2 ** a;
				await new Promise((t) => setTimeout(t, e));
			}
		}
		throw i;
	}
	cancelAll() {
		for (let e of g(M, this)) e.abort();
		g(M, this).clear();
	}
	get pendingCount() {
		return g(M, this).size;
	}
	async get(e, t = {}) {
		return (await this.request(e, {
			...t,
			method: "GET"
		})).json();
	}
	async post(e, t, n = {}) {
		let { serialized: r, headers: i } = m(F, this, je).call(this, t);
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
		let { serialized: r, headers: i } = m(F, this, je).call(this, t);
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
		let { serialized: r, headers: i } = m(F, this, je).call(this, t);
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
async function Ae(e, t, n) {
	let r = new AbortController();
	if (g(M, this).add(r), t.signal) {
		if (t.signal.aborted) throw g(M, this).delete(r), new DOMException("Aborted", "AbortError");
		t.signal.addEventListener("abort", () => r.abort());
	}
	let i;
	n > 0 && (i = setTimeout(() => r.abort(), n));
	let a = {
		url: g(k, this) + e,
		headers: {
			...g(j, this),
			...t.headers
		},
		...t,
		signal: r.signal
	};
	for (let e of g(A, this)) e.request && (a = await e.request(a));
	let { url: o, ...s } = a, c;
	try {
		c = await fetch(o, s);
	} catch (e) {
		if (clearTimeout(i), g(M, this).delete(r), n > 0 && e.name === "AbortError" && !t.signal?.aborted) {
			let e = /* @__PURE__ */ Error(`Request timeout after ${n}ms`);
			throw e.name = "TimeoutError", e;
		}
		for (let t of g(A, this)) t.requestError && await t.requestError(e, a);
		throw e;
	}
	for (let e of g(A, this)) e.response && (c = await e.response(c, a));
	if (!c.ok) {
		clearTimeout(i), g(M, this).delete(r);
		let e = new I(c.status, c.statusText, c);
		for (let t of g(A, this)) if (t.responseError) {
			let n = await t.responseError(e, a);
			if (n) return n;
		}
		throw e;
	}
	return clearTimeout(i), g(M, this).delete(r), c;
}
function je(e) {
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
var I = class extends Error {
	constructor(e, t, n) {
		super(`HTTP ${e}: ${t}`), this.name = "HttpError", this.status = e, this.response = n;
	}
}, Me = /* @__PURE__ */ new WeakMap(), L = /* @__PURE__ */ new WeakMap(), R = /* @__PURE__ */ new WeakMap(), z = /* @__PURE__ */ new WeakMap(), B = /* @__PURE__ */ new WeakMap(), V = /* @__PURE__ */ new WeakSet(), Ne = class extends EventTarget {
	constructor(e) {
		super(), C(this, V), p(this, Me, []), p(this, L, /* @__PURE__ */ new Map()), p(this, R, {
			onBefore: [],
			onSuccess: [],
			onError: []
		}), p(this, z, null), p(this, B, null), h(z, this, e), typeof window < "u" && window.addEventListener("popstate", () => m(V, this, Pe).call(this));
	}
	group(e, { resolve: t } = {}) {
		return g(L, this).set(e, {
			resolve: t,
			data: null,
			resolved: !1
		}), this;
	}
	route(e, t, { resolve: n, group: r } = {}) {
		let i = new URLPattern({ pathname: e });
		return g(Me, this).push({
			pattern: e,
			urlPattern: i,
			component: t,
			resolve: n,
			group: r
		}), this;
	}
	onBefore(e) {
		return g(R, this).onBefore.push(e), this;
	}
	onSuccess(e) {
		return g(R, this).onSuccess.push(e), this;
	}
	onError(e) {
		return g(R, this).onError.push(e), this;
	}
	navigate(e) {
		typeof history < "u" && history.pushState(null, "", e), m(V, this, Pe).call(this, e);
	}
	get current() {
		return g(B, this);
	}
	invalidateGroup(e) {
		let t = g(L, this).get(e);
		t && (t.resolved = !1, t.data = null);
	}
	start() {
		typeof location < "u" && m(V, this, Pe).call(this, location.pathname + location.search);
	}
};
async function Pe(e) {
	let t = e || (typeof location < "u" ? location.pathname : "/"), n = new URL(t, "http://localhost");
	for (let e of g(Me, this)) {
		let r = e.urlPattern.exec(n);
		if (!r) continue;
		let i = r.pathname.groups, a = g(B, this), o = {
			path: t,
			params: i,
			route: e
		};
		try {
			for (let e of g(R, this).onBefore) {
				let t = await e(a, o);
				if (t === !1) return;
				if (typeof t == "string") {
					this.navigate(t);
					return;
				}
			}
			let t = {};
			if (e.group) {
				let n = g(L, this).get(e.group);
				n && !n.resolved && (n.data = await n.resolve(i), n.resolved = !0), n && (t = { ...n.data });
			}
			if (e.resolve) {
				let n = await e.resolve(i);
				t = {
					...t,
					...n
				};
			}
			m(V, this, Fe).call(this, e.component, i, t), h(B, this, o);
			for (let e of g(R, this).onSuccess) await e(a, o, t);
			this.dispatchEvent(new CustomEvent("navigate", { detail: {
				from: a,
				to: o,
				data: t
			} }));
		} catch (e) {
			for (let t of g(R, this).onError) await t(e, a, o);
		}
		return;
	}
}
function Fe(e, t, n) {
	if (!g(z, this)) return;
	g(z, this).innerHTML !== void 0 && (g(z, this).innerHTML = "");
	let r = typeof document < "u" ? document.createElement(e) : {
		tagName: e,
		params: null,
		routeData: null
	};
	r.params = t, r.routeData = n, g(z, this).appendChild(r);
}
//#endregion
//#region src/router/links.js
function Ie(e, t) {
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
function Le(e, t = {}) {
	let { services: n = [], http: r, routes: i, outlet: a = "route-outlet" } = t, o = typeof e == "string" ? document.querySelector(e) : e;
	if (!o) throw Error(`bootstrap: root element "${e}" not found`);
	let s = new oe(), c = new ke(r || {});
	s.register(we, () => c);
	for (let [e, t] of n) s.register(e, t);
	se(o, s);
	let l = null;
	return i && (l = new Ne(o.querySelector(a) || o), s.register(Te, () => l), i(l), Ie(l, o), l.start()), {
		container: s,
		router: l,
		http: c
	};
}
//#endregion
//#region src/router/route-outlet.js
var Re = typeof HTMLElement < "u" ? HTMLElement : class {}, H = /* @__PURE__ */ new WeakMap(), ze = class extends Re {
	constructor() {
		super(), p(this, H, null);
	}
	get currentComponent() {
		return g(H, this);
	}
	mount(e) {
		this.clear(), h(H, this, e), this.appendChild(e);
	}
	clear() {
		g(H, this) && (g(H, this).remove?.(), h(H, this, null)), this.innerHTML !== void 0 && (this.innerHTML = "");
	}
};
typeof customElements < "u" && customElements.define("route-outlet", ze);
//#endregion
//#region src/forms/field.js
var U = /* @__PURE__ */ new WeakMap(), Be = /* @__PURE__ */ new WeakMap(), Ve = /* @__PURE__ */ new WeakMap(), W = /* @__PURE__ */ new WeakMap(), G = /* @__PURE__ */ new WeakMap(), K = /* @__PURE__ */ new WeakMap(), q = /* @__PURE__ */ new WeakMap(), J = /* @__PURE__ */ new WeakMap(), Y = /* @__PURE__ */ new WeakMap(), X = /* @__PURE__ */ new WeakMap(), Z = /* @__PURE__ */ new WeakSet(), He = class {
	constructor(e, t = {}) {
		C(this, Z), p(this, U, void 0), p(this, Be, void 0), p(this, Ve, void 0), p(this, W, void 0), p(this, G, void 0), p(this, K, void 0), p(this, q, void 0), p(this, J, void 0), p(this, Y, void 0), p(this, X, {
			viewValue: "",
			modelValue: void 0,
			valid: !0,
			dirty: !1,
			touched: !1,
			errors: {},
			pending: !1
		});
		let { parsers: n = [], formatters: r = [], validators: i = [], asyncValidators: a = [], onChange: o, debounce: s = 0 } = t;
		h(U, this, e), h(Be, this, n), h(Ve, this, r), h(W, this, i), h(G, this, a), h(K, this, o), h(q, this, s), e.addEventListener && (e.addEventListener("input", (e) => {
			g(q, this) > 0 ? (clearTimeout(g(J, this)), h(J, this, setTimeout(() => m(Z, this, Ue).call(this, e.target.value), g(q, this)))) : m(Z, this, Ue).call(this, e.target.value);
		}), e.addEventListener("blur", () => m(Z, this, qe).call(this)));
	}
	writeValue(e) {
		g(X, this).modelValue = e;
		let t = e;
		for (let e of g(Ve, this)) t = e(t);
		g(X, this).viewValue = t, g(U, this).value !== void 0 && (g(U, this).value = t ?? ""), m(Z, this, We).call(this, e), m(Z, this, Q).call(this);
	}
	get modelValue() {
		return g(X, this).modelValue;
	}
	get viewValue() {
		return g(X, this).viewValue;
	}
	get valid() {
		return g(X, this).valid;
	}
	get dirty() {
		return g(X, this).dirty;
	}
	get touched() {
		return g(X, this).touched;
	}
	get pending() {
		return g(X, this).pending;
	}
	get errors() {
		return { ...g(X, this).errors };
	}
	get snapshot() {
		return {
			...g(X, this),
			errors: { ...g(X, this).errors }
		};
	}
	markDirty() {
		g(X, this).dirty = !0, m(Z, this, Q).call(this);
	}
	markPristine() {
		g(X, this).dirty = !1, m(Z, this, Q).call(this);
	}
	markTouched() {
		m(Z, this, qe).call(this);
	}
	reset(e) {
		g(X, this).dirty = !1, g(X, this).touched = !1, g(X, this).errors = {}, this.writeValue(e);
	}
	destroy() {
		g(Y, this)?.abort(), clearTimeout(g(J, this));
	}
};
function Ue(e) {
	g(X, this).viewValue = e, g(X, this).dirty = !0;
	let t = e;
	for (let e of g(Be, this)) if (t = e(t), t === void 0) break;
	g(X, this).modelValue = t, m(Z, this, We).call(this, t), g(K, this) && g(K, this).call(this, t, this.snapshot), m(Z, this, Q).call(this);
}
function We(e) {
	if (g(X, this).errors = {}, Array.isArray(g(W, this))) for (let t of g(W, this)) {
		let n = t(e, g(X, this).viewValue);
		n && (g(X, this).errors[n] = !0);
	}
	else if (g(W, this) && typeof g(W, this) == "object") for (let [t, n] of Object.entries(g(W, this))) n(e, g(X, this).viewValue) || (g(X, this).errors[t] = !0);
	g(X, this).valid = Object.keys(g(X, this).errors).length === 0, g(X, this).valid && m(Z, this, Ge).call(this) && m(Z, this, Ke).call(this, e);
}
function Ge() {
	return Array.isArray(g(G, this)) ? g(G, this).length > 0 : g(G, this) && typeof g(G, this) == "object" ? Object.keys(g(G, this)).length > 0 : !1;
}
async function Ke(e) {
	g(Y, this)?.abort(), h(Y, this, new AbortController());
	let t = g(Y, this).signal;
	if (g(X, this).pending = !0, m(Z, this, Q).call(this), Array.isArray(g(G, this))) for (let n of g(G, this)) {
		let r = await n(e, t);
		if (t.aborted) return;
		r && (g(X, this).errors[r] = !0);
	}
	else if (g(G, this) && typeof g(G, this) == "object") for (let [n, r] of Object.entries(g(G, this))) {
		let i = await r(e, t);
		if (t.aborted) return;
		i || (g(X, this).errors[n] = !0);
	}
	g(X, this).pending = !1, g(X, this).valid = Object.keys(g(X, this).errors).length === 0, m(Z, this, Q).call(this), g(K, this) && g(K, this).call(this, g(X, this).modelValue, this.snapshot);
}
function qe() {
	g(X, this).touched = !0, m(Z, this, Q).call(this);
}
function Q() {
	let e = g(U, this).classList;
	e && (e.toggle("el-valid", g(X, this).valid), e.toggle("el-invalid", !g(X, this).valid), e.toggle("el-dirty", g(X, this).dirty), e.toggle("el-pristine", !g(X, this).dirty), e.toggle("el-touched", g(X, this).touched), e.toggle("el-untouched", !g(X, this).touched), e.toggle("el-pending", g(X, this).pending));
}
//#endregion
//#region src/forms/form-group.js
var $ = /* @__PURE__ */ new WeakMap(), Je = class {
	constructor(e) {
		p(this, $, /* @__PURE__ */ new Map()), e?.addEventListener && e.addEventListener("submit", (e) => {
			if (!this.valid) {
				e.preventDefault();
				for (let e of g($, this).values()) e.markTouched();
			}
		});
	}
	addField(e, t) {
		return g($, this).set(e, t), this;
	}
	removeField(e) {
		let t = g($, this).get(e);
		t && (t.destroy(), g($, this).delete(e));
	}
	field(e) {
		return g($, this).get(e);
	}
	get valid() {
		for (let e of g($, this).values()) if (!e.valid) return !1;
		return !0;
	}
	get dirty() {
		for (let e of g($, this).values()) if (e.dirty) return !0;
		return !1;
	}
	get touched() {
		for (let e of g($, this).values()) if (e.touched) return !0;
		return !1;
	}
	get pending() {
		for (let e of g($, this).values()) if (e.pending) return !0;
		return !1;
	}
	get errors() {
		let e = {};
		for (let [t, n] of g($, this)) {
			let r = n.errors;
			Object.keys(r).length > 0 && (e[t] = r);
		}
		return e;
	}
	reset(e = {}) {
		for (let [t, n] of g($, this)) n.reset(e[t]);
	}
	destroy() {
		for (let e of g($, this).values()) e.destroy();
		g($, this).clear();
	}
}, Ye = /* @__PURE__ */ t({
	lowercase: () => Ze,
	maxLength: () => rt,
	stripNonDigits: () => nt,
	toBoolean: () => tt,
	toDate: () => et,
	toNumber: () => $e,
	trim: () => Xe,
	uppercase: () => Qe
}), Xe = (e) => e?.trim(), Ze = (e) => e?.toLowerCase(), Qe = (e) => e?.toUpperCase(), $e = (e) => e === "" ? null : Number(e), et = (e) => e ? new Date(e) : null, tt = (e) => e === "true" || e === "1", nt = (e) => e?.replace(/\D/g, ""), rt = (e) => (t) => t?.slice(0, e), it = /* @__PURE__ */ t({
	currency: () => ct,
	date: () => ot,
	mask: () => st,
	percentage: () => lt,
	phone: () => at
}), at = (e) => {
	if (!e) return "";
	let t = String(e).replace(/\D/g, "");
	return t.length === 10 ? `(${t.slice(0, 3)}) ${t.slice(3, 6)}-${t.slice(6, 10)}` : e;
}, ot = (e) => {
	if (!e) return "";
	let t = e instanceof Date ? e : new Date(e);
	return isNaN(t.getTime()) ? "" : t.toISOString().split("T")[0];
}, st = (e = 4, t = "•") => (n) => {
	if (!n) return "";
	let r = String(n);
	return r.length <= e ? r : t.repeat(r.length - e) + r.slice(-e);
}, ct = (e = 2, t = void 0) => (n) => n == null ? "" : new Intl.NumberFormat(t, {
	minimumFractionDigits: e,
	maximumFractionDigits: e
}).format(Number(n)), lt = (e = 0) => (t) => t == null ? "" : (Number(t) * 100).toFixed(e), ut = /* @__PURE__ */ t({
	email: () => _t,
	max: () => gt,
	maxLength: () => pt,
	min: () => ht,
	minLength: () => ft,
	pattern: () => mt,
	required: () => dt
}), dt = (e) => !e && e !== 0 ? "required" : null, ft = (e) => (t) => t?.length < e ? "minLength" : null, pt = (e) => (t) => t?.length > e ? "maxLength" : null, mt = (e, t = "pattern") => (n) => n && !e.test(n) ? t : null, ht = (e) => (t) => t != null && t < e ? "min" : null, gt = (e) => (t) => t != null && t > e ? "max" : null, _t = (e) => e ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? null : "email" : null;
//#endregion
//#region src/animate/animate.js
function vt(e, t, n = {}) {
	return e.animate(t, {
		duration: 300,
		easing: "ease-in-out",
		fill: "forwards",
		...n
	});
}
function yt(e, t, n = {}) {
	let r = e.animate(t, {
		duration: 300,
		easing: "ease-in-out",
		fill: "forwards",
		...n
	});
	return r.onfinish = () => e.remove(), r;
}
function bt(e, t, { delay: n = 50, ...r } = {}) {
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
var xt = {
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
function St(e, t = {}) {
	let { allowedTags: n = /* @__PURE__ */ "p.br.b.i.em.strong.a.ul.ol.li.h1.h2.h3.h4.h5.h6.blockquote.code.pre.span.div.img.table.thead.tbody.tr.td.th".split("."), allowedAttrs: r = [
		"href",
		"src",
		"alt",
		"title",
		"class",
		"id",
		"width",
		"height"
	] } = t, i = new Set(n.map((e) => e.toLowerCase())), a = new Set(r.map((e) => e.toLowerCase())), o = Ct(e);
	return o ? (Tt(o.body, i, a), o.body.innerHTML) : "";
}
function Ct(e) {
	return typeof DOMParser > "u" ? wt(e) : new DOMParser().parseFromString(e, "text/html");
}
function wt(e) {
	return { body: {
		innerHTML: e,
		get childNodes() {
			return [];
		}
	} };
}
function Tt(e, t, n) {
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
		Tt(i, t, n);
	}
	for (let t of r) e.removeChild(t);
}
function Et(e) {
	return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}
//#endregion
//#region src/filters/intl.js
function Dt(e, t = "USD", n = void 0) {
	return new Intl.NumberFormat(n, {
		style: "currency",
		currency: t
	}).format(e);
}
function Ot(e, t = {}, n = void 0) {
	return new Intl.NumberFormat(n, t).format(e);
}
function kt(e, t = void 0) {
	return new Intl.NumberFormat(t, { style: "percent" }).format(e);
}
function At(e, t = "medium", n = void 0) {
	let r = {
		short: { dateStyle: "short" },
		medium: { dateStyle: "medium" },
		long: { dateStyle: "long" },
		full: { dateStyle: "full" }
	};
	return new Intl.DateTimeFormat(n, r[t] || r.medium).format(new Date(e));
}
function jt(e, t = void 0) {
	let n = Date.now() - new Date(e).getTime(), r = Math.floor(n / 1e3), i = Math.floor(r / 60), a = Math.floor(i / 60), o = Math.floor(a / 24), s = new Intl.RelativeTimeFormat(t, { numeric: "auto" });
	return o > 0 ? s.format(-o, "day") : a > 0 ? s.format(-a, "hour") : i > 0 ? s.format(-i, "minute") : s.format(-r, "second");
}
function Mt(e, t = "conjunction", n = void 0) {
	return new Intl.ListFormat(n, {
		style: "long",
		type: t
	}).format(e);
}
function Nt(e, t, n = void 0) {
	return (t[new Intl.PluralRules(n).select(e)] || t.other || "").replace("#", String(e));
}
//#endregion
export { De as AuthToken, oe as ElContainer, pe as ElElement, He as ElField, Je as ElFormGroup, ke as ElHttp, ue as ElProvider, Ne as ElRouter, I as HttpError, we as HttpToken, ze as RouteOutlet, Te as RouterToken, Ee as StorageToken, vt as animateIn, yt as animateOut, Le as bootstrap, r as computed, Et as escapeHTML, ne as flushUpdates, Dt as formatCurrency, At as formatDate, Mt as formatList, Ot as formatNumber, kt as formatPercent, Nt as formatPlural, jt as formatRelative, it as formatters, Ie as interceptLinks, l as isReactive, Ye as parsers, re as pendingCount, xt as presets, se as provideContainer, s as reactive, ce as resolveContainer, St as sanitizeHTML, f as scheduleUpdate, bt as stagger, c as toRaw, ut as validators };

//# sourceMappingURL=index.js.map