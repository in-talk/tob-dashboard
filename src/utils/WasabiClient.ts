// Browser helper for call-recording URLs. Signing happens server-side in
// /api/audio/signed-url (which checks the caller may access the call); no
// storage credentials are bundled into the client any more.

export const generateAudioUrl = async (
  audioPath: string,
  callId?: string | number | null
): Promise<string | null> => {
  if (!audioPath) return null;
  const params = new URLSearchParams({ path: audioPath });
  if (callId !== undefined && callId !== null && callId !== "") params.set("call_id", String(callId));
  try {
    const res = await fetch(`/api/audio/signed-url?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.url === "string" ? data.url : null;
  } catch (err) {
    console.error("Error fetching audio URL:", err);
    return null;
  }
};
