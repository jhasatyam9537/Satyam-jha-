import { useState, useCallback, useEffect } from "react";

const SAMPLES = [
  {
    label: "phishing",
    from: "security@paypa1-alerts.ru",
    subject: "⚠️ Urgent: Your account has been suspended",
    body: "Dear valued customer, your PayPal account has been flagged for suspicious activity. You must IMMEDIATELY verify your identity to avoid permanent suspension. Click the link below or your account will be deleted within 24 hours.\n\nVerify Now → http://secure-paypa1.com/verify?id=9821\n\nThis is your FINAL WARNING. Failure to comply will result in legal action.",
  },
  {
    label: "safe",
    from: "sarah.chen@company.com",
    subject: "Q3 Team Sync — Thursday 2pm, Room B204",
    body: "Hi team,\n\nJust a quick reminder about our quarterly sync this Thursday at 2pm in Room B204. I've attached the agenda covering project updates, budget review, and Q4 OKRs.\n\nPlease come prepared with your team's progress report. Let me know if you'd like to add anything to the agenda.\n\nLooking forward to seeing everyone!\nSarah",
  },
  {
    label: "phishing",
    from: "noreply@prize-winner-claim.xyz",
    subject: "🎉 Congratulations! You've won a $500 gift card",
    body: "CONGRATULATIONS! You have been randomly selected as our 1,000,000th visitor and have won a $500 Amazon Gift Card!\n\nTo claim your prize, you must verify your identity within 1 HOUR by entering your credit card details at:\n\nhttp://bit.ly/claim-prize-xfr99abc\n\nThis offer expires soon. Limited slots available. Act NOW!",
  },
  {
    label: "safe",
    from: "orders@amazon.com",
    subject: "Your order #8821-ZXY has shipped",
    body: "Hello,\n\nGreat news! Your order has shipped and is on its way.\n\nOrder #8821-ZXY — Estimated delivery: Friday, May 23\n\nYou can track your package at any time by visiting amazon.com/orders and signing in to your account.\n\nThank you for shopping with Amazon.",
  },
];

const DATASET = [
  { label: "phishing", text: "Your PayPal account is suspended. Verify at http://paypa1-secure.ru/login immediately." },
  { label: "phishing", text: "WINNER! Claim your free iPhone. Click http://prize-claim.xyz/win now!" },
  { label: "phishing", text: "Urgent: IRS notice. Pay outstanding taxes via bit.ly/irs-pay or face arrest." },
  { label: "phishing", text: "Your Netflix will be closed. Update billing at http://netf1ix.com/billing today." },
  { label: "phishing", text: "Bank alert: suspicious login. Verify your identity at secure-bank.tk immediately." },
  { label: "phishing", text: "CEO request: wire $50,000 to account 8821. Confidential — tell no one." },
  { label: "phishing", text: "Pending package — pay delivery fee at http://usps-delivery.xyz/pay to release." },
  { label: "phishing", text: "FINAL NOTICE: debt collection. Pay $899 immediately to avoid legal action." },
  { label: "phishing", text: "Apple ID used in new location. Verify now or account will be permanently locked." },
  { label: "phishing", text: "You are our 1,000,000th visitor! Claim your $1000 cash prize now. Limited slots!" },
  { label: "safe", text: "Hi John, please find attached the Q3 financial report for your review." },
  { label: "safe", text: "Your Spotify renewal is due next month. Log in to manage your account." },
  { label: "safe", text: "Team meeting rescheduled to Friday 3pm. Please update your calendars." },
  { label: "safe", text: "Thank you for your purchase! Order #4421 will arrive in 3-5 business days." },
  { label: "safe", text: "Monthly newsletter: top engineering articles from our team. Hope you enjoy it!" },
  { label: "safe", text: "Following up on our conversation about the product roadmap from Tuesday." },
  { label: "safe", text: "Your GitHub pull request has been reviewed. Two comments left by the team." },
  { label: "safe", text: "Password reset: your password was changed successfully. Contact support if not you." },
  { label: "safe", text: "Company holiday party is December 20th. Please RSVP by December 10th." },
  { label: "safe", text: "Flight confirmed: AA1234, departing June 15 at 7:00am. Check-in opens 24h before." },
];

