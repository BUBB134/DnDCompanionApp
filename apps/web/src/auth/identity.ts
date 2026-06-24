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
        update users
        set email = $2,
            name = $3,
            updated_at = now()
        where clerk_user_id = $1
        returning id, email, name
      `,
      [clerkUserId, email, name],
    );

    if (existingIdentity.rows[0]) {
      return mapUser(existingIdentity.rows[0]);
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
