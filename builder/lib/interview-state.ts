import { SPEC_SECTIONS } from "./spec-sections";

export type InterviewState = {
  satisfiedSectionIds: readonly string[];
};

/**
 * Creates a fresh interview state.
 * All sections start unsatisfied.
 */
export function createInterviewState(): InterviewState {
  return {
    satisfiedSectionIds: [],
  };
}

/**
 * Marks one or more sections as satisfied.
 * - Existing satisfied sections remain satisfied.
 * - Unknown section ids are ignored.
 * - Returns a new immutable state.
 */
export function markSectionsSatisfied(
  state: InterviewState,
  sectionIds: readonly string[]
): InterviewState {
  const validIds = new Set(SPEC_SECTIONS.map(section => section.id));

  const satisfied = new Set(state.satisfiedSectionIds);

  for (const id of sectionIds) {
    if (validIds.has(id)) {
      satisfied.add(id);
    }
  }

  return {
    satisfiedSectionIds: [...satisfied],
  };
}

/**
 * Returns true only when every spec section has been satisfied.
 */
export function isConverged(state: InterviewState): boolean {
  return SPEC_SECTIONS.every(section =>
    state.satisfiedSectionIds.includes(section.id)
  );
}