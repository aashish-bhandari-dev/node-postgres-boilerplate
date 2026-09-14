import { z } from 'zod';

export const oauthProviderEnum = z.enum(['google', 'facebook', 'apple']);

export const oauthLoginSchema = z.object({
  params: z.object({
    provider: oauthProviderEnum,
  }),
  body: z
    .object({
      token: z.string().optional(),
      idToken: z.string().optional(),
      accessToken: z.string().optional(),
      code: z.string().optional(),
      redirectUri: z.string().url().optional(),
      user: z
        .object({
          name: z
            .object({
              firstName: z.string().optional(),
              lastName: z.string().optional(),
            })
            .optional(),
          email: z.string().email().optional(),
        })
        .optional(),
    })
    .refine(
      (data) => !!(data.token || data.idToken || data.accessToken || data.code),
      {
        message: 'Must provide an idToken, accessToken, token, or authorization code.',
      },
    ),
});

export type OAuthLoginParams = z.infer<typeof oauthLoginSchema>['params'];
export type OAuthLoginBody = z.infer<typeof oauthLoginSchema>['body'];