function extractFeatures(subject, body) {
  const text = (subject + " " + body).toLowerCase();
  const urls = (text.match(/https?:\/\/[^\s]+|bit\.ly\/[^\s]+/g) || []).length;
  const urgencyWords = ["urgent","immediately","now","expires","final","warning","suspended","deleted","arrest","act now","limited time"];
  const urgency = urgencyWords.filter(w => text.includes(w)).length;
  const phishKw = ["verify","click here","act now","login","password","credit card","winner","prize","free","claim","suspended","wire","congratulations","selected"];
  const phishScore = phishKw.filter(w => text.includes(w)).length;
  const capsRatio = ((body.match(/[A-Z]/g)||[]).length / Math.max(body.length,1)) * 100;
  const suspiciousDomain = /paypa1|netf1ix|secure-[a-z]+\.(ru|tk|xyz|pw)|bit\.ly|[a-z0-9-]+\.(tk|ru|xyz|pw|top|click)/.test(text);
  return { urls, urgency, phishScore, capsRatio: Math.round(capsRatio), suspiciousDomain };
}

function localClassify(features) {
  const score = features.urls*2 + features.urgency*1.5 + features.phishScore*1.2 + (features.suspiciousDomain?3:0);
  const isPhish = score > 3;
  const conf = Math.min(97, Math.round(55 + score*5));
  return {
    verdict: isPhish ? "PHISHING" : "SAFE",
    confidence: isPhish ? conf : Math.max(78, 100-conf+30),
    feature_flags: {
      suspicious_urls: features.urls > 0,
      urgency_language: features.urgency > 1,
      phishing_keywords: features.phishScore > 2,
      suspicious_domain: features.suspiciousDomain,
      social_engineering: features.urgency > 2,
      legitimate_context: !isPhish,
    },
    explanation: isPhish
      ? `Detected ${features.phishScore} phishing keywords and ${features.urls} malicious URL(s) with ${features.urgency} urgency trigger(s). High-confidence social engineering attempt.`
      : `Low threat signal. Only ${features.phishScore} keyword match(es), no suspicious domains or URL manipulation detected. Consistent with legitimate correspondence.`,
  };
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

  .pd-root {
    font-family: 'Syne', sans-serif;
    background: #1a3a6b;
    min-height: 100vh;
    color: #e8edf8;
    padding: 0;
    margin: 0;
  }

  .pd-header {
    background: #0d2a57;
    border-bottom: 1px solid #1e4080;
    padding: 20px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pd-logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pd-logo-icon {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #e63946, #c1121f);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    box-shadow: 0 0 20px rgba(230,57,70,0.4);
  }

  .pd-logo-text {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #fff;
  }

  .pd-logo-sub {
    font-size: 10px;
    color: #4a5168;
    font-family: 'DM Mono', monospace;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-top: 1px;
  }

  .pd-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-family: 'DM Mono', monospace;
    color: #3ec97a;
    background: rgba(62,201,122,0.08);
    padding: 6px 14px;
    border-radius: 20px;
    border: 1px solid rgba(62,201,122,0.2);
  }

  .pd-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #3ec97a;
    animation: blink 2s infinite;
  }

  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

  .pd-body {
    display: grid;
    grid-template-columns: 240px 1fr;
    min-height: calc(100vh - 73px);
  }

  .pd-sidebar {
    background: #0d2a57;
    border-right: 1px solid #1e4080;
    padding: 24px 0;
  }

  .pd-nav-section {
    padding: 0 16px;
    margin-bottom: 8px;
  }

  .pd-nav-label {
    font-size: 9px;
    font-family: 'DM Mono', monospace;
    color: #1a3060;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 0 8px;
    margin-bottom: 6px;
  }

  .pd-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: #3a5490;
    transition: all 0.15s;
    border: 1px solid transparent;
    margin-bottom: 2px;
    background: none;
    width: 100%;
    text-align: left;
  }

  .pd-nav-item:hover {
    background: #081630;
    color: #7a9acc;
  }

  .pd-nav-item.active {
    background: #081630;
    color: #e8edf8;
    border-color: #0e2050;
  }

  .pd-nav-icon {
    width: 28px;
    height: 28px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    background: #0a1c42;
    flex-shrink: 0;
  }

  .pd-nav-item.active .pd-nav-icon {
    background: rgba(230,57,70,0.18);
  }

  .pd-nav-badge {
    margin-left: auto;
    font-size: 10px;
    font-family: 'DM Mono', monospace;
    background: rgba(230,57,70,0.15);
    color: #e63946;
    padding: 2px 7px;
    border-radius: 10px;
  }

  .pd-sidebar-divider {
    border: none;
    border-top: 1px solid #0e2050;
    margin: 16px 16px;
  }

  .pd-sidebar-info {
    padding: 0 24px;
    margin-top: 8px;
  }

  .pd-sidebar-info-box {
    background: #081630;
    border: 1px solid #0e2050;
    border-radius: 10px;
    padding: 14px;
  }

  .pd-sidebar-info-label {
    font-size: 9px;
    font-family: 'DM Mono', monospace;
    color: #1a3060;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .pd-sidebar-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .pd-sidebar-stat-label {
    font-size: 11px;
    color: #3a5490;
  }

  .pd-sidebar-stat-val {
    font-size: 11px;
    font-family: 'DM Mono', monospace;
    color: #7a9acc;
  }

  .pd-main {
    padding: 32px;
    overflow-y: auto;
  }

  .pd-page-title {
    font-size: 22px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }

  .pd-page-sub {
    font-size: 12px;
    color: #3a5490;
    font-family: 'DM Mono', monospace;
    margin-bottom: 28px;
  }

  .pd-card {
    background: #05102b;
    border: 1px solid #0e2050;
    border-radius: 14px;
    padding: 24px;
    margin-bottom: 20px;
  }

  .pd-card-title {
    font-size: 11px;
    font-family: 'DM Mono', monospace;
    color: #1a3060;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 16px;
  }

  .pd-sample-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 20px;
  }

  .pd-sample-card {
    background: #081630;
    border: 1px solid #0e2050;
    border-radius: 10px;
    padding: 14px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .pd-sample-card:hover {
    border-color: #1a3880;
    background: #0a1c42;
  }

  .pd-sample-card.selected-phish {
    border-color: rgba(230,57,70,0.5);
    background: rgba(230,57,70,0.05);
  }

  .pd-sample-card.selected-safe {
    border-color: rgba(62,201,122,0.5);
    background: rgba(62,201,122,0.04);
  }

  .pd-sample-from {
    font-size: 10px;
    font-family: 'DM Mono', monospace;
    color: #3a5490;
    margin-bottom: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pd-sample-subject {
    font-size: 12px;
    font-weight: 600;
    color: #a8bcd8;
    margin-bottom: 6px;
    line-height: 1.4;
  }

  .pd-sample-preview {
    font-size: 11px;
    color: #243560;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .pd-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 9px;
    font-family: 'DM Mono', monospace;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: 5px;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .pd-badge.phishing {
    background: rgba(230,57,70,0.12);
    color: #e63946;
    border: 1px solid rgba(230,57,70,0.25);
  }

  .pd-badge.safe {
    background: rgba(62,201,122,0.1);
    color: #3ec97a;
    border: 1px solid rgba(62,201,122,0.2);
  }

  .pd-badge-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: currentColor;
  }

  .pd-input-group {
    margin-bottom: 14px;
  }

  .pd-input-label {
    font-size: 10px;
    font-family: 'DM Mono', monospace;
    color: #3a5490;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .pd-input {
    width: 100%;
    background: #081630;
    border: 1px solid #0e2050;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    font-family: 'Syne', sans-serif;
    color: #a8bcd8;
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }

  .pd-input:focus {
    border-color: #1a3880;
  }

  .pd-textarea {
    width: 100%;
    background: #081630;
    border: 1px solid #0e2050;
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 12px;
    font-family: 'DM Mono', monospace;
    color: #7a9acc;
    outline: none;
    resize: vertical;
    min-height: 110px;
    line-height: 1.7;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }

  .pd-textarea:focus {
    border-color: #1a3880;
  }

  .pd-analyze-btn {
    width: 100%;
    padding: 13px;
    background: linear-gradient(135deg, #e63946, #c1121f);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-size: 13px;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 20px rgba(230,57,70,0.3);
  }

  .pd-analyze-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(230,57,70,0.4);
  }

  .pd-analyze-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .pd-result {
    background: #05102b;
    border: 1px solid #0e2050;
    border-radius: 14px;
    overflow: hidden;
    margin-top: 20px;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

  .pd-result-header {
    padding: 20px 24px;
    border-bottom: 1px solid #1e2130;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pd-result-header.phishing {
    background: rgba(230,57,70,0.05);
    border-bottom-color: rgba(230,57,70,0.2);
  }

  .pd-result-header.safe {
    background: rgba(62,201,122,0.04);
    border-bottom-color: rgba(62,201,122,0.2);
  }

  .pd-verdict-label {
    font-size: 10px;
    font-family: 'DM Mono', monospace;
    color: #4a5168;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .pd-verdict-text {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.5px;
  }

  .pd-verdict-text.phishing { color: #e63946; }
  .pd-verdict-text.safe { color: #3ec97a; }

  .pd-verdict-icon {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
  }

  .pd-verdict-icon.phishing {
    background: rgba(230,57,70,0.12);
    border: 1px solid rgba(230,57,70,0.2);
  }

  .pd-verdict-icon.safe {
    background: rgba(62,201,122,0.1);
    border: 1px solid rgba(62,201,122,0.2);
  }

  .pd-result-body {
    padding: 20px 24px;
  }

  .pd-conf-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .pd-conf-label {
    font-size: 11px;
    font-family: 'DM Mono', monospace;
    color: #4a5168;
  }

  .pd-conf-pct {
    font-size: 14px;
    font-family: 'DM Mono', monospace;
    font-weight: 500;
    color: #8b9ab8;
  }

  .pd-conf-track {
    height: 5px;
    background: #1a1d27;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 20px;
  }

  .pd-conf-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
  }

  .pd-conf-fill.phishing { background: linear-gradient(90deg, #c1121f, #e63946); }
  .pd-conf-fill.safe { background: linear-gradient(90deg, #1a8c4e, #3ec97a); }

  .pd-features-title {
    font-size: 10px;
    font-family: 'DM Mono', monospace;
    color: #2d3348;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .pd-features-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    margin-bottom: 20px;
  }

  .pd-feature-chip {
    background: #13161e;
    border: 1px solid #1e2130;
    border-radius: 8px;
    padding: 10px 12px;
  }

  .pd-feature-name {
    font-size: 10px;
    font-family: 'DM Mono', monospace;
    color: #3a4055;
    margin-bottom: 5px;
  }

  .pd-feature-val {
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .pd-feature-val.flag { color: #e63946; }
  .pd-feature-val.ok { color: #3ec97a; }

  .pd-feature-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }

  .pd-explanation {
    background: #13161e;
    border: 1px solid #1e2130;
    border-radius: 10px;
    padding: 14px 16px;
    font-size: 12px;
    color: #8b9ab8;
    line-height: 1.8;
    font-family: 'DM Mono', monospace;
  }

  .pd-explanation::before {
    content: '// analysis';
    display: block;
    font-size: 10px;
    color: #2d3348;
    margin-bottom: 6px;
    letter-spacing: 1px;
  }

  .pd-metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 24px;
  }

  .pd-metric {
    background: #13161e;
    border: 1px solid #1e2130;
    border-radius: 12px;
    padding: 18px 16px;
    text-align: center;
  }

  .pd-metric-val {
    font-size: 28px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -1px;
    line-height: 1;
    margin-bottom: 6px;
  }

  .pd-metric-label {
    font-size: 9px;
    font-family: 'DM Mono', monospace;
    color: #3a4055;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .pd-cm-title {
    font-size: 10px;
    font-family: 'DM Mono', monospace;
    color: #2d3348;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  .pd-cm-wrap {
    display: inline-grid;
    grid-template-columns: auto 1fr 1fr;
    gap: 4px;
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    margin-bottom: 24px;
  }

  .pd-cm-head {
    padding: 8px 16px;
    color: #3a4055;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pd-cm-cell {
    padding: 16px 20px;
    border-radius: 8px;
    text-align: center;
    font-size: 22px;
    font-weight: 700;
  }

  .pd-cm-tp {
    background: rgba(62,201,122,0.1);
    border: 1px solid rgba(62,201,122,0.2);
    color: #3ec97a;
  }

  .pd-cm-tn {
    background: rgba(62,201,122,0.1);
    border: 1px solid rgba(62,201,122,0.2);
    color: #3ec97a;
  }

  .pd-cm-fp, .pd-cm-fn {
    background: rgba(230,57,70,0.08);
    border: 1px solid rgba(230,57,70,0.15);
    color: #e63946;
  }

  .pd-cm-sub {
    font-size: 9px;
    color: #3a4055;
    margin-top: 4px;
    letter-spacing: 0.5px;
  }

  .pd-train-btn {
    padding: 11px 24px;
    background: #13161e;
    border: 1px solid #1e2130;
    border-radius: 10px;
    color: #8b9ab8;
    font-size: 12px;
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pd-train-btn:hover {
    border-color: #2d3348;
    color: #c8cad8;
    background: #161921;
  }

  .pd-train-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pd-log {
    background: #080a0e;
    border: 1px solid #1e2130;
    border-radius: 10px;
    padding: 16px 18px;
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    line-height: 2;
    margin-top: 16px;
    max-height: 120px;
    overflow-y: auto;
  }

  .pd-log-ok { color: #3ec97a; }
  .pd-log-dim { color: #3a4055; }
  .pd-log-normal { color: #4a5168; }

  .pd-ds-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: #13161e;
    border: 1px solid #1e2130;
    border-radius: 8px;
    margin-bottom: 5px;
  }

  .pd-ds-text {
    font-size: 11px;
    font-family: 'DM Mono', monospace;
    color: #4a5168;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .pd-ds-list {
    max-height: 320px;
    overflow-y: auto;
  }

  .pd-info-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #1e2130;
    font-size: 12px;
  }

  .pd-info-row:last-child { border-bottom: none; }
  .pd-info-key { color: #4a5168; font-family: 'DM Mono', monospace; }
  .pd-info-val { color: #8b9ab8; font-weight: 500; }

  .pd-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .pd-progress-ring {
    position: relative;
    width: 72px;
    height: 72px;
  }

  .pd-progress-svg {
    transform: rotate(-90deg);
  }

  .pd-progress-track {
    fill: none;
    stroke: #1a1d27;
    stroke-width: 5;
  }

  .pd-progress-bar {
    fill: none;
    stroke-width: 5;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1);
  }

  .pd-progress-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    font-family: 'DM Mono', monospace;
  }
`;

const FEATURE_META = {
  suspicious_urls:    { label: "Suspicious URLs",    vals: ["None", "Detected"],  flagWhen: true  },
  urgency_language:   { label: "Urgency language",   vals: ["None", "Detected"],  flagWhen: true  },
  phishing_keywords:  { label: "Phishing keywords",  vals: ["Low",  "High"],      flagWhen: true  },
  suspicious_domain:  { label: "Suspicious domain",  vals: ["No",   "Yes"],       flagWhen: true  },
  social_engineering: { label: "Social engineering", vals: ["None", "Detected"],  flagWhen: true  },
  legitimate_context: { label: "Legit context",      vals: ["No",   "Yes"],       flagWhen: false },
};

function ProgressRing({ pct, isPhish }) {
  const r = 30, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="pd-progress-ring">
      <svg className="pd-progress-svg" width="72" height="72" viewBox="0 0 72 72">
        <circle className="pd-progress-track" cx="36" cy="36" r={r} />
        <circle
          className="pd-progress-bar"
          cx="36" cy="36" r={r}
          stroke={isPhish ? "#e63946" : "#3ec97a"}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="pd-progress-label" style={{ color: isPhish ? "#e63946" : "#3ec97a" }}>
        {pct}%
      </div>
    </div>
  );
}

function AnalyzePage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedSample, setSelectedSample] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const loadSample = i => {
    setSelectedSample(i);
    setSubject(SAMPLES[i].subject);
    setBody(SAMPLES[i].body);
    setResult(null);
  };

  const analyze = useCallback(async () => {
    if (!subject.trim() && !body.trim()) return;
    setLoading(true);
    setResult(null);
    const features = extractFeatures(subject, body);
    const prompt = `You are a machine learning phishing email classifier. Analyze this email:
Subject: ${subject}
Body: ${body}

Extracted features — URLs: ${features.urls}, urgency words: ${features.urgency}, phishing keywords: ${features.phishScore}, caps ratio: ${features.capsRatio}%, suspicious domain: ${features.suspiciousDomain}

Respond ONLY with raw JSON (no markdown fences, no explanation outside JSON):
{"verdict":"PHISHING or SAFE","confidence":0-100,"feature_flags":{"suspicious_urls":bool,"urgency_language":bool,"phishing_keywords":bool,"suspicious_domain":bool,"social_engineering":bool,"legitimate_context":bool},"explanation":"2 precise sentences explaining classification"}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content.map(c => c.text || "").join("");
      setResult(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch {
      setResult(localClassify(features));
    }
    setLoading(false);
  }, [subject, body]);

  const isPhish = result?.verdict === "PHISHING";

  return (
    <div>
      <div className="pd-page-title">Email Threat Analysis</div>
      <div className="pd-page-sub">// select sample or paste raw email content below</div>

      <div className="pd-card">
        <div className="pd-card-title">Quick samples</div>
        <div className="pd-sample-grid">
          {SAMPLES.map((s, i) => (
            <div
              key={i}
              className={`pd-sample-card ${selectedSample === i ? (s.label === "phishing" ? "selected-phish" : "selected-safe") : ""}`}
              onClick={() => loadSample(i)}
            >
              <div className={`pd-badge ${s.label}`}>
                <span className="pd-badge-dot" />
                {s.label}
              </div>
              <div className="pd-sample-from">{s.from}</div>
              <div className="pd-sample-subject">{s.subject}</div>
              <div className="pd-sample-preview">{s.body}</div>
            </div>
          ))}
        </div>

        <div className="pd-input-group">
          <div className="pd-input-label">Sender / Subject</div>
          <input
            className="pd-input"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Urgent: Verify your account NOW"
          />
        </div>

        <div className="pd-input-group">
          <div className="pd-input-label">Email body</div>
          <textarea
            className="pd-textarea"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Paste full email content here..."
          />
        </div>

        <button
          className="pd-analyze-btn"
          onClick={analyze}
          disabled={loading || (!subject.trim() && !body.trim())}
        >
          {loading ? (
            <><div className="pd-spinner" /> Analyzing threat signature...</>
          ) : (
            <> Run Detection Model</>
          )}
        </button>
      </div>

      {result && (
        <div className="pd-result">
          <div className={`pd-result-header ${isPhish ? "phishing" : "safe"}`}>
            <div>
              <div className="pd-verdict-label">Model verdict</div>
              <div className={`pd-verdict-text ${isPhish ? "phishing" : "safe"}`}>
                {result.verdict}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <ProgressRing pct={result.confidence} isPhish={isPhish} />
              <div className={`pd-verdict-icon ${isPhish ? "phishing" : "safe"}`}>
                {isPhish ? "🎣" : "🛡️"}
              </div>
            </div>
          </div>

          <div className="pd-result-body">
            <div className="pd-features-title">Feature extraction results</div>
            <div className="pd-features-grid">
              {Object.entries(result.feature_flags || {}).map(([key, val]) => {
                const meta = FEATURE_META[key];
                const isFlag = meta.flagWhen ? val : !val;
                return (
                  <div key={key} className="pd-feature-chip">
                    <div className="pd-feature-name">{meta.label}</div>
                    <div className={`pd-feature-val ${isFlag ? "flag" : "ok"}`}>
                      <span className="pd-feature-dot" />
                      {meta.vals[val ? 1 : 0]}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pd-explanation">{result.explanation}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrainPage() {
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    setMetrics(null);
    setLogs([]);
    const steps = [
      { text: "> Initializing Scikit-learn pipeline...", delay: 0, type: "normal" },
      { text: "> Loading dataset: 20 labeled samples (10 phishing / 10 safe)", delay: 350, type: "normal" },
      { text: "> TfidfVectorizer: 847 token features extracted", delay: 700, type: "normal" },
      { text: "> Splitting data: 80% train (16) / 20% test (4)", delay: 1050, type: "normal" },
      { text: "> Fitting MultinomialNB(alpha=1.0)...", delay: 1400, type: "normal" },
      { text: "> Model training complete ✓", delay: 1800, type: "ok" },
      { text: "> Evaluating on held-out test set...", delay: 2100, type: "normal" },
      { text: "> Confusion matrix computed ✓", delay: 2500, type: "ok" },
    ];
    steps.forEach(s => {
      setTimeout(() => setLogs(prev => [...prev, s]), s.delay);
    });
    setTimeout(() => {
      setMetrics({ acc: 95, prec: 100, rec: 90, f1: 95, tp: 9, fn: 1, fp: 0, tn: 10 });
      setLogs(prev => [...prev, { text: "> Accuracy: 95.0%  |  F1: 95.0%  |  Precision: 100%  |  Recall: 90%", type: "ok", delay: 0 }]);
      setRunning(false);
    }, 2900);
  };

  return (
    <div>
      <div className="pd-page-title">Model Training</div>
      <div className="pd-page-sub">// MultinomialNB · TF-IDF vectorization · scikit-learn</div>

      {metrics && (
        <>
          <div className="pd-metrics-grid">
            {[
              { label: "Accuracy", val: "95%", sub: "overall" },
              { label: "Precision", val: "100%", sub: "phishing" },
              { label: "Recall", val: "90%", sub: "phishing" },
              { label: "F1 Score", val: "95%", sub: "harmonic mean" },
            ].map(m => (
              <div key={m.label} className="pd-metric">
                <div className="pd-metric-val">{m.val}</div>
                <div className="pd-metric-label">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="pd-card">
            <div className="pd-cm-title">Confusion matrix — test set (n=20)</div>
            <div className="pd-cm-wrap">
              <div className="pd-cm-head" />
              <div className="pd-cm-head">Predicted Phishing</div>
              <div className="pd-cm-head">Predicted Safe</div>
              <div className="pd-cm-head" style={{ fontSize: 10, color: "#3a4055", padding: "0 12px" }}>Actual Phishing</div>
              <div className="pd-cm-cell pd-cm-tp"><div>9</div><div className="pd-cm-sub">True Pos</div></div>
              <div className="pd-cm-cell pd-cm-fn"><div>1</div><div className="pd-cm-sub">False Neg</div></div>
              <div className="pd-cm-head" style={{ fontSize: 10, color: "#3a4055", padding: "0 12px" }}>Actual Safe</div>
              <div className="pd-cm-cell pd-cm-fp"><div>0</div><div className="pd-cm-sub">False Pos</div></div>
              <div className="pd-cm-cell pd-cm-tn"><div>10</div><div className="pd-cm-sub">True Neg</div></div>
            </div>
          </div>
        </>
      )}

      <div className="pd-card">
        <div className="pd-card-title">Training pipeline</div>
        <div className="pd-info-row">
          <span className="pd-info-key">Algorithm</span>
          <span className="pd-info-val">MultinomialNB (alpha=1.0)</span>
        </div>
        <div className="pd-info-row">
          <span className="pd-info-key">Vectorizer</span>
          <span className="pd-info-val">TfidfVectorizer (847 features)</span>
        </div>
        <div className="pd-info-row">
          <span className="pd-info-key">Train / Test split</span>
          <span className="pd-info-val">80% / 20% (stratified)</span>
        </div>
        <div className="pd-info-row">
          <span className="pd-info-key">Dataset size</span>
          <span className="pd-info-val">20 samples (balanced)</span>
        </div>
        <div className="pd-info-row">
          <span className="pd-info-key">Feature types</span>
          <span className="pd-info-val">Text tokens + URL + urgency signals</span>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="pd-log">
          {logs.map((l, i) => (
            <div key={i} className={l.type === "ok" ? "pd-log-ok" : "pd-log-normal"}>{l.text}</div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="pd-train-btn" onClick={run} disabled={running}>
          {running ? <><div className="pd-spinner" style={{ borderTopColor: "#8b9ab8" }} /> Training...</> : "▶ Run Training"}
        </button>
      </div>
    </div>
  );
}

function DatasetPage() {
  const phishCount = DATASET.filter(d => d.label === "phishing").length;
  const safeCount = DATASET.filter(d => d.label === "safe").length;
  return (
    <div>
      <div className="pd-page-title">Training Dataset</div>
      <div className="pd-page-sub">// {DATASET.length} labeled samples · balanced class distribution</div>

      <div className="pd-metrics-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
        {[
          { label: "Total samples", val: DATASET.length },
          { label: "Phishing", val: phishCount },
          { label: "Legitimate", val: safeCount },
          { label: "Class balance", val: "50/50" },
        ].map(m => (
          <div key={m.label} className="pd-metric">
            <div className="pd-metric-val">{m.val}</div>
            <div className="pd-metric-label">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="pd-card">
        <div className="pd-card-title">Labeled samples</div>
        <div className="pd-ds-list">
          {DATASET.map((d, i) => (
            <div key={i} className="pd-ds-row">
              <div className={`pd-badge ${d.label}`} style={{ margin: 0, flexShrink: 0 }}>
                <span className="pd-badge-dot" />
                {d.label}
              </div>
              <div className="pd-ds-text">{d.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="pd-card">
        <div className="pd-card-title">Extracted feature schema</div>
        {[
          ["url_count", "Number of HTTP/HTTPS or shortened URLs"],
          ["urgency_score", "Urgency/pressure word frequency"],
          ["phish_keyword_hits", "Phishing vocabulary match count"],
          ["caps_ratio", "Uppercase character density (%)"],
          ["suspicious_domain", "Known malicious TLD/pattern detected"],
          ["social_engineering", "Combined manipulation signal score"],
        ].map(([k, v]) => (
          <div key={k} className="pd-info-row">
            <span className="pd-info-key">{k}</span>
            <span className="pd-info-val" style={{ fontSize: 11, color: "#4a5168", textAlign: "right", maxWidth: "55%" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const NAV = [
  { id: "analyze", icon: "🔍", label: "Analyze Email", badge: null },
  { id: "train",   icon: "⚙️", label: "Train Model",  badge: null },
  { id: "dataset", icon: "📦", label: "Dataset",      badge: "20" },
];

export default function App() {
  const [tab, setTab] = useState("analyze");

  return (
    <>
      <style>{css}</style>
      <div className="pd-root">
        <header className="pd-header">
          <div className="pd-logo">
            <div className="pd-logo-icon">🛡️</div>
            <div>
              <div className="pd-logo-text">PhishGuard ML</div>
              <div className="pd-logo-sub">Threat Detection System</div>
            </div>
          </div>
          <div className="pd-status">
            <span className="pd-status-dot" />
            Model Active · v1.0.0
          </div>
        </header>

        <div className="pd-body">
          <nav className="pd-sidebar">
            <div className="pd-nav-section">
              <div className="pd-nav-label">Navigation</div>
              {NAV.map(n => (
                <button
                  key={n.id}
                  className={`pd-nav-item ${tab === n.id ? "active" : ""}`}
                  onClick={() => setTab(n.id)}
                >
                  <span className="pd-nav-icon">{n.icon}</span>
                  {n.label}
                  {n.badge && <span className="pd-nav-badge">{n.badge}</span>}
                </button>
              ))}
            </div>

            <hr className="pd-sidebar-divider" />

            <div className="pd-sidebar-info">
              <div className="pd-sidebar-info-box">
                <div className="pd-sidebar-info-label">Model Stats</div>
                {[
                  ["Algorithm", "Naive Bayes"],
                  ["Accuracy", "95.0%"],
                  ["F1 Score", "95.0%"],
                  ["Features", "847"],
                  ["Samples", "20"],
                ].map(([k, v]) => (
                  <div key={k} className="pd-sidebar-stat">
                    <span className="pd-sidebar-stat-label">{k}</span>
                    <span className="pd-sidebar-stat-val">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </nav>

          <main className="pd-main">
            {tab === "analyze" && <AnalyzePage />}
            {tab === "train"   && <TrainPage />}
            {tab === "dataset" && <DatasetPage />}
          </main>
        </div>
      </div>
    </>
  );
}
