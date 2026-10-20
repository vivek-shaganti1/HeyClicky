import React, { useState } from 'react';

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section className="pr" id="pr" style={{ position: 'relative', width: '1440px', margin: '0 auto', paddingBottom: '120px' }}>
      <div className="pr-parallax" style={{ transform: 'translateY(24px)' }}>
        <div className="pr-header reveal rv-late">
          <div className="pr-plabel">pricing</div>
          <h2 className="pr-title">heyclicky, your way</h2>
          <p className="pr-sub">three simple plans, cancel anytime.</p>
        </div>

        {/* Toggle */}
        <div className="pr-toggle reveal rv-late" role="tablist" aria-label="billing period">
          <button
            type="button"
            role="tab"
            aria-selected={!isYearly}
            className={`pr-seg pr-seg-month ${!isYearly ? 'on' : ''}`}
            onClick={() => setIsYearly(false)}
          >
            {!isYearly && (
              <span className="pr-seg-pill" aria-hidden="true">
                <span className="pr-seg-pill-inner">
                  <span className="pr-seg-gloss"></span>
                </span>
              </span>
            )}
            <span className="pr-seg-label">monthly</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isYearly}
            className={`pr-seg pr-seg-year ${isYearly ? 'on' : ''}`}
            onClick={() => setIsYearly(true)}
          >
            {isYearly && (
              <span className="pr-seg-pill" aria-hidden="true">
                <span className="pr-seg-pill-inner">
                  <span className="pr-seg-gloss"></span>
                </span>
              </span>
            )}
            <span className="pr-seg-label">yearly</span>
            <span className="pr-chip">-20%</span>
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="pr-cards reveal">
          {/* FREE PLAN */}
          <div className="pr-card pr-card-free">
            <div className="pr-card-bar">
              <span className="pr-dots">
                <img className="no-drag" src="/assets/win-close.png" alt="" />
                <img className="no-drag" src="/assets/win-min.png" alt="" />
                <img className="no-drag" src="/assets/win-zoom.png" alt="" />
              </span>
            </div>
            <div className="pr-card-body">
              <div className="pr-card-head">
                <p className="pr-card-title">free</p>
              </div>
              <div className="pr-card-tag">
                <p className="pr-card-tagline">see what the fuss is about.</p>
                <p className="pr-card-subtag">best for trying it out</p>
              </div>
              <div className="pr-divider"></div>
              <div className="pr-price-block">
                <div className="pr-price-lines">
                  <span className="pr-price-row">
                    <span className="pr-price-slot" role="img" aria-label="$0">
                      <span className="pr-price-col">
                        <span className="pr-price-char">$</span>
                      </span>
                      <span className="pr-price-col">
                        <span className="pr-price-char">0</span>
                      </span>
                    </span>
                  </span>
                  <p className="pr-price-note">free forever, no card needed</p>
                </div>
                <a
                  className="btn os-win pr-cta"
                  href="https://github.com/farzaa/clicky-releases/releases/latest/download/HeyClicky.dmg"
                  download
                  data-placement="pricing"
                  data-plan="free"
                >
                  <div className="gloss no-drag"></div>
                  <span>start free</span>
                </a>
              </div>
              <div className="pr-divider"></div>
              <div className="pr-inc">
                <p className="pr-inc-label">includes</p>
                <div className="pr-inc-row">
                  <img className="pr-inc-check no-drag" src="/assets/pr-check.svg" alt="" />
                  <span className="pr-inc-text">25 talk messages a month</span>
                </div>
                <div className="pr-inc-row">
                  <img className="pr-inc-check no-drag" src="/assets/pr-check.svg" alt="" />
                  <span className="pr-inc-text">plenty of dictation</span>
                </div>
                <div className="pr-inc-row">
                  <img className="pr-inc-check no-drag" src="/assets/pr-check.svg" alt="" />
                  <span className="pr-inc-text">25 agent messages a month</span>
                </div>
              </div>
            </div>
          </div>

          {/* PRO PLAN */}
          <div className="pr-card pr-card-pro">
            <div className="pr-badge">popular</div>
            <div className="pr-card-bar">
              <span className="pr-dots">
                <img className="no-drag" src="/assets/win-close.png" alt="" />
                <img className="no-drag" src="/assets/win-min.png" alt="" />
                <img className="no-drag" src="/assets/win-zoom.png" alt="" />
              </span>
            </div>
            <div className="pr-card-body">
              <div className="pr-card-head">
                <p className="pr-card-title">pro</p>
              </div>
              <div className="pr-card-tag">
                <p className="pr-card-tagline">talk as much as you want.</p>
                <p className="pr-card-subtag">best for everyday use</p>
              </div>
              <div className="pr-divider"></div>
              <div className="pr-price-block">
                <div className="pr-price-lines">
                  <span className="pr-price-row">
                    <span className="pr-price-slot" role="img" aria-label={isYearly ? "$16" : "$20"}>
                      <span className="pr-price-col">
                        <span className="pr-price-char">$</span>
                      </span>
                      <span className="pr-price-col">
                        <span className="pr-price-char">{isYearly ? "1" : "2"}</span>
                      </span>
                      <span className="pr-price-col">
                        <span className="pr-price-char">{isYearly ? "6" : "0"}</span>
                      </span>
                    </span>
                  </span>
                  <p className="pr-price-note">{isYearly ? "per month, billed annually" : "per month, billed monthly"}</p>
                </div>
                <a
                  className="btn mac pr-cta"
                  href="https://github.com/farzaa/clicky-releases/releases/latest/download/HeyClicky.dmg"
                  download
                  data-placement="pricing"
                  data-plan="pro"
                >
                  <div className="gloss no-drag"></div>
                  <span>get pro</span>
                </a>
              </div>
              <div className="pr-divider"></div>
              <div className="pr-inc">
                <p className="pr-inc-label">includes</p>
                <div className="pr-inc-row">
                  <img className="pr-inc-check no-drag" src="/assets/pr-check.svg" alt="" />
                  <span className="pr-inc-text">unlimited talk</span>
                </div>
                <div className="pr-inc-row">
                  <img className="pr-inc-check no-drag" src="/assets/pr-check.svg" alt="" />
                  <span className="pr-inc-text">unlimited dictation</span>
                </div>
                <div className="pr-inc-row">
                  <img className="pr-inc-check no-drag" src="/assets/pr-check.svg" alt="" />
                  <span className="pr-inc-text">150 agent messages a month</span>
                </div>
              </div>
            </div>
          </div>

          {/* MAX PLAN */}
          <div className="pr-card pr-card-max">
            <div className="pr-card-bar">
              <span className="pr-dots">
                <img className="no-drag" src="/assets/win-close.png" alt="" />
                <img className="no-drag" src="/assets/win-min.png" alt="" />
                <img className="no-drag" src="/assets/win-zoom.png" alt="" />
              </span>
            </div>
            <div className="pr-card-body">
              <div className="pr-card-head">
                <p className="pr-card-title">max</p>
              </div>
              <div className="pr-card-tag">
                <p className="pr-card-tagline">all the hands you need.</p>
                <p className="pr-card-subtag">best for power users</p>
              </div>
              <div className="pr-divider"></div>
              <div className="pr-price-block">
                <div className="pr-price-lines">
                  <span className="pr-price-row">
                    <span className="pr-price-slot" role="img" aria-label={isYearly ? "$80" : "$100"}>
                      <span className="pr-price-col">
                        <span className="pr-price-char">$</span>
                      </span>
                      {isYearly ? (
                        <>
                          <span className="pr-price-col">
                            <span className="pr-price-char">8</span>
                          </span>
                          <span className="pr-price-col">
                            <span className="pr-price-char">0</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="pr-price-col">
                            <span className="pr-price-char">1</span>
                          </span>
                          <span className="pr-price-col">
                            <span className="pr-price-char">0</span>
                          </span>
                          <span className="pr-price-col">
                            <span className="pr-price-char">0</span>
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                  <p className="pr-price-note">{isYearly ? "per month, billed annually" : "per month, billed monthly"}</p>
                </div>
                <a
                  className="btn os-win pr-cta"
                  href="https://github.com/farzaa/clicky-releases/releases/latest/download/HeyClicky.dmg"
                  download
                  data-placement="pricing"
                  data-plan="max"
                >
                  <div className="gloss no-drag"></div>
                  <span>get max</span>
                </a>
              </div>
              <div className="pr-divider"></div>
              <div className="pr-inc">
                <p className="pr-inc-label">includes</p>
                <div className="pr-inc-row">
                  <img className="pr-inc-check no-drag" src="/assets/pr-check.svg" alt="" />
                  <span className="pr-inc-text">unlimited talk</span>
                </div>
                <div className="pr-inc-row">
                  <img className="pr-inc-check no-drag" src="/assets/pr-check.svg" alt="" />
                  <span className="pr-inc-text">unlimited dictation</span>
                </div>
                <div className="pr-inc-row">
                  <img className="pr-inc-check no-drag" src="/assets/pr-check.svg" alt="" />
                  <span className="pr-inc-text">1,000 agent messages a month</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cap Stickers */}
        <img className="pr-cap-sticker no-drag" src="/assets/pr-cap.png" alt="" />
        <img className="pr-nocap no-drag" src="/assets/pr-nocap.svg" alt="no cap!" />

        {/* Student Discount Panel */}
        <div className="pr-builder-wrap reveal rv-late2">
          <div className="pr-builder">
            <div className="pr-builder-bar">
              <span className="pr-dots">
                <img className="no-drag" src="/assets/win-close.png" alt="" />
                <img className="no-drag" src="/assets/win-min.png" alt="" />
                <img className="no-drag" src="/assets/win-zoom.png" alt="" />
              </span>
            </div>
            <div className="pr-builder-panel">
              <div className="pr-builder-row">
                <div className="pr-builder-copy">
                  <p className="pr-builder-title">&lt; student discount &gt;<span className="pr-builder-caret" aria-hidden="true"></span></p>
                  <p className="pr-builder-sub">if you're a student, show us your school email or student id! we'll give you 50% off your first month on pro to help you out *</p>
                </div>
                <a className="btn os-win pr-builder-btn" href="https://tally.so/r/BzVE6R" target="_blank" rel="noopener noreferrer">
                  <div className="gloss no-drag"></div>
                  <span>reach out to us</span>
                </a>
              </div>
            </div>
          </div>
          <p className="pr-builder-foot">* open to new and existing subs.</p>
          <img className="pr-builder-ship no-drag" src="/assets/pr-justshipit.png" alt="" />
          <img className="pr-builder-octocat no-drag" src="/assets/pr-octocat.svg" alt="" />
          <img className="pr-builder-robot no-drag" src="/assets/pr-robot.svg" alt="" />
        </div>
      </div>
    </section>
  );
}
