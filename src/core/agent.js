'use strict';
// Bounded observe -> propose -> authorize -> execute -> verify loop.
// The executor is injected (real desktop/browser executor or a test fake).
const crypto = require('node:crypto');
const { decide } = require('./policy');

class AgentRun {
  /**
   * deps: {
   *   observe():Promise<{summary,imageDataUrl?}>,
   *   propose(goal, observation, history):Promise<{action|null, done?:boolean, say?:string}>,
   *   execute(action):Promise<void>,
   *   verify(action, before, after):Promise<boolean>,
   *   requestApproval(action, decision):Promise<boolean>,   // UI prompt; true = user approved
   *   onEvent(evt)
   * }
   */
  constructor({ goal, mode, grants = new Set(), maxSteps = 12, timeoutMs = 5 * 60 * 1000, deps }) {
    this.goal = goal; this.mode = mode; this.grants = grants;
    this.maxSteps = maxSteps; this.timeoutMs = timeoutMs; this.deps = deps;
    this.history = []; this.status = 'idle'; this._cancel = false; this._paused = null;
  }

  cancel() { this._cancel = true; if (this._resume) this._resume(); }
  pause() { if (!this._paused) this._paused = new Promise((r) => { this._resume = r; }); this.status = 'paused'; }
  resume() { if (this._resume) { this._resume(); this._paused = null; this._resume = null; } this.status = 'running'; }

  _emit(type, data) { this.deps.onEvent && this.deps.onEvent({ type, ...data }); }

  async run() {
    const started = Date.now();
    this.status = 'running';
    let failures = 0;
    for (let step = 0; step < this.maxSteps; step += 1) {
      if (this._paused) await this._paused;
      if (this._cancel) return this._end('cancelled');
      if (Date.now() - started > this.timeoutMs) return this._end('timeout');
      const before = await this.deps.observe();
      const prop = await this.deps.propose(this.goal, before, this.history);
      if (prop.done) { this._emit('say', { text: prop.say || 'Done.' }); return this._end('completed'); }
      if (!prop.action) return this._end('stalled');
      const action = { id: crypto.randomUUID(), ...prop.action };
      const approved = new Set();
      let d = decide({ mode: this.mode, grants: this.grants, approvedActionIds: approved, provenance: 'model' }, action);
      if (d.handBackToUser) { this._emit('handback', { action, reason: d.reason }); return this._end('needs_user'); }
      if (d.needsApproval) {
        this._emit('approval_needed', { action, risk: d.risk });
        const ok = await this.deps.requestApproval(action, d);
        if (this._cancel) return this._end('cancelled');
        if (!ok) { this.history.push({ action, result: 'declined' }); return this._end('declined'); }
        approved.add(action.id);
        d = decide({ mode: this.mode, grants: this.grants, approvedActionIds: approved, provenance: 'model' }, action);
      }
      if (!d.allow) { this._emit('blocked', { action, reason: d.reason }); return this._end('blocked'); }
      try {
        await this.deps.execute(action);
        const after = await this.deps.observe();
        const verified = await this.deps.verify(action, before, after);
        this.history.push({ action, result: verified ? 'verified' : 'unverified' });
        this._emit('step', { action, verified });
        if (!verified) {
          // Never auto-retry non-idempotent actions (submit/send/purchase...).
          failures += 1;
          if (d.risk === 'sensitive' || failures >= 2) return this._end('needs_user');
        }
      } catch (err) {
        this.history.push({ action, result: 'error' });
        return this._end('error', err);
      }
    }
    return this._end('step_limit');
  }

  _end(status, err) {
    this.status = status;
    this._emit('end', { status, error: err ? String(err.message || err) : undefined, history: this.history });
    return { status, history: this.history };
  }
}

module.exports = { AgentRun };
