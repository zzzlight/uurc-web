import { Monitor } from "lucide-react";

import type { RemoteControlPageProps } from "../app/remoteControlPageProps.js";
import { RemoteVideoTile } from "./RemoteVideoTile.js";

export function RemoteControlStage({
  browserRemoteState,
  hasRemoteVideo,
  inputControlActive,
  inputControlLabel,
  onRemoteStageKeyDown,
  onRemoteStageKeyUp,
  onRemoteStagePointerCancel,
  onRemoteStagePointerDown,
  onRemoteStagePointerMove,
  onRemoteStagePointerUp,
  onRemoteStageWheel,
  onRemoteVideoSample,
  primaryRemoteVideoId,
  remoteBootstrap,
  remoteStageRef,
  remoteVideoCount,
  remoteVideoStreams,
  roomResponseReady,
  selectedDevice,
  videoFlowLabel,
}: Pick<
  RemoteControlPageProps,
  | "browserRemoteState"
  | "hasRemoteVideo"
  | "inputControlActive"
  | "inputControlLabel"
  | "onRemoteStageKeyDown"
  | "onRemoteStageKeyUp"
  | "onRemoteStagePointerCancel"
  | "onRemoteStagePointerDown"
  | "onRemoteStagePointerMove"
  | "onRemoteStagePointerUp"
  | "onRemoteStageWheel"
  | "onRemoteVideoSample"
  | "primaryRemoteVideoId"
  | "remoteBootstrap"
  | "remoteStageRef"
  | "remoteVideoCount"
  | "remoteVideoStreams"
  | "roomResponseReady"
  | "selectedDevice"
  | "videoFlowLabel"
>) {
  return (
    <div
      ref={remoteStageRef}
      className={`remote-stage control-remote-stage ${inputControlActive ? "remote-stage-interactive" : ""}`}
      role="application"
      aria-label="远控画面"
      tabIndex={0}
      onPointerDown={onRemoteStagePointerDown}
      onPointerMove={onRemoteStagePointerMove}
      onPointerUp={onRemoteStagePointerUp}
      onPointerCancel={onRemoteStagePointerCancel}
      onWheel={onRemoteStageWheel}
      onKeyDown={onRemoteStageKeyDown}
      onKeyUp={onRemoteStageKeyUp}
    >
      {hasRemoteVideo ? (
        <>
          <div className="remote-video-grid">
            {remoteVideoStreams.map((video, index) => (
              <RemoteVideoTile
                key={video.id}
                videoId={video.id}
                index={index}
                visible={video.id === primaryRemoteVideoId}
                stream={video.stream}
                onVideoSample={onRemoteVideoSample}
              />
            ))}
          </div>
          <div className="stage-badge">
            {browserRemoteState.stage} · {remoteVideoCount} 路视频 · {videoFlowLabel} · 输入{inputControlLabel}
          </div>
        </>
      ) : (
        <>
          <div className="stage-grid" />
          <div className="stage-center">
            <Monitor size={34} />
            <strong>{selectedDevice?.alias ?? "未选择设备"}</strong>
            <span>
              {browserRemoteState.remoteTrackCount > 0
                ? "正在加载画面"
                : remoteBootstrap || roomResponseReady
                  ? "已就绪"
                  : "未连接"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
