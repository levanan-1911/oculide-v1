/**
 * Shared instructor identity helpers.
 * Keep the fallback name aligned with ProfileView's initial instructor profile.
 */
export const DEFAULT_INSTRUCTOR_PROFILE_NAME = 'Phạm Văn Long';
export const DEFAULT_INSTRUCTOR_PROFILE_EMAIL = 'long.pham@oculide.edu.vn';
export const INSTRUCTOR_PROFILE_UPDATED_EVENT = 'oculide:instructor-profile-updated';

export interface InstructorProfileIdentity {
  name: string;
  email: string;
}

/**
 * Read the instructor identity from the same localStorage object used by ProfileView.
 * `username` is intentionally not used as a display name because it is an account ID.
 */
export function readInstructorProfileIdentity(): InstructorProfileIdentity {
  if (typeof window === 'undefined') {
    return {
      name: DEFAULT_INSTRUCTOR_PROFILE_NAME,
      email: DEFAULT_INSTRUCTOR_PROFILE_EMAIL,
    };
  }

  try {
    const stored = window.localStorage.getItem('oculide_user');
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        const user = parsed as { name?: unknown; email?: unknown };
        const name = typeof user.name === 'string' ? user.name.trim() : '';
        const email = typeof user.email === 'string' ? user.email.trim() : '';

        return {
          name: name || DEFAULT_INSTRUCTOR_PROFILE_NAME,
          email: email || DEFAULT_INSTRUCTOR_PROFILE_EMAIL,
        };
      }
    }
  } catch {
    // Use the same default identity as the Instructor Profile page.
  }

  return {
    name: DEFAULT_INSTRUCTOR_PROFILE_NAME,
    email: DEFAULT_INSTRUCTOR_PROFILE_EMAIL,
  };
}

/** Match ProfileView's initials rule: use the first letters of the last two words. */
export function getInstructorInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => Array.from(word)[0]?.toLocaleUpperCase('vi-VN') ?? '')
    .join('');

  return initials || 'GV';
}

/** Notify persistent layout components after the profile is saved in this tab. */
export function notifyInstructorProfileUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(INSTRUCTOR_PROFILE_UPDATED_EVENT));
  }
}
