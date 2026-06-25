import { withDatabaseTransaction } from "@dnd/db";
import type { AuthUser } from "@dnd/types";
import {
  normalizeLocalAuthEmail,
  normalizeLocalAuthName,
} from "@/auth/local-user";

type ClerkIdentityInput = {
  clerkUserId: string;
  email: string;
  name: string;
};

type UserRow = {
  email: string;
  id: string;
  name: string;
};

export async function resolveClerkAuthUser(
  input: ClerkIdentityInput,
): Promise<AuthUser> {
  const clerkUserId = input.clerkUserId.trim();
  const email = normalizeLocalAuthEmail(input.email);
  const name = normalizeLocalAuthName(input.name);

  if (!clerkUserId || !email || !name) {
    throw new Error("Clerk identity is missing a stable ID, email, or name.");
  }

  return withDatabaseTransaction(async (client) => {
    const existingIdentity = await client.query<UserRow>(
      `
        select id, email, name
        from users
        where clerk_user_id = $1
        for update
      `,
      [clerkUserId],
    );

    if (existingIdentity.rows[0]) {
      const linkedIdentity = existingIdentity.rows[0];
      const existingEmailOwner = await client.query<{ id: string }>(
        `
          select id
          from users
          where email = $1
            and id <> $2
          for update
        `,
        [email, linkedIdentity.id],
      );
      const nextEmail = existingEmailOwner.rows[0]
        ? linkedIdentity.email
        : email;
      const updatedIdentity = await client.query<UserRow>(
        `
          update users
          set email = $2,
              name = $3,
              updated_at = now()
          where id = $1
          returning id, email, name
        `,
        [linkedIdentity.id, nextEmail, name],
      );

      return mapUser(updatedIdentity.rows[0] ?? linkedIdentity);
    }

    const linkedUser = await client.query<UserRow>(
      `
        insert into users (email, name, clerk_user_id)
        values ($1, $2, $3)
        on conflict (email) do update
        set name = excluded.name,
            clerk_user_id = coalesce(users.clerk_user_id, excluded.clerk_user_id),
            updated_at = now()
        where users.clerk_user_id is null
           or users.clerk_user_id = excluded.clerk_user_id
        returning id, email, name
      `,
      [email, name, clerkUserId],
    );

    if (!linkedUser.rows[0]) {
      throw new Error(
        "This email is already linked to a different Clerk account.",
      );
    }

    return mapUser(linkedUser.rows[0]);
  });
}

function mapUser(row: UserRow): AuthUser {
  return {
    email: row.email,
    id: row.id,
    name: row.name,
  };
}
