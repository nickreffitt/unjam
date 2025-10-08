import { type AuthUser } from '@common/types';

/**
 * Interface for auth event emission implementations
 * Defines the contract that all auth event emitter implementations must follow
 */
export interface AuthEventEmitter {

  emitUserRequiresProfile(authUser: AuthUser): void;

  /**
   * Emits a user profile created event
   * @param authUser - The AuthUser with newly created profile
   */
  emitUserProfileCreated(authUser: AuthUser): void;

  /**
   * Emits a user profile updated event
   * @param authUser - The AuthUser with updated profile
   */
  emitUserProfileUpdated(authUser: AuthUser): void;

  /**
   * Emits a user signed in event
   * @param authUser - The AuthUser who signed in
   */
  emitUserSignedIn(authUser: AuthUser): void;

  /**
   * Emits a user signed out event
   */
  emitUserSignedOut(): void;

  /**
   * Emits an auth state changed event
   * @param authUser - The current AuthUser (with not-signed-in status if signed out)
   */
  emitAuthStateChanged(authUser: AuthUser): void;
}