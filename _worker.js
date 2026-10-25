//#region lib/catalog.ts
function e(e) {
	try {
		let t = new URL(String(e));
		return t.protocol === "https:" && !t.username && !t.password ? t.href : "";
	} catch {
		return "";
	}
}
function t(t) {
	for (let n of String(t || "").split("$$$")) {
		let t = /* @__PURE__ */ new Set(), r = n.split("#").map((t, n) => {
			let r = t.indexOf("$");
			return {
				name: r < 0 ? `第 ${n + 1} 集` : t.slice(0, r),
				url: e(r < 0 ? t : t.slice(r + 1))
			};
		}).filter((e) => !e.url || !/\.(m3u8|mp4|webm|m4v|mov)(?:[?#]|$)/i.test(e.url) || t.has(e.url) ? !1 : (t.add(e.url), !0));
		if (r.length) return r;
	}
	return [];
}
function n(e) {
	return String(e || "").replace(/<[^>]*>/g, " ").replace(/&(?:amp|quot|apos|lt|gt|nbsp);/g, (e) => ({
		"&amp;": "&",
		"&quot;": "\"",
		"&apos;": "'",
		"&lt;": "<",
		"&gt;": ">",
		"&nbsp;": " "
	})[e] || e).replace(/&#(x[0-9a-f]+|\d+);/gi, (e, t) => {
		let n = t[0].toLowerCase() === "x" ? parseInt(t.slice(1), 16) : Number(t);
		return n > 0 && n <= 1114111 ? String.fromCodePoint(n) : "";
	}).trim();
}
function r(r, i) {
	return (r.list || []).slice(0, 500).map((r) => ({
		id: `${i.id}:${r.vod_id}`,
		title: n(r.vod_name) || "未命名",
		original: "",
		year: String(r.vod_year || ""),
		category: n(r.type_name) || "影片",
		description: n(r.vod_content || r.vod_blurb).slice(0, 1e3),
		image: e(r.vod_pic),
		source: i.name,
		episodes: t(r.vod_play_url),
		sourceUrl: i.url,
		sourceFormat: i.format,
		remoteId: String(r.vod_id || ""),
		updatedAt: String(r.vod_time || ""),
		remarks: n(r.vod_remarks)
	}));
}
//#endregion
//#region lib/catalog-formats.ts
var i = (e) => [
	"auto",
	"cms-json",
	"cms-xml",
	"json-feed",
	"m3u"
].includes(String(e)), a = (e, t) => {
	let r = e.match(RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${t}>`, "i"));
	return r ? n(r[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")) : "";
};
function o(e) {
	if (/<!DOCTYPE|<!ENTITY/i.test(e)) throw Error("XML 包含不支持的实体声明");
	if (!/<rss[\s>]|<list[\s>]/i.test(e)) throw Error("不是兼容的苹果 CMS XML");
	return {
		list: Array.from(e.matchAll(/<video(?:\s[^>]*)?>([\s\S]*?)<\/video>/gi)).slice(0, 500).map(([, e]) => ({
			vod_id: a(e, "id"),
			vod_name: a(e, "name"),
			type_name: a(e, "type"),
			vod_year: a(e, "year"),
			vod_pic: a(e, "pic"),
			vod_content: a(e, "des"),
			vod_time: a(e, "last"),
			vod_remarks: a(e, "note"),
			vod_play_url: Array.from(e.matchAll(/<dd(?:\s[^>]*)?>([\s\S]*?)<\/dd>/gi)).map(([, e]) => n(e.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"))).join("$$$")
		})),
		class: Array.from((e.match(/<class[^>]*>([\s\S]*?)<\/class>/i)?.[1] || "").matchAll(/<ty\b([^>]*)>([\s\S]*?)<\/ty>/gi)).map(([, e, t]) => ({
			type_id: e.match(/\bid=["'](\d+)["']/)?.[1] || "",
			type_name: n(t),
			type_pid: e.match(/\bpid=["'](\d+)["']/)?.[1]
		})).filter((e) => e.type_id),
		pagecount: Math.min(1e4, Number(e.match(/\bpagecount=["'](\d+)["']/i)?.[1]) || 1),
		format: "cms-xml"
	};
}
function s(t) {
	let r = t.replace(/^\uFEFF/, "").split(/\r?\n/);
	if (r[0]?.trim() !== "#EXTM3U") throw Error("播放列表必须以 #EXTM3U 开始");
	if (t.includes("#EXT-X-TARGETDURATION") || t.includes("#EXT-X-STREAM-INF")) throw Error("这是单部视频的 M3U8，请使用「链接播放」");
	let i = [], a = "", o = "", s = "";
	for (let t of r) {
		let r = t.trim();
		if (r.startsWith("#EXTINF:")) a = n(r.replace(/^#EXTINF:[^,]*,/, "")), o = n(r.match(/group-title="([^"]*)"/)?.[1]), s = e(r.match(/tvg-logo="([^"]*)"/)?.[1]);
		else if (r && !r.startsWith("#")) {
			let t = e(r);
			if (t && i.push({
				vod_id: String(i.length + 1),
				vod_name: a || `视频 ${i.length + 1}`,
				type_name: o || "播放列表",
				vod_pic: s,
				vod_play_url: `播放$${t}`,
				vod_remarks: "播放列表"
			}), a = o = s = "", i.length >= 500) break;
		}
	}
	return {
		list: i,
		class: [],
		pagecount: 1,
		format: "m3u"
	};
}
function c(t, r = "auto") {
	let i = t.trim();
	if (r === "cms-xml" || r === "auto" && i.startsWith("<")) return o(i);
	if (r === "m3u" || r === "auto" && i.replace(/^\uFEFF/, "").startsWith("#EXTM3U")) return s(i);
	let a;
	try {
		a = JSON.parse(i);
	} catch {
		throw Error("未识别为 JSON、CMS XML 或 M3U，请检查接口类型");
	}
	if (!a || typeof a != "object") throw Error("片库数据格式无效");
	if (r === "cms-json" || r === "auto" && "list" in a) {
		if (a.list === null && (a.list = []), !Array.isArray(a.list)) throw Error("接口缺少 list 数组");
		return {
			list: a.list.slice(0, 500),
			class: Array.isArray(a.class) ? a.class.filter((e) => e && typeof e.type_name == "string" && /^\d+$/.test(String(e.type_id))).slice(0, 150) : [],
			pagecount: Math.min(1e4, Math.max(1, Number(a.pagecount) || 1)),
			format: "cms-json"
		};
	}
	let c = Array.isArray(a) ? a : a.items;
	if (!Array.isArray(c)) throw Error("自定义片库需要 items 数组");
	return {
		list: c.slice(0, 500).filter((e) => e && typeof e == "object" && e.title).map((t, r) => ({
			vod_id: String(t.id ?? r + 1),
			vod_name: t.title,
			vod_year: t.year,
			type_name: t.category,
			vod_content: t.description,
			vod_pic: t.image,
			vod_time: t.updatedAt,
			vod_remarks: t.remarks,
			vod_play_url: (Array.isArray(t.episodes) ? t.episodes : [{
				name: "正片",
				url: t.url
			}]).filter((t) => t && e(t.url)).map((t, r) => `${n(t.name) || `第 ${r + 1} 集`}$${e(t.url)}`).join("#")
		})),
		class: [],
		pagecount: 1,
		format: "json-feed"
	};
}
//#endregion
//#region lib/source-fetch.ts
function l(e) {
	if (e.includes(":")) return /^2[0-9a-f]{3}:/i.test(e) && !/^2001:(db8|0*:)/i.test(e);
	let t = e.split(".").map(Number);
	if (t.length !== 4 || t.some((e) => !Number.isInteger(e) || e < 0 || e > 255)) return !1;
	let [n, r, i] = t;
	return !(n === 0 || n === 10 || n === 127 || n >= 224 || n === 169 && r === 254 || n === 172 && r >= 16 && r <= 31 || n === 192 && (r === 168 || r === 0 || r === 2) || n === 100 && r >= 64 && r <= 127 || n === 198 && (r === 18 || r === 19 || r === 51 && i === 100) || n === 203 && r === 0 && i === 113);
}
function u(e) {
	let t = new URL(e);
	if (t.protocol !== "https:" || t.username || t.password || t.port && t.port !== "443") throw Error("仅支持公开的 HTTPS 接口（443 端口）");
	let n = t.hostname.toLowerCase();
	if (!/^[a-z0-9.-]+$/.test(n) || !n.includes(".") || /^\d+(\.\d+){3}$/.test(n) || n.endsWith(".") || [
		".localhost",
		".local",
		".internal",
		".lan",
		".home",
		".test",
		".invalid",
		".example"
	].some((e) => n.endsWith(e))) throw Error("不支持本地、内网或 IP 地址接口");
	return t;
}
async function d(e, t) {
	let n = (await Promise.all(["A", "AAAA"].map(async (n) => {
		let r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(e)}&type=${n}`, {
			headers: { accept: "application/dns-json" },
			signal: t
		});
		if (!r.ok) throw Error("无法验证源站地址");
		return ((await r.json()).Answer || []).filter((e) => e.type === 1 || e.type === 28).map((e) => e.data);
	}))).flat();
	if (!n.length || n.some((e) => !l(e))) throw Error("源站地址无法解析，或指向受限制的网络");
}
var f = /* @__PURE__ */ new Map();
async function p(e, t, n = "*/*") {
	let r = u(e);
	for (let e = 0; e < 4; e++) {
		if ((f.get(r.hostname) || 0) < Date.now()) {
			try {
				await d(r.hostname, t);
			} catch (e) {
				throw Error(`源站 DNS 校验失败：${e instanceof Error ? e.message : "网络错误"}`);
			}
			f.size > 128 && f.clear(), f.set(r.hostname, Date.now() + 6e4);
		}
		let e;
		try {
			e = await fetch(r, {
				signal: t,
				redirect: "manual",
				headers: {
					Accept: n,
					"User-Agent": "KEN-TV/1.0"
				}
			});
		} catch (e) {
			throw Error(`源站请求失败：${e instanceof Error ? e.message : "网络错误"}`);
		}
		if (e.status >= 300 && e.status < 400) {
			let t = e.headers.get("location");
			if (!t) throw Error("源站重定向无效");
			r = u(new URL(t, r).href);
			continue;
		}
		if (!e.ok) throw Error(`源站返回 ${e.status}，请检查接口地址`);
		return {
			response: e,
			url: r.href
		};
	}
	throw Error("源站重定向次数过多");
}
async function m(e, t) {
	let n = e.body?.getReader();
	if (!n) throw Error("接口返回空内容");
	let r = 0, i = [];
	try {
		for (;;) {
			let { done: e, value: a } = await n.read();
			if (e) break;
			if (r += a.byteLength, r > t) throw Error("返回内容超过大小限制");
			i.push(a);
		}
	} catch (e) {
		throw await n.cancel(), e;
	}
	let a = new Uint8Array(r), o = 0;
	for (let e of i) a.set(e, o), o += e.byteLength;
	return a;
}
async function h(e, t, n = {}) {
	let r = u(e), i = n.format || "auto", a = i === "json-feed" || i === "m3u" || i === "auto" && /\.(json|m3u|m3u8)(?:$)/i.test(r.pathname);
	if (!a) {
		for (let e of [
			"ac",
			"wd",
			"t",
			"h",
			"pg",
			"ids"
		]) r.searchParams.delete(e);
		r.searchParams.set("ac", n.action || "videolist"), i === "cms-xml" && r.searchParams.set("at", "xml"), i === "cms-json" && r.searchParams.set("at", "json"), n.type && r.searchParams.set("t", n.type), n.hours && r.searchParams.set("h", String(Math.min(168, Math.max(1, n.hours)))), n.page && r.searchParams.set("pg", String(Math.min(20, Math.max(1, n.page)))), n.id && r.searchParams.set("ids", n.id), t ? r.searchParams.set("wd", t.slice(0, 120)) : r.searchParams.delete("wd");
	}
	let { response: o } = await p(r.href, AbortSignal.timeout(14e3), "application/json, application/xml, text/plain"), s = c(new TextDecoder().decode(await m(o, 3e6)), i);
	if (a || s.format === "m3u" || s.format === "json-feed") {
		let e = t.normalize("NFKC").toLowerCase();
		s.list = s.list.filter((t) => (!e || String(t.vod_name).normalize("NFKC").toLowerCase().includes(e)) && (!n.id || String(t.vod_id) === n.id));
	}
	return s;
}
//#endregion
//#region api/catalog.ts
async function g(e) {
	let t = new URL(e.url), n = t.searchParams.get("url") || "", r = t.searchParams.get("q") || "", a = t.searchParams.get("id") || "", o = t.searchParams.get("format") || "auto";
	if (!i(o)) return Response.json({ error: "接口类型无效" }, { status: 400 });
	if (a && !/^\d{1,20}$/.test(a)) return Response.json({ error: "影片编号无效" }, { status: 400 });
	if (n.length > 2048) return Response.json({ error: "接口地址过长" }, { status: 400 });
	try {
		return Response.json(await h(n, r, {
			id: a || void 0,
			format: o
		}), { headers: {
			"Cache-Control": "no-store",
			"X-Content-Type-Options": "nosniff"
		} });
	} catch (e) {
		return Response.json({ error: e instanceof Error ? e.message : "视频源暂时无法连接" }, {
			status: 400,
			headers: { "Cache-Control": "no-store" }
		});
	}
}
//#endregion
//#region lib/online.ts
var _ = [
	{
		id: "libretv-ruyi",
		name: "如意资源",
		url: "https://cj.rycjapi.com/api.php/provide/vod",
		enabled: !0
	},
	{
		id: "libretv-wujin",
		name: "无尽资源",
		url: "https://api.wujinapi.me/api.php/provide/vod",
		enabled: !0
	},
	{
		id: "ken-360",
		name: "360资源",
		url: "https://360zy.com/api.php/provide/vod",
		enabled: !0,
		format: "cms-json"
	},
	{
		id: "ken-jisu",
		name: "极速资源",
		url: "https://jszyapi.com/api.php/provide/vod",
		enabled: !0,
		format: "cms-json"
	},
	{
		id: "ken-hongniu",
		name: "红牛资源",
		url: "https://www.hongniuzy2.com/api.php/provide/vod/",
		enabled: !0,
		format: "cms-json"
	},
	{
		id: "ken-baofeng",
		name: "暴风资源",
		url: "https://bfzyapi.com/api.php/provide/vod",
		enabled: !0,
		format: "cms-json"
	},
	{
		id: "ken-liangzi",
		name: "量子资源",
		url: "https://cj.lziapi.com/api.php/provide/vod/",
		enabled: !0,
		format: "cms-json"
	},
	{
		id: "ken-modu",
		name: "魔都资源",
		url: "https://www.mdzyapi.com/api.php/provide/vod",
		enabled: !0,
		format: "cms-json"
	},
	{
		id: "ken-zuida",
		name: "最大资源",
		url: "https://api.zuidapi.com/api.php/provide/vod",
		enabled: !0,
		format: "cms-json"
	},
	{
		id: "ken-baidu",
		name: "百度云资源",
		url: "https://api.apibdzy.com/api.php/provide/vod",
		enabled: !0,
		format: "cms-json"
	},
	{
		id: "ken-huya",
		name: "虎牙资源",
		url: "https://www.huyaapi.com/api.php/provide/vod/",
		enabled: !0,
		format: "cms-json"
	},
	{
		id: "ken-feifan",
		name: "非凡影视",
		url: "https://ffzy5.tv/api.php/provide/vod",
		enabled: !0,
		format: "cms-json"
	}
], v = "Asia/Kuala_Lumpur";
function y(e) {
	if (typeof e == "number" || typeof e == "string" && /^\d{10,13}$/.test(e)) {
		let t = Number(e);
		return t < 0xe8d4a51000 ? t * 1e3 : t;
	}
	let t = String(e || "").trim();
	if (!t) return 0;
	let n = t.replace(" ", "T"), r = Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(n) ? n : n + "+08:00");
	return Number.isFinite(r) ? r : 0;
}
function b(e = Date.now()) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: v,
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).format(e);
}
function x(e) {
	return /动漫|动画|番剧|漫剧|anime|animation|cartoon/i.test(e.category);
}
function S(e, t = Date.now()) {
	let n = y(e.updatedAt);
	return x(e) && n > 0 && n <= t + 3e5 && b(n) === b(t);
}
function C(e) {
	return e.title.trim().normalize("NFKC").replace(/\s+/g, "").toLowerCase() + "|" + e.year;
}
function w(e) {
	let t = /* @__PURE__ */ new Set();
	return e.filter((e) => {
		let n = C(e);
		return t.has(n) ? !1 : (t.add(n), !0);
	});
}
//#endregion
//#region api/discover.ts
var T = /* @__PURE__ */ new Map(), E = /* @__PURE__ */ new Map();
async function D(e) {
	let t = await h(e.url, "", {
		hours: 48,
		format: e.format
	}), n = t.class;
	if (!n.length && (t.format === "cms-json" || t.format === "cms-xml")) {
		let t = E.get(e.url);
		if (t && t.until > Date.now()) n = t.classes;
		else try {
			n = (await h(e.url, "", {
				action: "list",
				format: e.format
			})).class, E.set(e.url, {
				until: Date.now() + 36e5,
				classes: n
			});
		} catch {
			n = [];
		}
	}
	let i = n.filter((e) => /动漫|动画|番剧/i.test(e.type_name)), a = i.filter((e) => !i.some((t) => String(t.type_pid) === String(e.type_id))), o = a.filter((e) => !/^动漫片?$/.test(e.type_name)), s = (o.length ? o : a).sort((e, t) => {
		let n = (e) => /日韩|日本/.test(e) ? 0 : /国产/.test(e) ? 1 : /欧美/.test(e) ? 2 : 3;
		return n(e.type_name) - n(t.type_name);
	}).slice(0, 3), c = await Promise.allSettled(s.map((t) => h(e.url, "", {
		type: String(t.type_id),
		hours: 48,
		format: e.format
	}))), l = c.flatMap((t) => t.status === "fulfilled" ? r(t.value, e).filter(x) : []), u = r(t, e);
	return {
		recent: u,
		all: [...u, ...l],
		partial: c.filter((e) => e.status === "rejected").length
	};
}
async function O(e) {
	let t = new URL(e.url), n;
	try {
		let e = t.searchParams.get("sources");
		if (e && e.length > 7e3 || (n = e ? JSON.parse(e) : _.slice(0, 3), !Array.isArray(n) || n.length > 4 || n.some((e) => !e || typeof e.id != "string" || typeof e.name != "string" || typeof e.url != "string" || e.url.length > 2048 || e.format && !i(e.format)))) throw Error();
		n = n.filter((e) => e.enabled !== !1).slice(0, 3);
	} catch {
		return Response.json({ error: "视频源列表无效" }, { status: 400 });
	}
	let r = b() + JSON.stringify(n.map((e) => [
		e.id,
		e.url,
		e.format
	])), a = T.get(r);
	if (a && a.until > Date.now() && t.searchParams.get("fresh") !== "1") return Response.json(a.value, { headers: { "Cache-Control": "no-store" } });
	let o = await Promise.allSettled(n.map(D)), s = [], c = [], l = o.map((e, t) => e.status === "fulfilled" ? (s.push(...e.value.recent), c.push(...e.value.all), {
		id: n[t].id,
		name: n[t].name,
		ok: !0,
		count: e.value.recent.length,
		...e.value.partial ? { error: `${e.value.partial} 个动漫分类暂未返回` } : {}
	}) : {
		id: n[t].id,
		name: n[t].name,
		ok: !1,
		count: 0,
		error: e.reason instanceof Error ? e.reason.message : "暂时无法连接"
	}), u = (e, t) => y(t.updatedAt) - y(e.updatedAt), d = {
		items: w(s.sort(u)).slice(0, 60),
		today: w(c.filter((e) => S(e)).sort(u)).slice(0, 80),
		checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
		date: b(),
		timezone: v,
		sources: l
	};
	return l.some((e) => e.ok) && (T.size > 30 && T.clear(), T.set(r, {
		until: Date.now() + 24e4,
		value: d
	})), Response.json(d, { headers: { "Cache-Control": "no-store" } });
}
//#endregion
//#region api/media.ts
async function k(e) {
	let t = new URL(e.url), n = t.searchParams.get("url") || "", r = t.searchParams.get("kind") || "file";
	if (n.length > 4096 || ![
		"file",
		"manifest",
		"segment"
	].includes(r)) return Response.json({ error: "下载参数无效" }, { status: 400 });
	try {
		if (r === "file" && !/\.(mp4|webm|mov|m4v|ts)(?:[?#]|$)/i.test(n)) throw Error("普通下载需要 MP4、WebM、MOV 或 TS 视频直链");
		let { response: i, url: a } = await p(n, AbortSignal.any([e.signal, AbortSignal.timeout(r === "file" ? 6e5 : 45e3)])), o = i.headers.get("content-type") || "application/octet-stream";
		if (/text\/html|application\/(?:json|xml|xhtml)/i.test(o)) throw Error("源站返回网页，无法下载视频");
		let s = r === "manifest" ? 2e6 : r === "segment" ? 32e6 : 2e9;
		if (Number(i.headers.get("content-length")) > s) throw await i.body?.cancel(), Error("视频超过本次下载大小限制");
		let c = i.body?.getReader();
		if (!c) throw Error("视频内容为空");
		let l = 0, u = new ReadableStream({
			async pull(e) {
				try {
					let t = await c.read();
					if (t.done) {
						e.close();
						return;
					}
					if (l += t.value.byteLength, l > s) throw Error("视频超过本次下载大小限制");
					e.enqueue(t.value);
				} catch (t) {
					await c.cancel(), e.error(t);
				}
			},
			cancel(e) {
				return c.cancel(e);
			}
		}), d = new Headers({
			"Content-Type": r === "file" ? "application/octet-stream" : o,
			"Cache-Control": "no-store",
			"X-Content-Type-Options": "nosniff",
			"X-Media-URL": a
		});
		if (r === "file") {
			let e = (t.searchParams.get("name") || "KEN-TV-video").replace(/[\r\n<>:"/\\|?*]/g, "_").slice(0, 150);
			d.set("Content-Disposition", `attachment; filename="KEN-TV-video"; filename*=UTF-8''${encodeURIComponent(e)}`);
		}
		return new Response(u, { headers: d });
	} catch (e) {
		return Response.json({ error: e instanceof Error ? e.message : "下载连接失败" }, {
			status: 400,
			headers: { "Cache-Control": "no-store" }
		});
	}
}
async function A(e) {
	let t = await k(e);
	return await t.body?.cancel(), new Response(null, {
		status: t.status,
		headers: t.headers
	});
}
//#endregion
//#region auth.ts
var j = new TextEncoder(), M = "__Host-ken_session", N = (e, t) => `${M}=${e}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${t}`;
async function P(e) {
	return crypto.subtle.importKey("raw", j.encode("KEN-TV Pages session v1:" + e), {
		name: "HMAC",
		hash: "SHA-256"
	}, !1, ["sign", "verify"]);
}
var F = (e) => Array.from(new Uint8Array(e), (e) => e.toString(16).padStart(2, "0")).join("");
async function I(e, t) {
	if (!t.PASSWORD) return !0;
	let [n, r, i] = (e.headers.get("cookie")?.split(";").map((e) => e.trim()).find((e) => e.startsWith(M + "="))?.slice(19) || "").split(".");
	return !/^\d{10}$/.test(n || "") || !/^[a-f0-9]{32}$/.test(r || "") || !/^[a-f0-9]{64}$/.test(i || "") || Number(n) <= Date.now() / 1e3 ? !1 : crypto.subtle.verify("HMAC", await P(t.PASSWORD), Uint8Array.from(i.match(/../g), (e) => parseInt(e, 16)), j.encode(`${n}.${r}`));
}
function L(e = !1) {
	return new Response(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KEN TV · 访问密码</title><style>html{font-family:system-ui,"Microsoft YaHei",sans-serif;background:#faf6fc;color:#4c3658}body{margin:0;min-height:100dvh;display:grid;place-items:center}.card{background:white;border:1px solid #eadfed;border-radius:20px;box-shadow:0 15px 60px #92739b12;padding:38px;width:min(330px,calc(100vw - 100px))}h1{font-size:28px;margin:0 0 12px;color:#8d60a1}p{font-size:13px;line-height:1.8;color:#8c7895}label{display:block;font-size:13px;margin:25px 0 8px}input{box-sizing:border-box;width:100%;padding:13px;font:inherit;border:1px solid #d9c8e2;border-radius:9px}button{width:100%;padding:13px;border:0;border-radius:9px;background:#9671a9;color:white;font-size:14px;margin-top:18px;cursor:pointer}.error{color:#a55466}</style></head><body><main class="card"><h1>KEN TV</h1><p>欢迎回到你的私人放映室。</p>${e ? "<p class=\"error\" role=\"alert\">密码不正确，请重试。</p>" : ""}<form action="/__ken/login" method="post"><label for="password">网站访问密码</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="1024"><button type="submit">进入放映室</button></form><p>使用这个网站原来设置的访问密码。</p></main></body></html>`, {
		status: e ? 401 : 200,
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "no-store",
			"X-Content-Type-Options": "nosniff",
			"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
		}
	});
}
var R = /* @__PURE__ */ new Map();
async function z(e, t) {
	if (e.method !== "POST") return L();
	if (e.headers.get("origin") !== new URL(e.url).origin) return new Response("请求来源无效", { status: 403 });
	if (!t.PASSWORD) return Response.redirect(new URL("/", e.url).href, 303);
	let n = e.headers.get("cf-connecting-ip") || "unknown", r = R.get(n);
	if (r && r.until > Date.now() && r.count >= 10) return new Response("尝试次数过多，请稍后再试。", {
		status: 429,
		headers: {
			"Retry-After": "300",
			"Cache-Control": "no-store"
		}
	});
	if (!e.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded") || Number(e.headers.get("content-length")) > 4096) return new Response("请求无效", { status: 400 });
	let i = await e.text();
	if (i.length > 4096) return new Response("请求过大", { status: 413 });
	let a = new URLSearchParams(i).get("password") || "", [o, s] = await Promise.all([crypto.subtle.digest("SHA-256", j.encode(a)), crypto.subtle.digest("SHA-256", j.encode(t.PASSWORD))]), c = new Uint8Array(o), l = new Uint8Array(s), u = 0;
	for (let e = 0; e < c.length; e++) u |= c[e] ^ l[e];
	if (u) return R.size > 1e3 && R.clear(), R.set(n, {
		count: r && r.until > Date.now() ? r.count + 1 : 1,
		until: Date.now() + 3e5
	}), L(!0);
	R.delete(n);
	let d = F(crypto.getRandomValues(new Uint8Array(16)).buffer), f = `${Math.floor(Date.now() / 1e3) + 2592e3}.${d}`, p = F(await crypto.subtle.sign("HMAC", await P(t.PASSWORD), j.encode(f)));
	return new Response(null, {
		status: 303,
		headers: {
			Location: "/",
			"Set-Cookie": N(`${f}.${p}`, 2592e3),
			"Cache-Control": "no-store"
		}
	});
}
function B() {
	return new Response(null, {
		status: 303,
		headers: {
			Location: "/",
			"Set-Cookie": N("", 0),
			"Cache-Control": "no-store"
		}
	});
}
//#endregion
//#region worker.ts
var V = (e) => e.startsWith("/assets/") || e.startsWith("/posters/") || [
	"/favicon.svg",
	"/icon-192.png",
	"/icon-512.png",
	"/poster.svg",
	"/manifest.webmanifest",
	"/sw.js",
	"/service-worker.js",
	"/robots.txt"
].includes(e), H = { async fetch(e, t) {
	let n = new URL(e.url).pathname;
	if (n === "/api/health") return Response.json({
		app: "KEN TV",
		platform: "Cloudflare Pages",
		version: "6.0.0",
		sources: _.length,
		passwordProtected: !!t.PASSWORD
	}, { headers: { "Cache-Control": "no-store" } });
	if (n === "/__ken/login") return z(e, t);
	if (n === "/__ken/logout") return B();
	if (!V(n) && !await I(e, t)) return n.startsWith("/api/") ? Response.json({ error: "请先输入网站访问密码" }, {
		status: 401,
		headers: { "Cache-Control": "no-store" }
	}) : L();
	if (n.startsWith("/api/")) {
		if (!["GET", "HEAD"].includes(e.method)) return Response.json({ error: "请求方式不支持" }, {
			status: 405,
			headers: { Allow: "GET, HEAD" }
		});
		let t = n === "/api/catalog" ? g : n === "/api/discover" ? O : n === "/api/media" ? e.method === "HEAD" ? A : k : null;
		if (!t) return Response.json({ error: "接口不存在" }, { status: 404 });
		let r = await t(e);
		return e.method === "HEAD" ? (await r.body?.cancel(), new Response(null, {
			status: r.status,
			headers: r.headers
		})) : r;
	}
	if (!["GET", "HEAD"].includes(e.method)) return new Response("Method not allowed", {
		status: 405,
		headers: { Allow: "GET, HEAD" }
	});
	let r = await t.ASSETS.fetch(e), i = new Headers(r.headers);
	return (n === "/" || n === "/index.html") && i.set("Cache-Control", "no-cache"), i.set("X-Content-Type-Options", "nosniff"), new Response(r.body, {
		status: r.status,
		statusText: r.statusText,
		headers: i
	});
} };
//#endregion
export { H as default };
