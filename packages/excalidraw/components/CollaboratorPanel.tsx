import React from "react";
import clsx from "clsx";
import { Avatar } from "./Avatar";
import { FilledButton } from "./FilledButton";
import { Island } from "./Island";
import { getClientColor } from "../clients";
import { copyTextToSystemClipboard } from "../clipboard";
import { share, CloseIcon } from "./icons";
import type { Collaborator, SocketId } from "../types";

import "./CollaboratorPanel.scss";

interface CollaboratorPanelProps {
  collaborators: Map<SocketId, Collaborator>;
  currentUserSocketId?: SocketId;
  sessionUrl?: string;
  isAdmin?: boolean;
  onFollowCollaborator?: (socketId: SocketId) => void;
  onKickCollaborator?: (socketId: SocketId) => void;
  followedCollaboratorId?: SocketId | null;
}

export const CollaboratorPanel: React.FC<CollaboratorPanelProps> = ({
  collaborators,
  currentUserSocketId,
  sessionUrl,
  isAdmin = false,
  onFollowCollaborator,
  onKickCollaborator,
  followedCollaboratorId,
}) => {
  const [copyStatus, setCopyStatus] = React.useState<"idle" | "copied">("idle");

  const handleShareClick = async () => {
    if (!sessionUrl) {
      return;
    }

    try {
      await copyTextToSystemClipboard(sessionUrl);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to copy session URL:", error);
    }
  };

  const handleCollaboratorClick = (socketId: SocketId) => {
    if (onFollowCollaborator) {
      onFollowCollaborator(socketId);
    }
  };

  const handleKickClick = (
    socketId: SocketId,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    if (onKickCollaborator) {
      onKickCollaborator(socketId);
    }
  };

  const collaboratorsList = Array.from(collaborators.entries()).filter(
    ([socketId]) => socketId !== currentUserSocketId,
  );

  return (
    <Island className="CollaboratorPanel" padding={2}>
      <div className="CollaboratorPanel__header">
        <h3 className="CollaboratorPanel__title">Collaborators</h3>
        {sessionUrl && (
          <FilledButton
            size="medium"
            variant="outlined"
            label={copyStatus === "copied" ? "Copied!" : "Share"}
            icon={share}
            onClick={handleShareClick}
            status={copyStatus === "copied" ? "success" : null}
          />
        )}
      </div>

      <div className="CollaboratorPanel__list">
        {collaboratorsList.length === 0 ? (
          <div className="CollaboratorPanel__empty">
            No other collaborators in this session
          </div>
        ) : (
          collaboratorsList.map(([socketId, collaborator]) => {
            const background = getClientColor(socketId, collaborator);
            const isOnline = collaborator.userState !== "AWAY" && collaborator.userState !== "IDLE";
            const isFollowed = followedCollaboratorId === socketId;

            return (
              <div
                key={socketId}
                className={clsx("CollaboratorPanel__item", {
                  "CollaboratorPanel__item--followed": isFollowed,
                  "CollaboratorPanel__item--offline": !isOnline,
                })}
                onClick={() => handleCollaboratorClick(socketId)}
              >
                <Avatar
                  color={background}
                  onClick={() => {}}
                  name={collaborator.username || "Anonymous"}
                  src={collaborator.avatarUrl}
                  className={clsx({
                    "is-speaking": collaborator.isSpeaking,
                    "is-in-call": collaborator.isInCall,
                    "is-muted": collaborator.isMuted,
                  })}
                />
                <div className="CollaboratorPanel__item-info">
                  <div className="CollaboratorPanel__item-name">
                    {collaborator.username || "Anonymous"}
                  </div>
                  <div className="CollaboratorPanel__item-status">
                    {isOnline ? "Online" : "Away"}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    className="CollaboratorPanel__kick-btn"
                    onClick={(e) => handleKickClick(socketId, e)}
                    title="Remove collaborator"
                    aria-label="Remove collaborator"
                  >
                    {CloseIcon}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </Island>
  );
};

