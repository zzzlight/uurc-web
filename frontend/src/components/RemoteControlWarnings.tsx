import { TriangleAlert } from "lucide-react";

import type { RemoteControlPageProps } from "../app/remoteControlPageProps.js";

export function RemoteControlWarnings({
  forceJoin,
  normalJoinTakeoverHint,
  roomJoinFailureMessage,
  roomJoinFailureTakeoverHint,
  roomRequiresTakeover,
  selectedDeviceOccupied,
  selfDeviceBlockedReason,
  signalGatewayErrorHint,
}: Pick<
  RemoteControlPageProps,
  | "forceJoin"
  | "normalJoinTakeoverHint"
  | "roomJoinFailureMessage"
  | "roomJoinFailureTakeoverHint"
  | "roomRequiresTakeover"
  | "selectedDeviceOccupied"
  | "selfDeviceBlockedReason"
  | "signalGatewayErrorHint"
>) {
  return (
    <>
      {selectedDeviceOccupied && !forceJoin ? (
        <div className="occupancy-callout">
          <TriangleAlert size={17} />
          <span>已有控制端在线</span>
        </div>
      ) : null}
      {roomRequiresTakeover ? (
        <div className="occupancy-callout takeover">
          <TriangleAlert size={17} />
          <span>选择接管后重试</span>
        </div>
      ) : null}
      {roomJoinFailureMessage ? (
        <div className="occupancy-callout takeover">
          <TriangleAlert size={17} />
          <span>{roomJoinFailureMessage}</span>
        </div>
      ) : null}
      {selfDeviceBlockedReason ? (
        <div className="occupancy-callout">
          <TriangleAlert size={17} />
          <span>{selfDeviceBlockedReason}</span>
        </div>
      ) : null}
      {roomJoinFailureTakeoverHint ? (
        <div className="occupancy-callout takeover">
          <TriangleAlert size={17} />
          <span>{roomJoinFailureTakeoverHint}</span>
        </div>
      ) : null}
      {normalJoinTakeoverHint ? (
        <div className="occupancy-callout takeover">
          <TriangleAlert size={17} />
          <span>{normalJoinTakeoverHint}</span>
        </div>
      ) : null}
      {signalGatewayErrorHint ? (
        <div className="occupancy-callout takeover">
          <TriangleAlert size={17} />
          <span>{signalGatewayErrorHint}</span>
        </div>
      ) : null}
    </>
  );
}
