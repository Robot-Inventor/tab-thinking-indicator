(function() {

// src/shared.ts
	const EVENT_NAME = "tab-thinking-indicator:generating";

// node_modules/thinking-orbs/dist/index-B8WsUNf5.js
	function lerp(a, b, f) {
		return a + (b - a) * f;
	}
	function frac(x) {
		return x - Math.floor(x);
	}
	function vnoise(x, y) {
		const xi = Math.floor(x);
		const yi = Math.floor(y);
		let fx = x - xi;
		let fy = y - yi;
		fx = fx * fx * (3 - 2 * fx);
		fy = fy * fy * (3 - 2 * fy);
		const a = hashD(xi, yi);
		const b = hashD(xi + 1, yi);
		const c = hashD(xi, yi + 1);
		const d = hashD(xi + 1, yi + 1);
		return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
	}
	function hashD(a, b) {
		const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
		return h - Math.floor(h);
	}
	function fibDir(i, n) {
		const golden = Math.PI * (3 - Math.sqrt(5));
		const y = 1 - 2 * (i + .5) / n;
		const rad = Math.sqrt(1 - y * y);
		const a = i * golden;
		return [
			rad * Math.cos(a),
			y,
			rad * Math.sin(a)
		];
	}
	function angleDelta(a, b) {
		return Math.atan2(Math.sin(a - b), Math.cos(a - b));
	}
	function makeProj(yaw, tilt, cx, cy, scale) {
		const st = Math.sin(tilt);
		const ct = Math.cos(tilt);
		const sy = Math.sin(yaw);
		const cyw = Math.cos(yaw);
		return (x, y, z) => {
			const x1 = x * cyw + z * sy;
			const z1 = -x * sy + z * cyw;
			const y1 = y * ct - z1 * st;
			const z2 = y * st + z1 * ct;
			return [
				cx + x1 * scale,
				cy - y1 * scale,
				z2
			];
		};
	}
	function inkColor(w, alpha, dark, tint) {
		if (!tint) {
			const g = Math.round((dark ? 1 - w : w) * 255);
			return `rgba(${g},${g},${g},${alpha})`;
		}
		const ramp = (c) => Math.round(dark ? c * (1 - w) : c + (255 - c) * w);
		return `rgba(${ramp(tint.r)},${ramp(tint.g)},${ramp(tint.b)},${alpha})`;
	}
	function paint(ctx, dots, dark, rMin = .3, tint) {
		for (const d of dots) {
			const alpha = d.a ?? 1;
			ctx.fillStyle = inkColor(Math.min(1, Math.max(0, d.white)), alpha, dark, tint);
			ctx.beginPath();
			ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	function paintLines(ctx, lines, dark, tint) {
		for (const l of lines) {
			const alpha = l.a ?? 1;
			ctx.strokeStyle = inkColor(Math.min(1, Math.max(0, l.white)), alpha, dark, tint);
			ctx.lineWidth = l.w;
			ctx.beginPath();
			ctx.moveTo(l.x1, l.y1);
			ctx.lineTo(l.x2, l.y2);
			ctx.stroke();
		}
	}
	function finalizeFrame(dots, lines, rMin = .3) {
		const visible = [];
		for (const d of dots) {
			if ((d.a ?? 1) < .02) continue;
			d.r = Math.max(rMin, d.r);
			visible.push(d);
		}
		visible.sort((a, b) => a.z - b.z);
		return {
			dots: visible,
			lines: lines.filter((l) => (l.a ?? 1) >= .02)
		};
	}
	function paintFrame(ctx, frame, dark, tint) {
		if (frame.lines.length) paintLines(ctx, frame.lines, dark, tint);
		paint(ctx, frame.dots, dark, .3, tint);
	}
	function radiusScale(size, pow) {
		return (size / 300) ** pow;
	}
	const COUNT_PAIRS = [
		["latRings", "lonDensity"],
		["rings", "lonDensity"],
		["lanes", "segs"]
	];
	const COUNT_KEYS = [
		"orbitN",
		"ghostN",
		"nodeN",
		"strandN",
		"signals"
	];
	const ICON_DENSITY_KEYS = ["iconD"];
	const RADIUS_KEYS = [
		"rBase",
		"rDepth",
		"rActive",
		"rDot",
		"ghostR",
		"partR",
		"partRDepth",
		"nodeR",
		"nodeRDepth"
	];
	function scaleCounts(opts, scale) {
		const out = { ...opts };
		const done = /* @__PURE__ */ new Set();
		const rt = Math.sqrt(scale);
		for (const [a, b] of COUNT_PAIRS) {
			const va = out[a];
			const vb = out[b];
			if (va != null && vb != null && !done.has(a) && !done.has(b)) {
				out[a] = Math.max(2, Math.round(va * rt));
				out[b] = Math.max(2, Math.round(vb * rt));
				done.add(a);
				done.add(b);
			}
		}
		for (const k of COUNT_KEYS) {
			const v = out[k];
			if (v != null && v !== 0 && !done.has(k)) out[k] = Math.max(1, Math.round(v * scale));
		}
		for (const k of ICON_DENSITY_KEYS) {
			const v = out[k];
			if (v != null) out[k] = Math.max(.02, v * scale);
		}
		return out;
	}
	function scaleRadii(opts, scale) {
		const out = { ...opts };
		for (const k of RADIUS_KEYS) {
			const v = out[k];
			if (v != null) out[k] = v * scale;
		}
		out.rSizeMul = (out.rSizeMul ?? 1) * scale;
		return out;
	}
	const BASE_PROFILES = {
		globe: {
			latRings: 17,
			lonDensity: 44,
			rBase: .6,
			rDepth: 1.7,
			rBoost: 1,
			inkFar: .62,
			inkSpan: .54,
			rsPow: .6,
			rMin: .3
		},
		orbits: {
			orbitN: 12,
			ghostN: 40,
			ghostR: .9,
			ghostA: .5,
			particles: 3,
			partR: 1.2,
			partRDepth: 1.6,
			rsPow: .6,
			rMin: .3
		},
		rubik: {
			latRings: 15,
			lonDensity: 40,
			moveCount: 14,
			rBase: .6,
			rDepth: 1.7,
			rActive: .3,
			inkFar: .62,
			inkSpan: .54,
			rsPow: .6,
			rMin: .3
		},
		wave: {
			rings: 15,
			lonDensity: 40,
			rBase: .6,
			rDepth: 1.7,
			rsPow: .6,
			rMin: .3
		},
		web: {
			nodeN: 30,
			thr: .72,
			signals: 5,
			nodeR: 1.4,
			nodeRDepth: 1.8,
			lineW: .8,
			rsPow: .6,
			rMin: .3
		},
		braid: {
			strandN: 52,
			turns: 3,
			ghostN: 150,
			rBase: 1.2,
			rDepth: 1.8,
			rsPow: .6,
			rMin: .3
		},
		ribbon: {
			lanes: 5,
			segs: 88,
			ghostN: 150,
			rBase: 1.1,
			rDepth: 1.7,
			rsPow: .6,
			rMin: .3
		},
		ring: {
			lanes: 5,
			segs: 88,
			ghostN: 0,
			faceOn: 1,
			rBase: 1.1,
			rDepth: 1.7,
			rsPow: .6,
			rMin: .3
		},
		morph: {
			rDot: .021,
			iconD: 1,
			rMin: .25
		}
	};
	const frameBraid = (size, t, o) => {
		const cx = size / 2;
		const cy = size / 2;
		const R = size / 2 * .76;
		const pt = makeProj(t * .4, .3, cx, cy, 1);
		const rs = radiusScale(size, o.rsPow ?? .6);
		const dots = [];
		const ghostN = o.ghostN ?? 150;
		for (let i = 0; i < ghostN; i++) {
			const d = fibDir(i, ghostN);
			const [px, py, z] = pt(d[0] * R, d[1] * R, d[2] * R);
			const depth = (z / R + 1) / 2;
			dots.push({
				x: px,
				y: py,
				z,
				r: .8 * rs,
				white: .78,
				a: .1 + .22 * depth
			});
		}
		const strandN = o.strandN ?? 52;
		const turns = o.turns ?? 3;
		for (let s = 0; s < 3; s++) {
			const phase = s / 3 * 2 * Math.PI;
			for (let i = 0; i < strandN; i++) {
				const u = (frac(i / strandN + t * .045) * 2 - 1) * .96;
				const surf = Math.sqrt(Math.max(0, 1 - u * u));
				const endFade = Math.min(1, (1 - Math.abs(u)) / .1);
				const a = u * Math.PI * turns + phase;
				const weave = 1 + .075 * Math.sin(u * Math.PI * turns * 2 + phase * 2 + t * .8);
				const rr = surf * R * weave;
				const [px, py, zr] = pt(Math.cos(a) * rr, u * R * weave, Math.sin(a) * rr);
				const depth = (zr / R + 1) / 2;
				dots.push({
					x: px,
					y: py,
					z: zr,
					r: ((o.rBase ?? 1.2) + (o.rDepth ?? 1.8) * depth) * rs,
					white: .55 - .45 * depth,
					a: endFade * (.45 + .55 * depth)
				});
			}
		}
		return finalizeFrame(dots, [], o.rMin);
	};
	function solveCycle(time, count, slotDur, rest) {
		const tc = time % (2 * count * slotDur + rest);
		const amount = new Array(count).fill(0);
		let active = -1;
		if (tc < 2 * count * slotDur) {
			const slot = Math.floor(tc / slotDur);
			const p = (tc - slot * slotDur) / slotDur;
			const ep = 1 - (1 - Math.min(1, p / .7)) ** 3;
			if (slot < count) {
				for (let i = 0; i < slot; i++) amount[i] = 1;
				amount[slot] = ep;
				active = slot;
			} else {
				const u = 2 * count - 1 - slot;
				for (let i = 0; i < u; i++) amount[i] = 1;
				amount[u] = 1 - ep;
				active = u;
			}
		}
		return {
			amount,
			active
		};
	}
	function applyMoves(pt3, moves, sc) {
		let [x, y, z] = pt3;
		let inActive = false;
		for (let i = 0; i < moves.length; i++) {
			if (sc.amount[i] <= 0) continue;
			const mv = moves[i];
			const coord = mv.axis === 0 ? x : mv.axis === 1 ? y : z;
			if (coord < mv.lo || coord >= mv.hi) continue;
			if (i === sc.active) inActive = true;
			const a = mv.ang * sc.amount[i];
			const ca = Math.cos(a);
			const sa = Math.sin(a);
			if (mv.axis === 0) {
				const y2 = y * ca - z * sa;
				z = y * sa + z * ca;
				y = y2;
			} else if (mv.axis === 1) {
				const x2 = x * ca + z * sa;
				z = -x * sa + z * ca;
				x = x2;
			} else {
				const x2 = x * ca - y * sa;
				y = x * sa + y * ca;
				x = x2;
			}
		}
		return [
			x,
			y,
			z,
			inActive
		];
	}
	function makeMoves(count) {
		const moves = [];
		for (let i = 0; i < count; i++) {
			const axis = Math.min(2, Math.floor(hashD(i, 2.3) * 3));
			const lo = -1 + .5 * Math.min(3, Math.floor(hashD(i, 5.9) * 4));
			const dir = hashD(i, 7.7) < .5 ? 1 : -1;
			moves.push({
				axis,
				lo,
				hi: lo + .5,
				ang: dir * Math.PI / 2
			});
		}
		return moves;
	}
	const frameGlobe = (size, t, o) => {
		const spin = .5;
		const cx = size / 2;
		const cy = size / 2;
		const radius = size / 2 * .82;
		const tilt = .4 + .06 * Math.sin(t * .35);
		const pt = makeProj(t * spin, tilt, cx, cy, radius);
		const scan = t * (spin + 1.2 * (o.scanMul ?? 1));
		const rs = radiusScale(size, o.rsPow ?? .6);
		const dimBase = o.dimBase ?? 1;
		const dots = [];
		const latRings = o.latRings ?? 17;
		const lonDensity = o.lonDensity ?? 44;
		for (let li = 0; li <= latRings; li++) {
			const lat = -Math.PI / 2 + li / latRings * Math.PI;
			const cosLat = Math.cos(lat);
			const sinLat = Math.sin(lat);
			const lonCount = Math.max(1, Math.round(Math.abs(cosLat) * lonDensity));
			for (let lj = 0; lj < lonCount; lj++) {
				const lon = lj / lonCount * 2 * Math.PI;
				const [px, py, z] = pt(cosLat * Math.cos(lon), sinLat, cosLat * Math.sin(lon));
				const depth = (z + 1) / 2;
				const d = angleDelta(lon + t * spin, scan);
				const boost = Math.exp(-(d * d) / .18) * Math.max(0, z);
				dots.push({
					x: px,
					y: py,
					z,
					r: ((o.rBase ?? .6) + (o.rDepth ?? 1.7) * depth + (o.rBoost ?? 1) * boost) * rs,
					white: (o.inkFar ?? .62) - (o.inkSpan ?? .54) * depth,
					a: dimBase + (1 - dimBase) * Math.min(1, boost)
				});
			}
		}
		return finalizeFrame(dots, [], o.rMin);
	};
	const frameRubik = (size, t, o) => {
		const cx = size / 2;
		const cy = size / 2;
		const R = size / 2 * .82;
		const pt = makeProj(t * .55, .35 + .1 * Math.sin(t * .9), cx, cy, R);
		const rs = radiusScale(size, o.rsPow ?? .6);
		const moveCount = o.moveCount ?? 14;
		const moves = makeMoves(moveCount);
		const sc = solveCycle(t, moveCount, .42, 1.2);
		const dots = [];
		const latRings = o.latRings ?? 15;
		const lonDensity = o.lonDensity ?? 40;
		for (let li = 0; li <= latRings; li++) {
			const lat = -Math.PI / 2 + li / latRings * Math.PI;
			const cosLat = Math.cos(lat);
			const sinLat = Math.sin(lat);
			const lonCount = Math.max(1, Math.round(Math.abs(cosLat) * lonDensity));
			for (let lj = 0; lj < lonCount; lj++) {
				const lon = lj / lonCount * 2 * Math.PI;
				const [x, y, z, inActive] = applyMoves([
					cosLat * Math.cos(lon),
					sinLat,
					cosLat * Math.sin(lon)
				], moves, sc);
				const [px, py, zr] = pt(x, y, z);
				const depth = (zr + 1) / 2;
				dots.push({
					x: px,
					y: py,
					z: zr,
					r: ((o.rBase ?? .6) + (o.rDepth ?? 1.7) * depth + (inActive ? o.rActive ?? .3 : 0)) * rs,
					white: (o.inkFar ?? .62) - (o.inkSpan ?? .54) * depth - (inActive ? .14 : 0)
				});
			}
		}
		return finalizeFrame(dots, [], o.rMin);
	};
	const frameWave = (size, t, o) => {
		const cx = size / 2;
		const cy = size / 2;
		const R = size / 2 * .874;
		const pt = makeProj(t * .18, .38, cx, cy, 1);
		const rs = radiusScale(size, o.rsPow ?? .6);
		const dots = [];
		const rings = o.rings ?? 15;
		const lonDensity = o.lonDensity ?? 40;
		for (let ri = 0; ri <= rings; ri++) {
			const lat = -Math.PI / 2 + ri / rings * Math.PI;
			const cosLat = Math.cos(lat);
			const sinLat = Math.sin(lat);
			const w = .62 * Math.sin(t * 2.1 - ri * .52) + .38 * Math.sin(t * 1.27 + ri * .83);
			const rr = R * (.88 + .105 * w);
			const lonCount = Math.max(1, Math.round(Math.abs(cosLat) * lonDensity));
			for (let lj = 0; lj < lonCount; lj++) {
				const lon = lj / lonCount * 2 * Math.PI;
				const [px, py, z] = pt(cosLat * Math.cos(lon) * rr, sinLat * rr, cosLat * Math.sin(lon) * rr);
				const depth = (z / R + 1) / 2;
				const crest = Math.max(0, w);
				dots.push({
					x: px,
					y: py,
					z,
					r: ((o.rBase ?? .6) + (o.rDepth ?? 1.7) * depth) * (1 + .4 * crest) * rs,
					white: .66 - .56 * depth - .1 * crest
				});
			}
		}
		return finalizeFrame(dots, [], o.rMin);
	};
	function smoothE(x) {
		return x * x * (3 - 2 * x);
	}
	function polyPath(verts) {
		const V = verts.length;
		const L = [];
		let total = 0;
		for (let i = 0; i < V; i++) {
			const a = verts[i];
			const b = verts[(i + 1) % V];
			const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
			L.push(l);
			total += l;
		}
		return (f) => {
			let target = f * total;
			let i = 0;
			while (target > L[i] && i < V - 1) {
				target -= L[i];
				i++;
			}
			const a = verts[i];
			const b = verts[(i + 1) % V];
			const ff = L[i] ? Math.min(1, target / L[i]) : 0;
			return [a[0] + (b[0] - a[0]) * ff, a[1] + (b[1] - a[1]) * ff];
		};
	}
	const CIRCLE = (f) => {
		const a = -Math.PI / 2 + f * 2 * Math.PI;
		return [Math.cos(a) * .24, Math.sin(a) * .24];
	};
	const CYCLE = [
		CIRCLE,
		polyPath([
			[0, -.26],
			[.24, .16],
			[-.24, .16]
		]),
		polyPath([
			[0, -.2],
			[.2, -.2],
			[.2, .2],
			[-.2, .2],
			[-.2, -.2]
		])
	];
	function morphN(d) {
		return Math.max(6, Math.round(34 * d));
	}
	const HOLD = 1.4;
	const MORPH = .9;
	const SEG = 2.3;
	const frameMorph = (size, t, o) => {
		const K = CYCLE.length;
		const tc = t % (SEG * K);
		const held = o.shape != null && o.shape >= 0 && o.shape < K ? Math.floor(o.shape) : -1;
		const k = held >= 0 ? held : Math.floor(tc / SEG);
		const local = held >= 0 ? t % SEG : tc - k * SEG;
		const m = held >= 0 ? 0 : local > HOLD ? smoothE((local - HOLD) / MORPH) : 0;
		const sprd = o.spread ?? 1;
		const pA = CYCLE[k];
		const pB = held >= 0 ? pA : CYCLE[(k + 1) % K];
		const M = 160;
		const pts = [];
		for (let i = 0; i < M; i++) {
			const f = i / M;
			const a = pA(f);
			const b = pB(f);
			pts.push([(a[0] + (b[0] - a[0]) * m) * sprd, (a[1] + (b[1] - a[1]) * m) * sprd]);
		}
		const L = [];
		let total = 0;
		for (let i = 0; i < M; i++) {
			const a = pts[i];
			const b = pts[(i + 1) % M];
			const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
			L.push(l);
			total += l;
		}
		const n = morphN(o.iconD ?? 1);
		const re = (o.rDot ?? .021) * 1.35 * sprd;
		const pulse = 1 + .02 * Math.sin(local * 3.1);
		const dots = [];
		const c2 = size / 2;
		let seg = 0;
		let acc = 0;
		for (let k2 = 0; k2 < n; k2++) {
			const target = k2 / n * total;
			while (acc + L[seg] < target && seg < 159) {
				acc += L[seg];
				seg++;
			}
			const a = pts[seg];
			const b = pts[(seg + 1) % M];
			const f = L[seg] ? Math.min(1, (target - acc) / L[seg]) : 0;
			const x = (a[0] + (b[0] - a[0]) * f) * pulse;
			const y = (a[1] + (b[1] - a[1]) * f) * pulse;
			dots.push({
				x: c2 + x * size,
				y: c2 + y * size,
				z: 0,
				r: Math.max(.35, re * size),
				white: .1
			});
		}
		return finalizeFrame(dots, [], o.rMin);
	};
	const frameOrbits = (size, t, o) => {
		const cx = size / 2;
		const cy = size / 2;
		const R = size / 2 * .82;
		const pt = makeProj(t * .12, .3, cx, cy, 1);
		const rs = radiusScale(size, o.rsPow ?? .6);
		const dots = [];
		const orbitN = o.orbitN ?? 12;
		const ghostN = o.ghostN ?? 40;
		const particles = o.particles ?? 3;
		for (let orb = 0; orb < orbitN; orb++) {
			const h1 = hashD(orb, 1.7);
			const h2 = hashD(orb, 5.2);
			const h3 = hashD(orb, 8.9);
			const ro = R * (.45 + .52 * h1);
			const th = h1 * 2 * Math.PI;
			const phi = Math.acos(2 * h2 - 1);
			const nx = Math.sin(phi) * Math.cos(th);
			const ny = Math.cos(phi);
			const nz = Math.sin(phi) * Math.sin(th);
			let ux = -ny;
			let uy = nx;
			const uz = 0;
			const ul = Math.max(1e-6, Math.sqrt(ux * ux + uy * uy));
			ux /= ul;
			uy /= ul;
			const vx = ny * uz - nz * uy;
			const vy = nz * ux - nx * uz;
			const vz = nx * uy - ny * ux;
			const speed = (.25 + .55 * h3) * (h3 > .5 ? 1 : -1);
			for (let k = 0; k < ghostN; k++) {
				const a = k / ghostN * 2 * Math.PI;
				const [px, py, z] = pt((ux * Math.cos(a) + vx * Math.sin(a)) * ro, (uy * Math.cos(a) + vy * Math.sin(a)) * ro, (uz * Math.cos(a) + vz * Math.sin(a)) * ro);
				const depth = (z / ro + 1) / 2;
				dots.push({
					x: px,
					y: py,
					z,
					r: (o.ghostR ?? .9) * rs,
					white: .72,
					a: (o.ghostA ?? .5) * (.4 + .6 * depth)
				});
			}
			for (let m = 0; m < particles; m++) {
				const a = t * speed + m / particles * 2 * Math.PI + h2 * 6;
				const [px, py, z] = pt((ux * Math.cos(a) + vx * Math.sin(a)) * ro, (uy * Math.cos(a) + vy * Math.sin(a)) * ro, (uz * Math.cos(a) + vz * Math.sin(a)) * ro);
				const depth = (z / ro + 1) / 2;
				dots.push({
					x: px,
					y: py,
					z,
					r: ((o.partR ?? 1.2) + (o.partRDepth ?? 1.6) * depth) * rs,
					white: .3 - .22 * depth
				});
			}
		}
		return finalizeFrame(dots, [], o.rMin);
	};
	const frameRibbon = (size, t, o) => {
		const cx = size / 2;
		const cy = size / 2;
		const R = size / 2 * .78;
		const spin = o.spin ?? 1;
		const pt = makeProj(t * .1 * spin, .3, cx, cy, 1);
		const rs = radiusScale(size, o.rsPow ?? .6);
		const dots = [];
		const ghostN = o.ghostN ?? 150;
		for (let i = 0; i < ghostN; i++) {
			const d = fibDir(i, ghostN);
			const [px, py, z] = pt(d[0] * R, d[1] * R, d[2] * R);
			const depth = (z / R + 1) / 2;
			dots.push({
				x: px,
				y: py,
				z,
				r: .8 * rs,
				white: .78,
				a: .1 + .22 * depth
			});
		}
		const ya = t * .24 * spin;
		const ta = o.faceOn ? -.3 : .55 + .3 * Math.sin(t * .18) * spin;
		const ux = Math.cos(ya);
		const uy = 0;
		const uz = Math.sin(ya);
		const vx = -uz * Math.sin(ta);
		const vy = Math.cos(ta);
		const vz = ux * Math.sin(ta);
		const nx = uy * vz - uz * vy;
		const ny = uz * vx - ux * vz;
		const nz = ux * vy - uy * vx;
		const wobAmp = .23 * (o.wobMul ?? 1);
		const baseR = o.faceOn ? R / (1 + .85 * wobAmp) : R;
		const baseLanes = o.lanes ?? 5;
		const segs = o.segs ?? 88;
		const lanes = Math.max(1, Math.round(baseLanes * (o.bandMul ?? 1)));
		for (let w = 0; w < lanes; w++) {
			const laneOff = (w - (lanes - 1) / 2) * .075;
			const edge = Math.abs(w - (lanes - 1) / 2) / Math.max(1, (lanes - 1) / 2);
			for (let k = 0; k < segs; k++) {
				const a = k / segs * 2 * Math.PI;
				const wob = (.16 * Math.sin(a * 3 - t * 1.7 + w * .22) + .07 * Math.sin(a * 5 + t * 1.1)) * (o.wobMul ?? 1);
				const radial = o.faceOn ? 1 + wob : 1;
				const off = o.faceOn ? laneOff : laneOff + wob;
				const x = ux * Math.cos(a) + vx * Math.sin(a) + nx * off;
				const y = uy * Math.cos(a) + vy * Math.sin(a) + ny * off;
				const z = uz * Math.cos(a) + vz * Math.sin(a) + nz * off;
				const l = Math.sqrt(x * x + y * y + z * z);
				const rr = baseR * radial;
				const [px, py, zr] = pt(x / l * rr, y / l * rr, z / l * rr);
				const depth = (zr / R + 1) / 2;
				dots.push({
					x: px,
					y: py,
					z: zr,
					r: ((o.rBase ?? 1.1) + (o.rDepth ?? 1.7) * depth) * (1 - .25 * edge) * rs,
					white: .52 - .44 * depth + .18 * edge,
					a: .4 + .6 * depth
				});
			}
		}
		return finalizeFrame(dots, [], o.rMin);
	};
	const frameWeb = (size, t, o) => {
		const cx = size / 2;
		const cy = size / 2;
		const R = size / 2 * .8 * (o.spread ?? 1);
		const pt = makeProj(t * .12, .32, cx, cy, R);
		const rs = radiusScale(size, o.rsPow ?? .6);
		const nodeN = o.nodeN ?? 30;
		const thr = o.thr ?? .72;
		const nodeR = o.nodeR ?? 1.4;
		const nodeRDepth = o.nodeRDepth ?? 1.8;
		const nodes = [];
		for (let i = 0; i < nodeN; i++) {
			const d = fibDir(i, nodeN);
			const x = d[0] + .3 * (vnoise(i * .31 + 9, t * .24) - .5) * 2;
			const y = d[1] + .3 * (vnoise(i * .53 + 27, t * .21) - .5) * 2;
			const z = d[2] + .3 * (vnoise(i * .77 + 55, t * .27) - .5) * 2;
			const l = Math.sqrt(x * x + y * y + z * z);
			nodes.push([
				x / l,
				y / l,
				z / l
			]);
		}
		const lines = [];
		const dots = [];
		for (let i = 0; i < nodeN; i++) for (let j = i + 1; j < nodeN; j++) {
			const dx = nodes[i][0] - nodes[j][0];
			const dy = nodes[i][1] - nodes[j][1];
			const dz = nodes[i][2] - nodes[j][2];
			const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
			if (dist >= thr) continue;
			const [x1, y1, z1] = pt(nodes[i][0], nodes[i][1], nodes[i][2]);
			const [x2, y2, z2] = pt(nodes[j][0], nodes[j][1], nodes[j][2]);
			const depth = ((z1 + z2) / 2 + 1) / 2;
			lines.push({
				x1,
				y1,
				x2,
				y2,
				white: .42,
				a: (1 - dist / thr) * (.3 + .55 * depth),
				w: Math.max(.6, (o.lineW ?? .8) * rs)
			});
		}
		for (let i = 0; i < nodeN; i++) {
			const [px, py, z] = pt(nodes[i][0], nodes[i][1], nodes[i][2]);
			const depth = (z + 1) / 2;
			const pulse = 1 + .25 * Math.sin(t * 1.4 + i * 2.7);
			dots.push({
				x: px,
				y: py,
				z,
				r: (nodeR + nodeRDepth * depth) * pulse * rs,
				white: .55 - .45 * depth
			});
		}
		const signals = o.signals ?? 5;
		for (let s = 0; s < signals; s++) {
			const seg = Math.floor(t * .55 + s * 7.31);
			const a = Math.floor(hashD(seg, s * 3.1 + 1.7) * nodeN);
			const b = Math.floor(hashD(seg, s * 5.7 + 4.2) * nodeN);
			if (a === b) continue;
			const f = frac(t * .55 + s * 7.31);
			const x = lerp(nodes[a][0], nodes[b][0], f);
			const y = lerp(nodes[a][1], nodes[b][1], f);
			const z = lerp(nodes[a][2], nodes[b][2], f);
			const l = Math.max(1e-6, Math.sqrt(x * x + y * y + z * z));
			const [px, py, zr] = pt(x / l, y / l, z / l);
			const depth = (zr + 1) / 2;
			dots.push({
				x: px,
				y: py,
				z: zr,
				r: (nodeR * 1.5 + nodeRDepth * depth) * rs,
				white: .05,
				a: .5 + .5 * depth
			});
		}
		return finalizeFrame(dots, lines, o.rMin);
	};
	const MODE_FRAMES = {
		orbits: frameOrbits,
		globe: frameGlobe,
		rubik: frameRubik,
		wave: frameWave,
		web: frameWeb,
		braid: frameBraid,
		ribbon: frameRibbon,
		ring: frameRibbon,
		morph: frameMorph
	};
	const MODE_DRAWS = Object.fromEntries(Object.entries(MODE_FRAMES).map(([key, frame]) => [key, (ctx, size, t, dark, opts) => paintFrame(ctx, frame(size, t, opts), dark)]));
	const STATE_TO_MODE = {
		working: "orbits",
		searching: "globe",
		solving: "rubik",
		listening: "wave",
		connecting: "web",
		weaving: "braid",
		composing: "ribbon",
		breathing: "ring",
		shaping: "morph"
	};
	const PRESETS = {
		orbits: {
			64: {
				speed: 1.885,
				count: 1,
				size: 1
			},
			32: {
				speed: 2.9072,
				count: .4251,
				size: 1.6849
			},
			20: {
				speed: 3.9,
				count: .238,
				size: 2.4
			}
		},
		globe: {
			64: {
				speed: 2.015,
				count: .42,
				size: 1.15,
				extra: {
					scanMul: 4.08,
					dimBase: .45
				}
			},
			32: {
				speed: 2.3803,
				count: .1839,
				size: 1.4769,
				extra: {
					scanMul: 4.2301,
					dimBase: .45
				}
			},
			20: {
				speed: 2.665,
				count: .105,
				size: 1.75,
				extra: {
					scanMul: 4.335,
					dimBase: .45
				}
			}
		},
		rubik: {
			64: {
				speed: 1.82,
				count: .35,
				size: 1.05
			},
			32: {
				speed: 1.8964,
				count: .1537,
				size: 1.4951
			},
			20: {
				speed: 1.95,
				count: .088,
				size: 1.9
			}
		},
		wave: {
			64: {
				speed: 4.388,
				count: .341,
				size: 1
			},
			32: {
				speed: 4.1512,
				count: .169,
				size: 1.3232
			},
			20: {
				speed: 3.998,
				count: .105,
				size: 1.6
			}
		},
		web: {
			64: {
				speed: 3.315,
				count: 1.35,
				size: .95
			},
			32: {
				speed: 5.0104,
				count: .4942,
				size: 1.2571
			},
			20: {
				speed: 6.63,
				count: .25,
				size: 1.52
			}
		},
		braid: {
			64: {
				speed: 1.625,
				count: .5,
				size: 1
			},
			32: {
				speed: 2.2234,
				count: .2056,
				size: 1.2011
			},
			20: {
				speed: 2.75,
				count: .1125,
				size: 1.36
			}
		},
		ribbon: {
			64: {
				speed: 2.34,
				count: .25,
				size: .85,
				extra: {
					spin: 0,
					bandMul: 3.9,
					wobMul: 1
				}
			},
			32: {
				speed: 2.7776,
				count: .0969,
				size: .9766,
				extra: {
					spin: 0,
					bandMul: 4.49,
					wobMul: 1
				}
			},
			20: {
				speed: 3.12,
				count: .051,
				size: 1.073,
				extra: {
					spin: 0,
					bandMul: 4.94,
					wobMul: 1
				}
			}
		},
		ring: {
			64: {
				speed: 3.24,
				count: .25,
				size: .956,
				extra: {
					spin: 0,
					bandMul: 3.627,
					wobMul: .368
				}
			},
			32: {
				speed: 3.5517,
				count: .0678,
				size: 1.31,
				extra: {
					spin: 0,
					bandMul: 3.8265,
					wobMul: .4751
				}
			},
			20: {
				speed: 3.78,
				count: .028,
				size: 1.622,
				extra: {
					spin: 0,
					bandMul: 3.968,
					wobMul: .565
				}
			}
		},
		morph: {
			64: {
				speed: 2.405,
				count: .702,
				size: .395,
				extra: { spread: 1.45 }
			},
			32: {
				speed: 2.2057,
				count: .5937,
				size: .6916,
				extra: { spread: 1.45 }
			},
			20: {
				speed: 2.08,
				count: .53,
				size: 1.011,
				extra: { spread: 1.45 }
			}
		}
	};
	const cache = /* @__PURE__ */ new Map();
	function resolvePreset(state, size) {
		const key = `${state}-${size}`;
		const hit = cache.get(key);
		if (hit) return hit;
		const mode = STATE_TO_MODE[state];
		const preset = PRESETS[mode][size];
		let opts = { ...BASE_PROFILES[mode] };
		if (preset.count !== 1) opts = scaleCounts(opts, preset.count);
		if (preset.size !== 1) opts = scaleRadii(opts, preset.size);
		if (preset.extra) opts = {
			...opts,
			...preset.extra
		};
		const resolved = {
			mode,
			speed: preset.speed,
			opts
		};
		cache.set(key, resolved);
		return resolved;
	}

// src/completion.ts
	const dots = /* @__PURE__ */ new WeakMap();
	const clearCompletionDot = (tab) => {
		dots.get(tab)?.remove();
		dots.delete(tab);
	};
	const showCompletionDot = (tab) => {
		const stack = tab.querySelector(".tab-icon-stack");
		if (!stack || dots.has(tab)) return;
		const dot = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
		dot.className = "tab-thinking-completion-dot";
		dot.setAttribute("aria-hidden", "true");
		stack.appendChild(dot);
		dots.set(tab, dot);
	};
	const onTabSelect = (event) => {
		clearCompletionDot(event.target);
	};

// src/mod.ts
	const SHOW_DELAY_MS = 300;
	const ORB_CSS_SIZE = 16;
	const DRAW_SIZE = 20;
	const MAX_DPR = 2;
	const FALLBACK_DPR = 1;
	const MS_PER_SECOND = 1e3;
	const ORIGIN = 0;
	const preset = resolvePreset("composing", DRAW_SIZE);
	const orbs = /* @__PURE__ */ new Map();
	const progressTitles = /* @__PURE__ */ new Map();
	let rafId = null;
	let dpr = NaN;
	const updateDpr = () => {
		const current = Math.min(window.devicePixelRatio || FALLBACK_DPR, MAX_DPR);
		if (current === dpr) return;
		dpr = current;
		for (const orb of orbs.values()) {
			orb.canvas.width = ORB_CSS_SIZE * dpr;
			orb.canvas.height = ORB_CSS_SIZE * dpr;
		}
	};
	const render = (now) => {
		rafId = null;
		updateDpr();
		const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		const time = now / MS_PER_SECOND * preset.speed;
		const scale = dpr * ORB_CSS_SIZE / DRAW_SIZE;
		let animating = false;
		for (const orb of orbs.values()) if (orb.visible) {
			orb.ctx.setTransform(scale, ORIGIN, ORIGIN, scale, ORIGIN, ORIGIN);
			orb.ctx.clearRect(ORIGIN, ORIGIN, DRAW_SIZE, DRAW_SIZE);
			MODE_DRAWS[preset.mode](orb.ctx, DRAW_SIZE, time, dark, preset.opts);
			animating = true;
		}
		if (animating) rafId = window.requestAnimationFrame(render);
	};
	const showOrb = (tab) => {
		const orb = orbs.get(tab);
		if (!orb || orb.visible || orb.showTimer !== null) return;
		orb.showTimer = window.setTimeout(() => {
			orb.showTimer = null;
			const stack = tab.querySelector(".tab-icon-stack");
			if (!stack) return;
			if (!orb.canvas.isConnected) stack.appendChild(orb.canvas);
			tab.setAttribute("tab-thinking-active", "true");
			orb.visible = true;
			rafId ??= window.requestAnimationFrame(render);
		}, SHOW_DELAY_MS);
	};
	const hideOrb = (tab) => {
		const orb = orbs.get(tab);
		if (!orb) return;
		orb.generating = false;
		if (orb.showTimer !== null) {
			window.clearTimeout(orb.showTimer);
			orb.showTimer = null;
		}
		if (orb.visible) {
			orb.canvas.remove();
			tab.removeAttribute("tab-thinking-active");
			orb.visible = false;
		}
	};
	const createCanvas = () => {
		updateDpr();
		const canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Failed to get a 2D context for the orb canvas.");
		canvas.className = "tab-thinking-indicator-orb";
		canvas.setAttribute("aria-hidden", "true");
		canvas.width = ORB_CSS_SIZE * dpr;
		canvas.height = ORB_CSS_SIZE * dpr;
		canvas.style.width = `${String(ORB_CSS_SIZE)}px`;
		canvas.style.height = `${String(ORB_CSS_SIZE)}px`;
		return {
			canvas,
			ctx
		};
	};
	const clearProgressTitle = (tab) => {
		const entry = progressTitles.get(tab);
		if (!entry) return;
		entry.observer.disconnect();
		entry.label.remove();
		tab.removeAttribute("tab-thinking-progress");
		progressTitles.delete(tab);
	};
	const syncProgressLabel = (label, original, title) => {
		for (const name of label.getAttributeNames()) label.removeAttribute(name);
		for (const attribute of original.attributes) label.setAttribute(attribute.name, attribute.value);
		label.removeAttribute("id");
		label.classList.add("tab-thinking-progress-label");
		label.textContent = title;
		for (const name of ["value", "text"]) if (original.hasAttribute(name)) label.setAttribute(name, title);
	};
	const updateProgressTitle = (tab, progress) => {
		if (!progress) {
			clearProgressTitle(tab);
			return;
		}
		let entry = progressTitles.get(tab);
		if (!entry) {
			const original = tab.querySelector(".tab-label-container > .tab-label:not(.tab-thinking-progress-label)");
			if (!original) return;
			const label = original.cloneNode(false);
			if (!(label instanceof Element)) return;
			const observer = new MutationObserver(() => {
				updateProgressTitle(tab, progressTitles.get(tab)?.progress ?? "");
			});
			observer.observe(tab, { attributeFilter: ["label"] });
			observer.observe(original, { attributes: true });
			original.after(label);
			entry = {
				label,
				observer,
				original,
				progress
			};
			progressTitles.set(tab, entry);
			tab.setAttribute("tab-thinking-progress", "true");
		}
		entry.progress = progress;
		syncProgressLabel(entry.label, entry.original, `${progress}: ${tab.getAttribute("label") ?? ""}`);
	};
	const onGenerationState = (browser, generating) => {
		const tab = gBrowser.getTabForBrowser(browser);
		if (!tab) return;
		if (!generating) {
			clearProgressTitle(tab);
			hideOrb(tab);
			return;
		}
		let orb = orbs.get(tab);
		if (!orb) {
			const { canvas, ctx } = createCanvas();
			orb = {
				canvas,
				ctx,
				generating: false,
				showTimer: null,
				visible: false
			};
			orbs.set(tab, orb);
		}
		clearCompletionDot(tab);
		orb.generating = true;
		showOrb(tab);
	};
	const onGenerationEvent = (event) => {
		const { browser, generating, progress } = event.detail;
		const tab = gBrowser.getTabForBrowser(browser);
		if (!tab) return;
		const completed = !generating && orbs.get(tab)?.generating;
		onGenerationState(browser, generating);
		updateProgressTitle(tab, generating ? progress : "");
		if (completed && tab !== gBrowser.selectedTab) showCompletionDot(tab);
	};
	const tabsProgressListener = { onStateChange(...args) {
		const browser = args[0];
		if ((args[3] & 131073) === 131073) {
			const tab = gBrowser.getTabForBrowser(browser);
			if (tab) clearCompletionDot(tab);
			onGenerationState(browser, false);
		}
	} };
	const onTabClose = (event) => {
		const tab = event.target;
		clearProgressTitle(tab);
		clearCompletionDot(tab);
		hideOrb(tab);
		orbs.delete(tab);
	};
	const cleanup = () => {
		window.removeEventListener(EVENT_NAME, onGenerationEvent);
		gBrowser.tabContainer.removeEventListener("TabClose", onTabClose);
		gBrowser.tabContainer.removeEventListener("TabSelect", onTabSelect);
		gBrowser.removeTabsProgressListener(tabsProgressListener);
		for (const tab of [...orbs.keys()]) {
			clearProgressTitle(tab);
			clearCompletionDot(tab);
			hideOrb(tab);
			orbs.delete(tab);
		}
	};
	gBrowser.tabContainer.addEventListener("TabClose", onTabClose);
	gBrowser.tabContainer.addEventListener("TabSelect", onTabSelect);
	gBrowser.addTabsProgressListener(tabsProgressListener);
	window.addEventListener(EVENT_NAME, onGenerationEvent);
	window.addEventListener("unload", cleanup, { once: true });

})();