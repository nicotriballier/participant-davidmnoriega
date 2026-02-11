import {
  isValidCollaboratorName,
  getGravatarUrl,
  getTimeSinceActive,
  isCollaboratorOnline,
} from "./collaboratorUtils";

describe("collaboratorUtils", () => {
  describe("isValidCollaboratorName", () => {
    describe("valid names", () => {
      it("should return true for valid alphanumeric names", () => {
        expect(isValidCollaboratorName("John")).toBe(true);
        expect(isValidCollaboratorName("Alice123")).toBe(true);
        expect(isValidCollaboratorName("User 42")).toBe(true);
        expect(isValidCollaboratorName("AB")).toBe(true);
      });

      it("should return true for names with spaces", () => {
        expect(isValidCollaboratorName("John Doe")).toBe(true);
        expect(isValidCollaboratorName("Alice Bob Carol")).toBe(true);
      });

      it("should return true for names at boundary lengths", () => {
        expect(isValidCollaboratorName("AB")).toBe(true); // 2 chars (min)
        expect(isValidCollaboratorName("12345678901234567890")).toBe(true); // 20 chars (max)
      });

      it("should trim whitespace and validate", () => {
        expect(isValidCollaboratorName("  John  ")).toBe(true);
        expect(isValidCollaboratorName("\tAlice\t")).toBe(true);
      });
    });

    describe("invalid names", () => {
      it("should return false for null or undefined", () => {
        expect(isValidCollaboratorName(null)).toBe(false);
        expect(isValidCollaboratorName(undefined)).toBe(false);
      });

      it("should return false for non-string values", () => {
        expect(isValidCollaboratorName(123 as any)).toBe(false);
        expect(isValidCollaboratorName({} as any)).toBe(false);
        expect(isValidCollaboratorName([] as any)).toBe(false);
      });

      it("should return false for empty or whitespace-only strings", () => {
        expect(isValidCollaboratorName("")).toBe(false);
        expect(isValidCollaboratorName("   ")).toBe(false);
        expect(isValidCollaboratorName("\t\n")).toBe(false);
      });

      it("should return false for names too short", () => {
        expect(isValidCollaboratorName("A")).toBe(false);
        expect(isValidCollaboratorName(" A ")).toBe(false); // trims to 1 char
      });

      it("should return false for names too long", () => {
        expect(isValidCollaboratorName("123456789012345678901")).toBe(false); // 21 chars
        expect(isValidCollaboratorName("A".repeat(25))).toBe(false);
      });

      it("should return false for names with special characters", () => {
        expect(isValidCollaboratorName("John@Doe")).toBe(false);
        expect(isValidCollaboratorName("Alice_Bob")).toBe(false);
        expect(isValidCollaboratorName("User-123")).toBe(false);
        expect(isValidCollaboratorName("Test!")).toBe(false);
        expect(isValidCollaboratorName("Name#1")).toBe(false);
      });
    });
  });

  describe("getGravatarUrl", () => {
    describe("valid email addresses", () => {
      it("should generate Gravatar URL for valid email", () => {
        const url = getGravatarUrl("test@example.com");
        expect(url).toContain("https://www.gravatar.com/avatar/");
        expect(url).toContain("?s=80&d=identicon");
      });

      it("should normalize email (trim and lowercase)", () => {
        const url1 = getGravatarUrl("Test@Example.com");
        const url2 = getGravatarUrl("test@example.com");
        const url3 = getGravatarUrl("  test@example.com  ");
        
        expect(url1).toBe(url2);
        expect(url2).toBe(url3);
      });

      it("should use custom size parameter", () => {
        const url = getGravatarUrl("test@example.com", 200);
        expect(url).toContain("?s=200&d=identicon");
      });

      it("should use custom default image parameter", () => {
        const url = getGravatarUrl("test@example.com", 80, "monsterid");
        expect(url).toContain("?s=80&d=monsterid");
      });

      it("should handle different email formats", () => {
        expect(getGravatarUrl("user@domain.com")).toContain("gravatar.com/avatar/");
        expect(getGravatarUrl("user.name@domain.co.uk")).toContain("gravatar.com/avatar/");
        expect(getGravatarUrl("user+tag@domain.com")).toContain("gravatar.com/avatar/");
      });
    });

    describe("invalid email addresses", () => {
      it("should return empty string for null or undefined", () => {
        expect(getGravatarUrl(null as any)).toBe("");
        expect(getGravatarUrl(undefined as any)).toBe("");
      });

      it("should return empty string for non-string values", () => {
        expect(getGravatarUrl(123 as any)).toBe("");
        expect(getGravatarUrl({} as any)).toBe("");
      });

      it("should return empty string for empty string", () => {
        expect(getGravatarUrl("")).toBe("");
      });
    });
  });

  describe("getTimeSinceActive", () => {
    const SECOND = 1000;
    const MINUTE = 60 * SECOND;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;

    let originalDateNow: () => number;
    const MOCK_NOW = 1000000000000; // Fixed timestamp for testing

    beforeEach(() => {
      originalDateNow = Date.now;
      Date.now = vi.fn(() => MOCK_NOW);
    });

    afterEach(() => {
      Date.now = originalDateNow;
    });

    describe("recent activity", () => {
      it("should return 'just now' for very recent activity (< 30 seconds)", () => {
        expect(getTimeSinceActive(MOCK_NOW - 5 * SECOND)).toBe("just now");
        expect(getTimeSinceActive(MOCK_NOW - 29 * SECOND)).toBe("just now");
        expect(getTimeSinceActive(MOCK_NOW)).toBe("just now");
      });

      it("should return seconds for activity between 30-59 seconds ago", () => {
        expect(getTimeSinceActive(MOCK_NOW - 30 * SECOND)).toBe("30 sec ago");
        expect(getTimeSinceActive(MOCK_NOW - 45 * SECOND)).toBe("45 sec ago");
        expect(getTimeSinceActive(MOCK_NOW - 59 * SECOND)).toBe("59 sec ago");
      });
    });

    describe("minutes ago", () => {
      it("should return '1 min ago' for exactly 1 minute", () => {
        expect(getTimeSinceActive(MOCK_NOW - 1 * MINUTE)).toBe("1 min ago");
        expect(getTimeSinceActive(MOCK_NOW - 1 * MINUTE - 30 * SECOND)).toBe("1 min ago");
      });

      it("should return minutes for activity between 2-59 minutes ago", () => {
        expect(getTimeSinceActive(MOCK_NOW - 2 * MINUTE)).toBe("2 min ago");
        expect(getTimeSinceActive(MOCK_NOW - 30 * MINUTE)).toBe("30 min ago");
        expect(getTimeSinceActive(MOCK_NOW - 59 * MINUTE)).toBe("59 min ago");
      });
    });

    describe("hours ago", () => {
      it("should return '1 hour ago' for exactly 1 hour", () => {
        expect(getTimeSinceActive(MOCK_NOW - 1 * HOUR)).toBe("1 hour ago");
        expect(getTimeSinceActive(MOCK_NOW - 1 * HOUR - 30 * MINUTE)).toBe("1 hour ago");
      });

      it("should return hours for activity between 2-23 hours ago", () => {
        expect(getTimeSinceActive(MOCK_NOW - 2 * HOUR)).toBe("2 hours ago");
        expect(getTimeSinceActive(MOCK_NOW - 12 * HOUR)).toBe("12 hours ago");
        expect(getTimeSinceActive(MOCK_NOW - 23 * HOUR)).toBe("23 hours ago");
      });
    });

    describe("days ago", () => {
      it("should return '1 day ago' for exactly 1 day", () => {
        expect(getTimeSinceActive(MOCK_NOW - 1 * DAY)).toBe("1 day ago");
        expect(getTimeSinceActive(MOCK_NOW - 1 * DAY - 12 * HOUR)).toBe("1 day ago");
      });

      it("should return days for activity multiple days ago", () => {
        expect(getTimeSinceActive(MOCK_NOW - 2 * DAY)).toBe("2 days ago");
        expect(getTimeSinceActive(MOCK_NOW - 7 * DAY)).toBe("7 days ago");
        expect(getTimeSinceActive(MOCK_NOW - 30 * DAY)).toBe("30 days ago");
      });
    });

    describe("edge cases", () => {
      it("should return 'just now' for future timestamps", () => {
        expect(getTimeSinceActive(MOCK_NOW + 1000)).toBe("just now");
        expect(getTimeSinceActive(MOCK_NOW + 1 * DAY)).toBe("just now");
      });

      it("should return 'just now' for invalid timestamps", () => {
        expect(getTimeSinceActive(Infinity)).toBe("just now");
        expect(getTimeSinceActive(-Infinity)).toBe("just now");
        expect(getTimeSinceActive(NaN)).toBe("just now");
      });
    });
  });

  describe("isCollaboratorOnline", () => {
    const SECOND = 1000;
    const DEFAULT_THRESHOLD = 30000; // 30 seconds

    let originalDateNow: () => number;
    const MOCK_NOW = 1000000000000;

    beforeEach(() => {
      originalDateNow = Date.now;
      Date.now = vi.fn(() => MOCK_NOW);
    });

    afterEach(() => {
      Date.now = originalDateNow;
    });

    describe("online status", () => {
      it("should return true for very recent activity", () => {
        expect(isCollaboratorOnline(MOCK_NOW)).toBe(true);
        expect(isCollaboratorOnline(MOCK_NOW - 1000)).toBe(true);
        expect(isCollaboratorOnline(MOCK_NOW - 15000)).toBe(true);
        expect(isCollaboratorOnline(MOCK_NOW - 29999)).toBe(true);
      });

      it("should return false for activity beyond threshold", () => {
        expect(isCollaboratorOnline(MOCK_NOW - 30000)).toBe(false);
        expect(isCollaboratorOnline(MOCK_NOW - 31000)).toBe(false);
        expect(isCollaboratorOnline(MOCK_NOW - 60000)).toBe(false);
      });

      it("should use custom threshold", () => {
        const customThreshold = 60000; // 1 minute
        expect(isCollaboratorOnline(MOCK_NOW - 45000, customThreshold)).toBe(true);
        expect(isCollaboratorOnline(MOCK_NOW - 59999, customThreshold)).toBe(true);
        expect(isCollaboratorOnline(MOCK_NOW - 60000, customThreshold)).toBe(false);
        expect(isCollaboratorOnline(MOCK_NOW - 61000, customThreshold)).toBe(false);
      });
    });

    describe("invalid inputs", () => {
      it("should return false for null or undefined", () => {
        expect(isCollaboratorOnline(null)).toBe(false);
        expect(isCollaboratorOnline(undefined)).toBe(false);
      });

      it("should return false for invalid numbers", () => {
        expect(isCollaboratorOnline(Infinity)).toBe(false);
        expect(isCollaboratorOnline(-Infinity)).toBe(false);
        expect(isCollaboratorOnline(NaN)).toBe(false);
      });

      it("should return false for future timestamps", () => {
        expect(isCollaboratorOnline(MOCK_NOW + 1000)).toBe(false);
        expect(isCollaboratorOnline(MOCK_NOW + 60000)).toBe(false);
      });
    });

    describe("boundary conditions", () => {
      it("should handle exact threshold boundary", () => {
        expect(isCollaboratorOnline(MOCK_NOW - DEFAULT_THRESHOLD + 1)).toBe(true);
        expect(isCollaboratorOnline(MOCK_NOW - DEFAULT_THRESHOLD)).toBe(false);
      });

      it("should handle zero threshold", () => {
        expect(isCollaboratorOnline(MOCK_NOW, 0)).toBe(false);
        expect(isCollaboratorOnline(MOCK_NOW - 1, 0)).toBe(false);
      });

      it("should handle very large threshold", () => {
        const largeThreshold = 1000000000; // ~11.5 days
        expect(isCollaboratorOnline(MOCK_NOW - 1000000, largeThreshold)).toBe(true);
      });
    });
  });
});


