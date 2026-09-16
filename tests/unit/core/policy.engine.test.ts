import { describe, it, expect, beforeEach } from 'vitest';
import { UserRole } from '../../../src/constants/roles';
import { definePolicy, PolicyRegistry } from '../../../src/core/policy/policy.registry';
import { can, cannot, authorizePolicy } from '../../../src/core/policy/policy.engine';


interface Article {
  id: string;
  authorId: string;
  status: 'DRAFT' | 'PUBLISHED';
  isArchived?: boolean;
}

describe('ABAC + RBAC Policy Engine', () => {
  beforeEach(() => {
    PolicyRegistry.clear();
  });

  describe('Master Wildcard & Role Bypass', () => {
    it('should allow SUPER_ADMIN to perform any action on any subject unconditionally', async () => {
      const superAdmin = { id: 'sa-1', role: UserRole.SUPER_ADMIN };

      expect(await can(superAdmin, 'delete', 'AnyModel')).toBe(true);
      expect(await can(superAdmin, 'destroy', 'System')).toBe(true);
      expect(await cannot(superAdmin, 'read', 'Confidential')).toBe(false);
    });

    it('should return false for unauthenticated user', async () => {
      expect(await can(null, 'read', 'Article')).toBe(false);
      expect(await can(undefined, 'read', 'Article')).toBe(false);
      expect(await can({}, 'read', 'Article')).toBe(false);
    });
  });

  describe('Attribute-Based Policies (ABAC)', () => {
    beforeEach(() => {
      definePolicy<Article>('Article', (builder) => {
        // Anyone can read published articles
        builder.can('read', 'Article').when((_user, article) => {
          return article?.status === 'PUBLISHED';
        });

        // Authors can update their own DRAFT articles
        builder.can('update', 'Article').when((user, article) => {
          return !!article && article.authorId === user.id && article.status === 'DRAFT';
        });

        // Admins can update any article
        builder.can('update', 'Article').whenRole(UserRole.ADMIN);

        // Explicit deny: Archived articles cannot be edited by anyone
        builder.cannot('update', 'Article').when((_user, article) => {
          return !!article?.isArchived;
        });
      });
    });

    it('should allow reading published articles, but deny reading drafts to non-authors', async () => {
      const user = { id: 'usr-1', role: UserRole.USER };
      const publishedArticle: Article = {
        id: 'art-1',
        authorId: 'usr-2',
        status: 'PUBLISHED',
      };
      const draftArticle: Article = {
        id: 'art-2',
        authorId: 'usr-2',
        status: 'DRAFT',
      };

      expect(await can(user, 'read', 'Article', publishedArticle)).toBe(true);
      expect(await can(user, 'read', 'Article', draftArticle)).toBe(false);
    });

    it('should allow author to update their own draft article', async () => {
      const author = { id: 'author-123', role: UserRole.USER };
      const draftArticle: Article = {
        id: 'art-10',
        authorId: 'author-123',
        status: 'DRAFT',
      };

      expect(await can(author, 'update', 'Article', draftArticle)).toBe(true);
    });

    it('should prevent author from updating their article once PUBLISHED', async () => {
      const author = { id: 'author-123', role: UserRole.USER };
      const publishedArticle: Article = {
        id: 'art-10',
        authorId: 'author-123',
        status: 'PUBLISHED',
      };

      expect(await can(author, 'update', 'Article', publishedArticle)).toBe(false);
    });

    it('should prevent non-author from updating draft article', async () => {
      const otherUser = { id: 'other-user', role: UserRole.USER };
      const draftArticle: Article = {
        id: 'art-10',
        authorId: 'author-123',
        status: 'DRAFT',
      };

      expect(await can(otherUser, 'update', 'Article', draftArticle)).toBe(false);
    });

    it('should enforce explicit deny rules (cannot) even for Admins', async () => {
      const admin = { id: 'admin-1', role: UserRole.ADMIN };
      const archivedArticle: Article = {
        id: 'art-archived',
        authorId: 'someone',
        status: 'DRAFT',
        isArchived: true,
      };

      // Inverted cannot rule triggers
      expect(await can(admin, 'update', 'Article', archivedArticle)).toBe(false);
      expect(await cannot(admin, 'update', 'Article', archivedArticle)).toBe(true);
    });
  });

  describe('RBAC Fallback when no policy matches', () => {
    it('should fall back to standard RBAC permissions if subject policy has no matching rule', async () => {
      // No policy defined for "Invoice", but user has "invoices:create" permission
      const userWithPerm = {
        id: 'acc-1',
        role: UserRole.USER,
        metadata: { permissions: ['invoices:create'] },
      };
      const userWithoutPerm = { id: 'usr-regular', role: UserRole.USER };

      expect(await can(userWithPerm, 'create', 'Invoice')).toBe(true);
      expect(await can(userWithoutPerm, 'create', 'Invoice')).toBe(false);
    });

    it('should check ADMIN users:delete permission on User subject', async () => {
      const admin = { id: 'admin-1', role: UserRole.ADMIN };
      expect(await can(admin, 'delete', 'User')).toBe(true);
    });
  });

  describe('authorizePolicy assertion helper', () => {
    it('should throw 401 ApiError when user is missing', async () => {
      await expect(authorizePolicy(null, 'read', 'User')).rejects.toThrow(
        'Authentication required',
      );
    });

    it('should throw 403 ApiError when user is unauthorized', async () => {
      const user = { id: 'usr-1', role: UserRole.USER };
      await expect(authorizePolicy(user, 'delete', 'User')).rejects.toThrow(
        'Forbidden',
      );
    });

    it('should resolve without throwing when action is permitted', async () => {
      const admin = { id: 'admin-1', role: UserRole.ADMIN };
      await expect(
        authorizePolicy(admin, 'delete', 'User'),
      ).resolves.toBeUndefined();
    });
  });
});
