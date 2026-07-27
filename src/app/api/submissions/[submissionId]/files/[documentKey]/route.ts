import { auth } from "@/lib/auth";
import { downloadGDriveFile } from "@/lib/google-drive";
import { supabaseAdmin } from "@/lib/supabase";
import { Readable } from "stream";

interface PrivateDocumentRouteProps {
  params: Promise<{
    submissionId: string;
    documentKey: string;
  }>;
}

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}

function encodeContentDisposition(fileName: string) {
  const safeFileName = fileName
    .replace(/[\r\n]/g, "")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  const encodedFileName = encodeURIComponent(fileName.replace(/[\r\n]/g, ""))
    .replace(/['()*]/g, (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`
    );

  return `attachment; filename="${safeFileName || "document"}"; filename*=UTF-8''${encodedFileName}`;
}

export async function GET(
  request: Request,
  { params }: PrivateDocumentRouteProps
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return jsonError("Non autorisé.", 401);
  }

  const { submissionId, documentKey } = await params;

  const { data: submission, error } = await supabaseAdmin
    .from("submissions")
    .select("id, files, properties ( owner_id )")
    .eq("id", submissionId)
    .single();

  if (error || !submission) {
    return jsonError("Document introuvable.", 404);
  }

  const property = submission.properties as unknown as {
    owner_id: string;
  } | null;

  if (property?.owner_id !== session.user.id) {
    return jsonError("Accès interdit.", 403);
  }

  const files =
    submission.files &&
    typeof submission.files === "object" &&
    !Array.isArray(submission.files)
      ? (submission.files as Record<string, unknown>)
      : {};
  const fileId = files[documentKey];

  if (
    typeof fileId !== "string" ||
    !/^[A-Za-z0-9_-]{10,}$/.test(fileId)
  ) {
    return jsonError("Document introuvable.", 404);
  }

  try {
    const file = await downloadGDriveFile(fileId);
    const responseHeaders = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Disposition": encodeContentDisposition(file.name),
      "Content-Type": file.mimeType,
      "X-Content-Type-Options": "nosniff",
    });

    if (file.size) {
      responseHeaders.set("Content-Length", file.size);
    }

    const webStream = Readable.toWeb(file.stream) as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (downloadError) {
    console.error("Private Google Drive download failed:", downloadError);
    return jsonError("Impossible de télécharger le document.", 502);
  }
}
