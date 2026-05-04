import React, { useState, useRef } from "react";

function TermsModal({ onAccept, onDecline }) {
  const [reachedBottom, setReachedBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    const progress = scrollable > 0 ? Math.min((el.scrollTop / scrollable) * 100, 100) : 100;
    setScrollProgress(progress);
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 32) {
      setReachedBottom(true);
    }
  };

  const canAccept = reachedBottom && agreed;

  return (
    <div className="modal-overlay terms-overlay">
      <div className="terms-box">

        <div className="terms-header">
          <div className="terms-brand-row">
            <span className="terms-brand-dot" />
            <span className="terms-brand-name">Stress Book</span>
          </div>
          <h2 className="terms-title">Terms &amp; Conditions</h2>
          <p className="terms-subtitle">
            Please read all the terms below before continuing.
          </p>
        </div>

        <div className="terms-progress-track">
          <div
            className="terms-progress-fill"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        <div className="terms-scroll" ref={scrollRef} onScroll={handleScroll}>

          <section className="terms-section">
            <h3>1. Acceptance</h3>
            <p>By using Stress Book, you agree to these terms. If not, do not use the app.</p>
          </section>

          <section className="terms-section">
            <h3>2. Purpose</h3>
            <p>
              Stress Book allows users to share work-related stress, interact with posts,
              and use a chatbot for general support.
            </p>
            <div className="terms-warning">
              The chatbot is not a licensed therapist.
            </div>
          </section>

          <section className="terms-section">
            <h3>3. User Conduct</h3>
            <p>You agree not to:</p>
            <ul>
              <li>Post harmful, abusive, or misleading content</li>
              <li>Harass or bully others</li>
            </ul>
          </section>

          <section className="terms-section">
            <h3>4. Content Rules</h3>
            <p>Do not post:</p>
            <ul>
              <li>Hate speech or threats</li>
              <li>Explicit or inappropriate content</li>
              <li>False medical or mental health advice</li>
            </ul>
            <p>We may remove content or suspend accounts at any time.</p>
          </section>

          <section className="terms-section">
            <h3>5. Mental Health Disclaimer</h3>
            <p>This is not a medical platform.</p>
            <p>
              For serious issues, consult a licensed professional or emergency service.
            </p>
          </section>

          <section className="terms-section">
            <h3>6. Privacy</h3>
            <p>Your posts may be visible to others.</p>
            <p>Do not share personal or sensitive information.</p>
          </section>

          <section className="terms-section">
            <h3>7. Chatbot Disclaimer</h3>
            <p>Chatbot responses may not always be accurate.</p>
            <p>Do not rely on it for important decisions.</p>
          </section>

          <section className="terms-section">
            <h3>8. Content Ownership</h3>
            <p>
              You own your content but allow us to display it in the app.
            </p>
          </section>

          <section className="terms-section">
            <h3>9. Account Actions</h3>
            <p>We may suspend or terminate accounts for rule violations.</p>
          </section>

          <section className="terms-section">
            <h3>10. Liability</h3>
            <p>
              We are not responsible for user content or outcomes from using the app.
            </p>
          </section>

          <section className="terms-section terms-section-last">
            <h3>11. Updates</h3>
            <p>Terms may change anytime. Continued use means acceptance.</p>
          </section>

        </div>

        {!reachedBottom && (
          <p className="terms-scroll-hint">
            Scroll to the bottom to enable acceptance
          </p>
        )}

        {reachedBottom && (
          <label className="terms-agree-row">
            <input
              type="checkbox"
              className="terms-checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>I have read and agree to the Terms &amp; Conditions</span>
          </label>
        )}

        <div className="terms-actions modal-actions">
          <button className="terms-decline-btn modal-cancel" onClick={onDecline}>
            Decline
          </button>
          <button
            className="terms-accept-btn"
            onClick={onAccept}
            disabled={!canAccept}
          >
            Accept &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default TermsModal;
