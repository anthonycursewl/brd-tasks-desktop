import { useState, useCallback } from "react";
import { ChevronDown, RotateCw, BarChart3, Download } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Avatar } from "../Avatar/Avatar";
import { Tooltip } from "../Tooltip/Tooltip";
import "./Header.css";

interface HeaderProps {
  avatarUrl?: string | null;
  userName?: string;
  onReload?: () => void;
  onAnalytics?: () => void;
  onUpdate?: () => void;
  updateChecking?: boolean;
}

const COOLDOWN = 10000;

export function Header({ avatarUrl, userName, onReload, onAnalytics, onUpdate, updateChecking }: HeaderProps) {
  const [cooldown, setCooldown] = useState(0);

  const handleMinimizeToTray = () => {
    getCurrentWindow().hide();
  };

  const handleReload = useCallback(() => {
    if (cooldown > 0 || !onReload) return;
    onReload();
    setCooldown(COOLDOWN);
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, COOLDOWN - elapsed);
      setCooldown(remaining);
      if (remaining > 0) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [cooldown, onReload]);

  return (
    <div className="header">
      <div className="header-left">
        <img src="/brd/brd_dark_logo_nobg.png" className="logo-img" alt="BRD" />
      </div>

      <div className="header-center" data-tauri-drag-region />

      <div className="header-right">
        <Tooltip content="Sync" position="bottom">
          <button
            className={`reload-btn${cooldown > 0 ? " reloading" : ""}`}
            onClick={handleReload}
            disabled={cooldown > 0}
          >
            <RotateCw size={13} strokeWidth={2} />
            {cooldown > 0 && (
              <span className="reload-cooldown">{(cooldown / 1000).toFixed(1)}</span>
            )}
          </button>
        </Tooltip>
        <Tooltip content="Analytics" position="bottom">
          <button className="icon-btn" onClick={onAnalytics} disabled={!onAnalytics}>
            <BarChart3 size={13} strokeWidth={2} />
          </button>
        </Tooltip>
        <Tooltip content={updateChecking ? "Checking…" : "Updates"} position="bottom">
          <button className="icon-btn" onClick={onUpdate} disabled={!onUpdate || updateChecking}>
            {updateChecking ? (
              <span className="update-dots">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </span>
            ) : (
              <Download size={13} strokeWidth={2} />
            )}
          </button>
        </Tooltip>
        <Avatar url={avatarUrl} name={userName} />
        <button className="tray-btn" onClick={handleMinimizeToTray}>
          <ChevronDown size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
