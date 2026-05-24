import { Monitor } from "lucide-react";

import type { RemoteControlPageProps } from "../app/remoteControlPageProps.js";

export function RemoteVideoSourcePanel({
  onRemoteVideoSourceChange,
  primaryRemoteVideoId,
  remoteVideoStreams,
}: Pick<RemoteControlPageProps, "onRemoteVideoSourceChange" | "primaryRemoteVideoId" | "remoteVideoStreams">) {
  const hasSources = remoteVideoStreams.length > 0;

  return (
    <section className="control-insight-panel" aria-label="画面源">
      <header>
        <div>
          <Monitor size={17} />
          <h2>画面源</h2>
        </div>
        <span>{hasSources ? `${remoteVideoStreams.length} 路` : "等待画面"}</span>
      </header>
      <p>{hasSources ? "选择主画面，其他视频轨保持待命。" : "连接建立后会显示可用视频轨。"}</p>
      <div className="video-source-list">
        {hasSources ? (
          remoteVideoStreams.map((video, index) => (
            <button
              type="button"
              key={video.id}
              aria-pressed={video.id === primaryRemoteVideoId}
              onClick={() => onRemoteVideoSourceChange(video.id)}
            >
              画面 {index + 1}
            </button>
          ))
        ) : (
          <span>暂无画面源</span>
        )}
      </div>
    </section>
  );
}
