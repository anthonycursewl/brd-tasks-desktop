import { useState, useCallback } from "react";
import { X, User, Shield, Info, FileText, Eye } from "lucide-react";
import "./Settings.css";

interface SettingsProps {
  userName?: string;
  avatarUrl?: string | null;
  onClose: () => void;
}

export function Settings({ userName, avatarUrl, onClose }: SettingsProps) {
  const [closing, setClosing] = useState(false);
  const [tab, setTab] = useState("profile");

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 300);
  }, [onClose]);

  const tabs = [
    { key: "profile", label: "Profile", icon: <User size={13} /> },
    { key: "security", label: "Security", icon: <Shield size={13} /> },
    { key: "privacy", label: "Privacy", icon: <Eye size={13} /> },
    { key: "terms", label: "Terms", icon: <FileText size={13} /> },
    { key: "about", label: "About", icon: <Info size={13} /> },
  ];

  return (
    <div className={`settings-overlay${closing ? " closing" : ""}`} onClick={handleClose}>
      <div className={`settings-panel${closing ? " closing" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <span className="settings-title">Settings</span>
          <button className="settings-close" onClick={handleClose}><X size={14} /></button>
        </div>

        <div className="settings-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`settings-tab${tab === t.key ? " active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="settings-body">
          {tab === "profile" && <ProfileTab userName={userName} avatarUrl={avatarUrl} />}
          {tab === "security" && <SecurityTab />}
          {tab === "privacy" && <PrivacyTab />}
          {tab === "terms" && <TermsTab />}
          {tab === "about" && <AboutTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ userName, avatarUrl }: { userName?: string; avatarUrl?: string | null }) {
  return (
    <div className="settings-content">
      <div className="settings-avatar-section">
        <div className="settings-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="settings-avatar-img" />
          ) : (
            <User size={24} />
          )}
        </div>
        <div>
          <div className="settings-field-label">Name</div>
          <div className="settings-field-value">{userName || "—"}</div>
        </div>
      </div>
      <div className="settings-field">
        <div className="settings-field-label">Email</div>
        <div className="settings-field-value">Connected via Malet Account</div>
      </div>
      <div className="settings-field">
        <div className="settings-field-label">Avatar</div>
        <div className="settings-field-value">{avatarUrl ? "Custom" : "Default"}</div>
      </div>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="settings-content">
      <h3>Account Security</h3>
      <p>Your account is secured with email and password authentication. All data transmitted between the app and our servers is encrypted using TLS.</p>
      <h3>Sessions</h3>
      <p>You are currently logged in on this device. To log out, use the "Log Out" button at the bottom of the main screen.</p>
      <h3>Data Sync</h3>
      <p>Tasks are synced in real-time with our servers. All data is encrypted at rest and in transit.</p>
    </div>
  );
}

function PrivacyTab() {
  return (
    <div className="settings-content">
      <h3>Data We Collect</h3>
      <ul>
        <li><strong>Account info:</strong> name, email, avatar URL</li>
        <li><strong>Task data:</strong> titles, descriptions, tags, notes, timestamps</li>
        <li><strong>Usage data:</strong> task completion times for analytics</li>
      </ul>
      <h3>Data We Do NOT Collect</h3>
      <ul>
        <li>Personal identification beyond your account name and email</li>
        <li>Location data</li>
        <li>Browsing history or other app activity</li>
      </ul>
      <h3>Data Storage</h3>
      <p>Your data is stored securely on our servers. You can request data deletion by contacting support@breadriuss.com.</p>
      <h3>Third Parties</h3>
      <p>We do not sell, trade, or share your personal data with third parties. Your task data is used exclusively to provide the service.</p>
    </div>
  );
}

function TermsTab() {
  return (
    <div className="settings-content">
      <h3>1. Acceptance of Terms</h3>
      <p>By using BRD Tasks ("the App"), you agree to these Terms &amp; Conditions. If you do not agree, do not use the App.</p>
      <h3>2. Use of Service</h3>
      <p>The App is provided for personal task management. You agree not to misuse the App for any unlawful purpose or in violation of applicable laws.</p>
      <h3>3. Account &amp; Data</h3>
      <p>You are responsible for maintaining the confidentiality of your account credentials. We are not liable for data loss resulting from unauthorized access.</p>
      <h3>4. Privacy</h3>
      <p>We collect only the data necessary to provide the service (task data, account info). We do not sell your data to third parties.</p>
      <h3>5. Limitation of Liability</h3>
      <p>The App is provided "as is" without warranty. We are not liable for damages arising from its use.</p>
      <h3>6. Changes</h3>
      <p>We reserve the right to update these terms at any time. Continued use after changes constitutes acceptance.</p>
      <h3>7. Contact</h3>
      <p>For questions, contact us at support@breadriuss.com.</p>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="settings-content">
      <div className="about-logo-section">
        <img src="/brd/brd_dark_logo_nobg.png" className="about-logo" alt="" />
        <div>
          <div className="about-app-name">BRD Tasks</div>
          <div className="about-version">Version 0.2.3</div>
        </div>
      </div>
      <h3>Description</h3>
      <p>BRD Tasks is a lightweight, offline-first task manager with cloud sync. Built with Tauri and React.</p>
      <h3>Technologies</h3>
      <p>Built with Tauri v2, React, TypeScript, Rust, and powered by Vite.</p>
      <h3>Links</h3>
      <p><a href="https://breadriuss.com" target="_blank" rel="noopener noreferrer">breadriuss.com</a></p>
    </div>
  );
}
