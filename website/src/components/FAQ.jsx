import React, { useState } from 'react';

const faqs = [
  {
    q: "what is heyclicky?",
    a: "an ai buddy that lives on your mac. press the hotkey and it sees what you see, so you can ask it anything out loud and it’ll walk you through whatever you’re working on, or say “heyclicky agent” and it’ll go do the task for you."
  },
  {
    q: "is my data private?",
    a: "yes. we only see your screen when you press the hotkey, and screenshots are never stored. we do keep basic text summaries so heyclicky has context. you can delete your account and all its data in settings."
  },
  {
    q: "is heyclicky watching my screen all the time?",
    a: "no. we never look at your screen unless you press the hotkey."
  },
  {
    q: "what can heyclicky actually do?",
    a: "it teaches you any tool, walks you through whatever you’re stuck on, draws right on your screen to point the way, and runs agents to do tasks for you."
  },
  {
    q: "what’s the difference between talk and agents?",
    a: "talk is the conversation. ask anything, out loud, as much as you want. agents are heyclicky actually doing tasks for you, and those are counted per month on each plan."
  },
  {
    q: "which apps does it work with?",
    a: "anything on your screen. if you can see it, heyclicky can see it. no plugins or integrations needed."
  },
  {
    q: "do i need a mac?",
    a: "for now, yes. heyclicky is mac-only (sonoma 14.2 or higher). windows is coming, join the waitlist."
  },
  {
    q: "is it free?",
    a: "you can start for free. when you’re ready for more, pro is $20/month and max is $100/month. cancel anytime."
  },
  {
    q: "what happens if i hit my agent limit?",
    a: "talk keeps working, always. agent messages pause until your next cycle, or you can upgrade to max for 1,000 a month."
  },
  {
    q: "can i cancel anytime?",
    a: "yes. everything is month-to-month, no lock-in. cancel in one click and keep access through the end of your cycle."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleItem = (idx) => {
    setOpenIndex(openIndex === idx ? -1 : idx);
  };

  return (
    <section className="faq" style={{ position: 'relative', width: '1440px', margin: '0 auto', paddingBottom: '120px' }}>
      <div className="faq-topline" aria-hidden="true"></div>
      <div className="faq-plabel reveal rv-late">faq</div>

      <video
        className="faq-gif no-drag reveal"
        src="/assets/faq-office.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      <h2 className="faq-title reveal rv-late">frequently asked questions</h2>
      <p className="faq-sub reveal rv-late">what to know about heyclicky, privacy, and getting started.</p>

      <div className="faq-list reveal">
        {faqs.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`faq-item ${isOpen ? 'open' : ''}`}
              role="button"
              aria-expanded={isOpen}
              tabIndex={0}
              onClick={() => toggleItem(idx)}
            >
              <div className="faq-row">
                <div className="faq-text">
                  <p className="faq-q">{item.q}</p>
                  <div
                    className="faq-a-wrap"
                    style={{
                      gridTemplateRows: isOpen ? '1fr' : '0fr',
                      opacity: isOpen ? 1 : 0
                    }}
                  >
                    <div className="faq-a-clip">
                      <p className="faq-a">{item.a}</p>
                    </div>
                  </div>
                </div>
                <svg
                  className="faq-icon"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  style={{ transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s ease' }}
                >
                  <path d="M10 3.5V16.5M3.5 10H16.5" stroke="#000" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
