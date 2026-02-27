import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { CollaboratorPanel } from "./CollaboratorPanel";
import * as clipboard from "../clipboard";
import type { Collaborator, SocketId } from "../types";

// Mock the clipboard module
vi.mock("../clipboard", () => ({
  copyTextToSystemClipboard: vi.fn(),
}));

// Mock the clients module
vi.mock("../clients", () => ({
  getClientColor: vi.fn((socketId: string) => `#${socketId.slice(0, 6)}`),
  getNameInitial: vi.fn((name: string | null | undefined) => {
    if (!name || typeof name !== "string") {
      return "?";
    }
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed[0].toUpperCase() : "?";
  }),
}));

describe("CollaboratorPanel", () => {
  const mockSocketId1 = "socket-1" as SocketId;
  const mockSocketId2 = "socket-2" as SocketId;
  const mockCurrentUserSocketId = "current-user" as SocketId;

  const createMockCollaborator = (
    overrides: Partial<Collaborator> = {},
  ): Collaborator => ({
    username: "Test User",
    userState: "ACTIVE",
    avatarUrl: undefined,
    isSpeaking: false,
    isInCall: false,
    isMuted: false,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the panel with title", () => {
      const collaborators = new Map<SocketId, Collaborator>();
      render(<CollaboratorPanel collaborators={collaborators} />);

      expect(screen.getByText("Collaborators")).toBeInTheDocument();
    });

    it("should render empty state when no collaborators", () => {
      const collaborators = new Map<SocketId, Collaborator>();
      render(<CollaboratorPanel collaborators={collaborators} />);

      expect(
        screen.getByText("No other collaborators in this session"),
      ).toBeInTheDocument();
    });

    it("should not show current user in the list", () => {
      const collaborators = new Map<SocketId, Collaborator>([
        [mockCurrentUserSocketId, createMockCollaborator({ username: "Me" })],
        [mockSocketId1, createMockCollaborator({ username: "Other User" })],
      ]);

      render(
        <CollaboratorPanel
          collaborators={collaborators}
          currentUserSocketId={mockCurrentUserSocketId}
        />,
      );

      expect(screen.queryByText("Me")).not.toBeInTheDocument();
      expect(screen.getByText("Other User")).toBeInTheDocument();
    });

    it("should render multiple collaborators", () => {
      const collaborators = new Map<SocketId, Collaborator>([
        [mockSocketId1, createMockCollaborator({ username: "Alice" })],
        [mockSocketId2, createMockCollaborator({ username: "Bob" })],
      ]);

      render(<CollaboratorPanel collaborators={collaborators} />);

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("should display 'Anonymous' for collaborators without username", () => {
      const collaborators = new Map<SocketId, Collaborator>([
        [mockSocketId1, createMockCollaborator({ username: undefined })],
      ]);

      render(<CollaboratorPanel collaborators={collaborators} />);

      // Should show "Anonymous" in the name field
      expect(screen.getByText("Anonymous")).toBeInTheDocument();
      // Avatar should show "A" (first letter of Anonymous)
      expect(screen.getByText("A")).toBeInTheDocument();
    });
  });

  describe("online status", () => {
    it("should show 'Online' for active collaborators", () => {
      const collaborators = new Map<SocketId, Collaborator>([
        [mockSocketId1, createMockCollaborator({ userState: "ACTIVE" })],
      ]);

      render(<CollaboratorPanel collaborators={collaborators} />);

      expect(screen.getByText("Online")).toBeInTheDocument();
    });

    it("should show 'Away' for AWAY collaborators", () => {
      const collaborators = new Map<SocketId, Collaborator>([
        [mockSocketId1, createMockCollaborator({ userState: "AWAY" })],
      ]);

      render(<CollaboratorPanel collaborators={collaborators} />);

      expect(screen.getByText("Away")).toBeInTheDocument();
    });

    it("should show 'Away' for IDLE collaborators", () => {
      const collaborators = new Map<SocketId, Collaborator>([
        [mockSocketId1, createMockCollaborator({ userState: "IDLE" })],
      ]);

      render(<CollaboratorPanel collaborators={collaborators} />);

      expect(screen.getByText("Away")).toBeInTheDocument();
    });

    it("should apply offline class for away collaborators", () => {
      const collaborators = new Map<SocketId, Collaborator>([
        [mockSocketId1, createMockCollaborator({ userState: "AWAY" })],
      ]);

      const { container } = render(
        <CollaboratorPanel collaborators={collaborators} />,
      );

      const item = container.querySelector(".CollaboratorPanel__item");
      expect(item).toHaveClass("CollaboratorPanel__item--offline");
    });
  });

  describe("share functionality", () => {
    it("should render share button when sessionUrl is provided", () => {
      const collaborators = new Map<SocketId, Collaborator>();
      render(
        <CollaboratorPanel
          collaborators={collaborators}
          sessionUrl="https://example.com/session/123"
        />,
      );

      expect(screen.getByText("Share")).toBeInTheDocument();
    });

    it("should not render share button when sessionUrl is not provided", () => {
      const collaborators = new Map<SocketId, Collaborator>();
      render(<CollaboratorPanel collaborators={collaborators} />);

      expect(screen.queryByText("Share")).not.toBeInTheDocument();
    });

    it("should copy session URL to clipboard when share button is clicked", async () => {
      const mockCopy = vi.mocked(clipboard.copyTextToSystemClipboard);
      mockCopy.mockResolvedValue();

      const collaborators = new Map<SocketId, Collaborator>();
      const sessionUrl = "https://example.com/session/123";

      render(
        <CollaboratorPanel
          collaborators={collaborators}
          sessionUrl={sessionUrl}
        />,
      );

      const shareButton = screen.getByText("Share");
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockCopy).toHaveBeenCalledWith(sessionUrl);
      });
    });

    it("should show 'Copied!' status after successful copy", async () => {
      const mockCopy = vi.mocked(clipboard.copyTextToSystemClipboard);
      mockCopy.mockResolvedValue();

      const collaborators = new Map<SocketId, Collaborator>();
      render(
        <CollaboratorPanel
          collaborators={collaborators}
          sessionUrl="https://example.com/session/123"
        />,
      );

      const shareButton = screen.getByText("Share");
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });

    it("should revert to 'Share' after 2 seconds", async () => {
      vi.useFakeTimers();
      const mockCopy = vi.mocked(clipboard.copyTextToSystemClipboard);
      mockCopy.mockResolvedValue();

      const collaborators = new Map<SocketId, Collaborator>();
      render(
        <CollaboratorPanel
          collaborators={collaborators}
          sessionUrl="https://example.com/session/123"
        />,
      );

      const shareButton = screen.getByText("Share");
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });

      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(screen.getByText("Share")).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it("should handle copy errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockCopy = vi.mocked(clipboard.copyTextToSystemClipboard);
      mockCopy.mockRejectedValue(new Error("Copy failed"));

      const collaborators = new Map<SocketId, Collaborator>();
      render(
        <CollaboratorPanel
          collaborators={collaborators}
          sessionUrl="https://example.com/session/123"
        />,
      );

      const shareButton = screen.getByText("Share");
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to copy session URL:",
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("follow functionality", () => {
    it("should call onFollowCollaborator when collaborator is clicked", () => {
      const onFollowCollaborator = vi.fn();
      const collaborators = new Map<SocketId, Collaborator>([
        [mockSocketId1, createMockCollaborator({ username: "Alice" })],
      ]);

      render(
        <CollaboratorPanel
          collaborators={collaborators}
          onFollowCollaborator={onFollowCollaborator}
        />,
      );

      const collaboratorItem = screen.getByText("Alice").closest(".CollaboratorPanel__item");
      fireEvent.click(collaboratorItem!);

      expect(onFollowCollaborator).toHaveBeenCalledWith(mockSocketId1);
    });

    it("should highlight followed collaborator", () => {
      const collaborators = new Map<SocketId, Collaborator>([
        [mockSocketId1, createMockCollaborator({ username: "Alice" })],
        [mockSocketId2, createMockCollaborator({ username: "Bob" })],
      ]);

      const { container } = render(
        <CollaboratorPanel
          collaborators={collaborators}
          followedCollaboratorId={mockSocketId1}
        />,
      );

      const items = container.querySelectorAll(".CollaboratorPanel__item");
      expect(items[0]).toHaveClass("CollaboratorPanel__item--followed");
      expect(items[1]).not.toHaveClass("CollaboratorPanel__item--followed");
    });

    it("should not call onFollowCollaborator if callback is not provided", () => {
      const collaborators = new Map<SocketId, Collaborator>([
        [mockSocketId1, createMockCollaborator({ username: "Alice" })],
      ]);

      render(<CollaboratorPanel collaborators={collaborators} />);

      const collaboratorItem = screen.getByText("Alice").closest(".CollaboratorPanel__item");
      // Should not throw error
      fireEvent.click(collaboratorItem!);
    });
  });

  describe("kick functionality", () => {
    it("should show kick button when user is admin", () => {
      const collaborators = new Map<SocketId, Collaborator>([
        [mockSocketId1, createMockCollaborator({ username: "Alice" })],
      ]);

      render(
        <CollaboratorPanel collaborators={collaborators} isAdmin={true} />,
      );

      const kickButton = screen.getByTitle("Remove collaborator");
      expect(kickButton).toBeInTheDocument();
    });

    it("should not show kick button when user is not admin", () => {
      const collaborators = new Map<SocketId, Collaborator>([
        [mockSocketId1, createMockCollaborator({ username: "Alice" })],
      ]);

      render(
        <CollaboratorPanel collaborators={collaborators} isAdmin={false} />,
      );

      expect(screen.queryByTitle("Remove collaborator")).not.toBeInTheDocument();
    });

    it("should call onKickCollaborator when kick button is clicked", () => {
      const onKickCollaborator = vi.fn();
      const collaborators = new Map<SocketId, Collaborator>([
        [mockSocketId1, createMockCollaborator({ username: "Alice" })],
      ]);

      render(
        <CollaboratorPanel
          collaborators={collaborators}
          isAdmin={true}
          onKickCollaborator={onKickCollaborator}
        />,
      );

      const kickButton = screen.getByTitle("Remove collaborator");
      fireEvent.click(kickButton);

      expect(onKickCollaborator).toHaveBeenCalledWith(mockSocketId1);
    });

    it("should stop propagation when kick button is clicked", () => {
      const onFollowCollaborator = vi.fn();
      const onKickCollaborator = vi.fn();
      const collaborators = new Map<SocketId, Collaborator>([
        [mockSocketId1, createMockCollaborator({ username: "Alice" })],
      ]);

      render(
        <CollaboratorPanel
          collaborators={collaborators}
          isAdmin={true}
          onFollowCollaborator={onFollowCollaborator}
          onKickCollaborator={onKickCollaborator}
        />,
      );

      const kickButton = screen.getByTitle("Remove collaborator");
      fireEvent.click(kickButton);

      expect(onKickCollaborator).toHaveBeenCalledWith(mockSocketId1);
      expect(onFollowCollaborator).not.toHaveBeenCalled();
    });
  });

  describe("avatar and status indicators", () => {
    it("should pass avatar URL to Avatar component", () => {
      const collaborators = new Map<SocketId, Collaborator>([
        [
          mockSocketId1,
          createMockCollaborator({
            username: "Alice",
            avatarUrl: "https://example.com/avatar.jpg",
          }),
        ],
      ]);

      const { container } = render(
        <CollaboratorPanel collaborators={collaborators} />,
      );

      const avatar = container.querySelector(".Avatar");
      expect(avatar).toBeInTheDocument();
    });

    it("should apply speaking class when collaborator is speaking", () => {
      const collaborators = new Map<SocketId, Collaborator>([
        [
          mockSocketId1,
          createMockCollaborator({ username: "Alice", isSpeaking: true }),
        ],
      ]);

      const { container } = render(
        <CollaboratorPanel collaborators={collaborators} />,
      );

      const avatar = container.querySelector(".Avatar");
      expect(avatar).toHaveClass("is-speaking");
    });

    it("should apply in-call class when collaborator is in call", () => {
      const collaborators = new Map<SocketId, Collaborator>([
        [
          mockSocketId1,
          createMockCollaborator({ username: "Alice", isInCall: true }),
        ],
      ]);

      const { container } = render(
        <CollaboratorPanel collaborators={collaborators} />,
      );

      const avatar = container.querySelector(".Avatar");
      expect(avatar).toHaveClass("is-in-call");
    });

    it("should apply muted class when collaborator is muted", () => {
      const collaborators = new Map<SocketId, Collaborator>([
        [
          mockSocketId1,
          createMockCollaborator({ username: "Alice", isMuted: true }),
        ],
      ]);

      const { container } = render(
        <CollaboratorPanel collaborators={collaborators} />,
      );

      const avatar = container.querySelector(".Avatar");
      expect(avatar).toHaveClass("is-muted");
    });
  });
});
