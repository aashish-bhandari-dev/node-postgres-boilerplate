/**
 * Usage:
 * class UserResource extends JsonResource<User> {
 *   toArray() {
 *     return {
 *       id: this.resource.id,
 *       email: this.resource.email,
 *       name: this.resource.name,
 *     };
 *   }
 * }
 *
 * Single item:
 * UserResource.make(user) or new UserResource(user).toArray()
 *
 * Collection:
 * UserResource.collection(users)
 */
export abstract class JsonResource<T = unknown> {
  protected readonly resource: T;

  constructor(resource: T) {
    this.resource = resource;
  }

  /**
   * Transform the resource into an array/object structure.
   */
  abstract toArray(): Record<string, unknown>;

  /**
   * JSON representation of the resource.
   */
  toJSON(): Record<string, unknown> {
    return this.toArray();
  }

  /**
   * Create a transformed instance of a single item.
   */
  static make<T, R extends JsonResource<T>>(
    this: new (resource: T) => R,
    resource: T | null | undefined,
  ): Record<string, unknown> | null {
    if (resource === null || resource === undefined) return null;
    return new this(resource).toArray();
  }

  /**
   * Transform an array of items into a collection of resource objects.
   */
  static collection<T, R extends JsonResource<T>>(
    this: new (resource: T) => R,
    items: T[],
  ): Record<string, unknown>[] {
    if (!Array.isArray(items)) return [];
    return items.map((item) => new this(item).toArray());
  }
}
