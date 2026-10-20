import React from 'react';

export default function Features() {
  return (
    <section className="feat" id="feat" style={{ position: 'relative', width: '1440px', margin: '0 auto', paddingBottom: '120px' }}>
      <div className="feat-rows" id="feat-rows">
        {/* Row 1: Finally do the thing (FL Studio) */}
        <div className="feat-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '60px 80px', gap: '60px' }}>
          <div className="win" style={{ width: '620px', flexShrink: 0 }}>
            <div className="bar">
              <div className="dots">
                <img src="/assets/win-close.png" alt="" />
                <img src="/assets/win-min.png" alt="" />
                <img src="/assets/win-zoom.png" alt="" />
              </div>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>FL Studio</span>
              <img src="/assets/win-x.svg" alt="" />
            </div>
            <div className="screen" style={{ height: '380px', borderRadius: '4px', overflow: 'hidden' }}>
              <video
                src="/assets/clicky-fl.mp4"
                poster="/assets/clicky-fl-poster.webp"
                autoPlay
                muted
                loop
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          <div style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'linear-gradient(180deg, #d6e6ff 0%, #9ec5ff 50%, #d2f1f7 100%)',
                border: '1px solid #221898',
                borderRadius: '20px',
                padding: '12px 20px',
                width: 'fit-content',
                fontSize: '16px',
                fontWeight: 500,
                boxShadow: '0 8px 16px rgba(0,0,0,0.08)'
              }}>
                heyclicky, help me make music on FLStudio
              </div>
              <h2 style={{ fontSize: '42px', fontWeight: 600, letterSpacing: '-1.5px', lineHeight: 1.15, marginTop: '20px' }}>
                finally do the thing
              </h2>
              <p style={{ fontSize: '18px', color: '#555', lineHeight: 1.6 }}>
                from fl studio to claude code, jump into any tool, ask questions and heyclicky draws on your screen and teaches you.
              </p>
            </div>
          </div>
        </div>

        {/* Row 2: Use your screen as context (Preview / Anatomy) */}
        <div className="feat-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '60px 80px', gap: '60px', flexDirection: 'row-reverse' }}>
          <div className="win" style={{ width: '620px', flexShrink: 0 }}>
            <div className="bar">
              <div className="dots">
                <img src="/assets/win-close.png" alt="" />
                <img src="/assets/win-min.png" alt="" />
                <img src="/assets/win-zoom.png" alt="" />
              </div>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>Preview</span>
              <img src="/assets/win-x.svg" alt="" />
            </div>
            <div className="screen" style={{ height: '380px', borderRadius: '4px', overflow: 'hidden' }}>
              <video
                src="/assets/clicky-spatial.mp4"
                poster="/assets/clicky-spatial-poster.webp"
                autoPlay
                muted
                loop
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          <div style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'linear-gradient(180deg, #d6e6ff 0%, #9ec5ff 50%, #d2f1f7 100%)',
                border: '1px solid #221898',
                borderRadius: '20px',
                padding: '12px 20px',
                width: 'fit-content',
                fontSize: '16px',
                fontWeight: 500,
                boxShadow: '0 8px 16px rgba(0,0,0,0.08)'
              }}>
                heyclicky, what's this muscle called?
              </div>
              <div style={{
                background: 'linear-gradient(180deg, #ffe5cf 0%, #ffc696 50%, #ffe9d9 100%)',
                border: '1px solid #ca6510',
                borderRadius: '16px',
                padding: '8px 16px',
                width: 'fit-content',
                fontSize: '15px',
                fontWeight: 600,
                alignSelf: 'flex-start',
                marginLeft: '24px'
              }}>
                on it!
              </div>
              <h2 style={{ fontSize: '42px', fontWeight: 600, letterSpacing: '-1.5px', lineHeight: 1.15, marginTop: '20px' }}>
                use your screen as context
              </h2>
              <p style={{ fontSize: '18px', color: '#555', lineHeight: 1.6 }}>
                if you hit a wall, you can show heyclicky and it'll walk you through the next step.
              </p>
            </div>
          </div>
        </div>

        {/* Row 3: Spawn agents with your voice (Google Sheets) */}
        <div className="feat-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '60px 80px', gap: '60px' }}>
          <div className="win" style={{ width: '620px', flexShrink: 0 }}>
            <div className="bar">
              <div className="dots">
                <img src="/assets/win-close.png" alt="" />
                <img src="/assets/win-min.png" alt="" />
                <img src="/assets/win-zoom.png" alt="" />
              </div>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>Google Sheets</span>
              <img src="/assets/win-x.svg" alt="" />
            </div>
            <div className="screen" style={{ height: '380px', borderRadius: '4px', overflow: 'hidden' }}>
              <video
                src="/assets/clicky-agent.mp4"
                poster="/assets/clicky-agent-poster.webp"
                autoPlay
                muted
                loop
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          <div style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'linear-gradient(180deg, #d6e6ff 0%, #9ec5ff 50%, #d2f1f7 100%)',
                border: '1px solid #221898',
                borderRadius: '20px',
                padding: '12px 20px',
                width: 'fit-content',
                fontSize: '16px',
                fontWeight: 500,
                boxShadow: '0 8px 16px rgba(0,0,0,0.08)'
              }}>
                heyclicky, find 10 tiktok creators perfect for my business
              </div>
              <h2 style={{ fontSize: '42px', fontWeight: 600, letterSpacing: '-1.5px', lineHeight: 1.15, marginTop: '20px' }}>
                spawn agents with your voice
              </h2>
              <p style={{ fontSize: '18px', color: '#555', lineHeight: 1.6 }}>
                we let you spawn ai agents with just your voice no terminal needed. connect your gmail or notion and start doing stuff.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
