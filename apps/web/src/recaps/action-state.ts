export type SessionRecapActionState = {
  error: string | null;
  success: string | null;
};

export const initialSessionRecapActionState: SessionRecapActionState = {
  error: null,
  success: null,
};
