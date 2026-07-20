import { readServerEnv, type EnvSource } from "@dnd/env";
import type { SessionRecapFormat } from "@dnd/types";
import {
  createLocalSessionRecap,
  mergeUnresolvedHooks,
  requestOpenAIRecap,
  selectSessionRecapSources,
} from "@/recaps/generation";
import { retrieveCampaignMemoryForUser } from "@/memory/repository";
import {
  getSessionForUserById,
  updateSessionRecapForUser,
} from "@/sessions/repository";

export async function generateSessionRecapForUser(
  userId: string,
  campaignId: string,
  sessionId: string,
  recapFormat: SessionRecapFormat,
  options: {
    env?: EnvSource;
    fetchImpl?: typeof fetch;
  } = {},
) {
  const session = await getSessionForUserById(userId, campaignId, sessionId);

  if (!session) {
    throw new Error("You do not have access to generate a recap for this session.");
  }

  if (!session.notes.trim()) {
    throw new Error("Add session notes before generating a recap.");
  }

  const memory = await retrieveCampaignMemoryForUser(
    userId,
    campaignId,
    createRecapRetrievalQuery(session),
    {
      limit: 20,
      sourceTypes: [
        "character",
        "entity",
        "session-hook",
        "session-notes",
        "session-recap",
      ],
    },
  );

  if (!memory) {
    throw new Error("Campaign access is required before generating a recap.");
  }

  const retrievedDocumentIds = new Set(
    memory.results.map((result) => result.id),
  );
  const sourceDocuments = memory.documents.filter(
    (document) =>
      (document.sourceType === "session-notes" &&
        document.sourceId === session.id) ||
      retrievedDocumentIds.has(document.id),
  );
  const sources = selectSessionRecapSources(
    session,
    sourceDocuments,
    recapFormat,
  );
  const env = readServerEnv(options.env ?? process.env);
  const generated =
    env.AI_GROUNDING_MODE === "retrieval"
      ? await generateRetrievalRecap(
          env,
          session,
          sources,
          recapFormat,
          options.fetchImpl,
        )
      : env.AI_GROUNDING_MODE === "local"
        ? createLocalSessionRecap(session, recapFormat)
        : null;

  if (!generated) {
    throw new Error(
      "Recap generation is disabled. Set AI_GROUNDING_MODE to local or retrieval.",
    );
  }

  const savedSession = await updateSessionRecapForUser(
    userId,
    campaignId,
    sessionId,
    generated.recap,
    generated.recapFormat,
    generated.grounding,
    mergeUnresolvedHooks(session.unresolvedHooks, generated.unresolvedHooks),
    session.updatedAt,
  );

  if (!savedSession) {
    throw new Error("The generated recap could not be reloaded.");
  }

  return savedSession;
}

async function generateRetrievalRecap(
  env: ReturnType<typeof readServerEnv>,
  session: NonNullable<Awaited<ReturnType<typeof getSessionForUserById>>>,
  sources: ReturnType<typeof selectSessionRecapSources>,
  recapFormat: SessionRecapFormat,
  fetchImpl?: typeof fetch,
) {
  if (!env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required when AI_GROUNDING_MODE is retrieval.",
    );
  }

  return requestOpenAIRecap(session, sources, {
    apiKey: env.OPENAI_API_KEY,
    fetchImpl,
    model: env.OPENAI_MODEL ?? "gpt-5.5",
    recapFormat,
  });
}

function createRecapRetrievalQuery(
  session: NonNullable<Awaited<ReturnType<typeof getSessionForUserById>>>,
) {
  return [
    session.title,
    session.notes.slice(0, 1200),
    ...session.unresolvedHooks,
    ...session.taggedEntities.map((entity) => entity.name),
    ...session.notesDocument.blocks.flatMap((block) =>
      block.references.map((reference) => reference.label),
    ),
  ]
    .filter(Boolean)
    .join(" ");
}
