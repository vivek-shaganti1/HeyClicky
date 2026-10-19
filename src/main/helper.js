'use strict';
// Bridge to the native clicky-helper (JSON lines over stdio). Optional: the app works without it.
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { app } = require('electron');
const { EventEmitter } = require('node:events');

class Helper extends EventEmitter {
  constructor() { super(); this.proc = null; this.pending = new Map(); this.rid = 0; this.buf = ''; this.trusted = false; }

  binPath() {
    const packaged = path.join(process.resourcesPath || '', 'clicky-helper');
    const dev = path.join(app.getAppPath(), 'bin', 'clicky-helper');
    return app.isPackaged && fs.existsSync(packaged) ? packaged : dev;
  }

  start() {
    const bin = this.binPath();
    if (!fs.existsSync(bin)) { console.log('[helper] not built; run `npm run build:helper`. Using fallbacks.'); return false; }
    this.proc = spawn(bin, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc.stdout.on('data', (d) => this._data(d));
    this.proc.stderr.on('data', () => {});
    this.proc.on('exit', (code) => {
      console.log('[helper] exited', code);
      for (const { reject, timer } of this.pending.values()) { clearTimeout(timer); reject(new Error('helper exited')); }
      this.pending.clear(); this.proc = null;
    });
    return true;
  }

  stop() { if (this.proc) { this.proc.stdin.end(); this.proc.kill(); this.proc = null; } }
  get running() { return !!this.proc; }

  _data(d) {
    this.buf += d.toString('utf8');
    let i;
    while ((i = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, i); this.buf = this.buf.slice(i + 1);
      let msg; try { msg = JSON.parse(line); } catch { continue; }
      if (msg.event) {
        if (msg.event === 'ready') this.trusted = !!msg.trusted;
        this.emit(msg.event, msg);
      } else if (msg.rid && this.pending.has(msg.rid)) {
        const p = this.pending.get(msg.rid); this.pending.delete(msg.rid); clearTimeout(p.timer); p.resolve(msg);
      }
    }
  }

  call(cmd, args = {}, timeoutMs = 4000) {
    if (!this.proc) return Promise.resolve({ ok: false, error: 'helper_unavailable' });
    const rid = ++this.rid;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(rid); resolve({ ok: false, error: 'helper_timeout' }); }, timeoutMs);
      this.pending.set(rid, { resolve, reject, timer });
      this.proc.stdin.write(`${JSON.stringify({ cmd, rid, ...args })}\n`);
    });
  }
}

module.exports = { Helper };
